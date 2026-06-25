import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import * as gameService from '../services/gameService.js';
import * as aiService from '../services/aiService.js';
import * as inviteStore from '../data/inviteStore.js';
import { sendInviteEmail } from '../services/emailService.js';
import { getUserAnalytics } from '../services/analyticsService.js';

const router = Router();

const coordSchema = z.object({ x: z.number(), y: z.number() });

const createGameSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  gameName: z.string().optional(),
  inviteEmails: z.array(z.string().email()).optional(),
});

const joinGameSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

const submitMoveSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  coord: coordSchema,
  swap: z.object({ a: coordSchema, b: coordSchema }).nullable(),
});

const inviteMoreSchema = z.object({
  userId: z.string().min(1),
  emails: z.array(z.string().email()).min(1),
});

const removeInviteOrPlayerSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
});

const nudgePlayersSchema = z.object({
  userId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).min(1),
});

const addBotSchema = z.object({
  userId: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard', 'impossible']),
});

const removeBotSchema = z.object({
  userId: z.string().min(1),
  botUserId: z.string().min(1),
});

function requireLobbyHost(gameId: string, userId: string) {
  const game = gameService.getGame(gameId);
  if (game.status !== 'lobby') throw new Error('Invites can only be managed before the game starts');
  if (game.hostUserId !== userId) throw new Error('Only host can manage invites');
  return game;
}

router.post('/', async (req, res) => {
  try {
    const { userId, email, name, gameName, inviteEmails } = createGameSchema.parse(req.body);
    const game = gameService.createGame(userId, email, name, gameName);

    if (inviteEmails?.length) {
      for (const invitedEmail of inviteEmails) {
        inviteStore.createInvite(game.id, game.name, invitedEmail, name);
        sendInviteEmail(invitedEmail, name, game.name).catch(() => {});
      }
    }

    res.status(201).json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/join', (req, res) => {
  try {
    const { userId, email, name } = joinGameSchema.parse(req.body);
    const game = gameService.joinGame(req.params.id, userId, email, name);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/bots', (req, res) => {
  try {
    const { userId, difficulty } = addBotSchema.parse(req.body);
    const game = aiService.addAiPlayer(req.params.id, userId, difficulty);
    res.status(201).json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/bots/remove', (req, res) => {
  try {
    const { userId, botUserId } = removeBotSchema.parse(req.body);
    const game = aiService.removeAiPlayer(req.params.id, userId, botUserId);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/start', (req, res) => {
  try {
    const { userId } = userIdSchema.parse(req.body);
    const game = gameService.startGame(req.params.id, userId);
    res.json(game);
    // Drive any bots that should move on turn 1 (async; don't block the response).
    void aiService.driveAiTurns(game.id);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/nudge', (req, res) => {
  try {
    const { userId, playerIds } = nudgePlayersSchema.parse(req.body);
    const nudged = gameService.nudgePlayers(req.params.id, userId, playerIds);
    res.json({ success: true, nudged });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/invites', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    const game = requireLobbyHost(req.params.id, userId);
    res.json({
      pending: inviteStore.getInvitesForGame(game.id),
      accepted: game.players,
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/invites', async (req, res) => {
  try {
    const { userId, emails } = inviteMoreSchema.parse(req.body);
    const game = requireLobbyHost(req.params.id, userId);
    const hostName = game.players.find(p => p.userId === game.hostUserId)?.name ?? 'Host';
    const existingAccepted = new Set(game.players.map(p => p.email.trim().toLowerCase()));
    const existingPending = new Set(inviteStore.getInvitesForGame(game.id).map(i => i.invitedEmail.trim().toLowerCase()));
    const created = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (existingAccepted.has(email) || existingPending.has(email)) continue;
      const invite = inviteStore.createInvite(game.id, game.name, email, hostName);
      created.push(invite);
      existingPending.add(email);
      sendInviteEmail(email, hostName, game.name).catch(() => {});
    }

    res.status(201).json({
      created,
      pending: inviteStore.getInvitesForGame(game.id),
      accepted: game.players,
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/invites/remove', (req, res) => {
  try {
    const { userId, email } = removeInviteOrPlayerSchema.parse(req.body);
    const game = requireLobbyHost(req.params.id, userId);
    const removedPending = inviteStore.deleteInviteForGameByEmail(game.id, email);
    const updatedGame = removedPending ? game : gameService.removeLobbyPlayer(game.id, userId, email);

    res.json({
      success: true,
      pending: inviteStore.getInvitesForGame(game.id),
      accepted: updatedGame.players,
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    res.json(getUserAnalytics(userId));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/user-games', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    res.json(gameService.getUserGames(userId));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/invites', (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: 'email query param required' });
    res.json(inviteStore.getInvitesForEmail(email));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    res.json(gameService.getGameState(req.params.id, userId));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/move', (req, res) => {
  try {
    const { userId, cardId, coord, swap } = submitMoveSchema.parse(req.body);
    const game = gameService.submitMove(req.params.id, userId, { cardId, coord, swap });
    res.json(game);
    // After a human submits, let any pending bots take their turns (async).
    void aiService.driveAiTurns(req.params.id);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/leave', (req, res) => {
  try {
    const { userId } = userIdSchema.parse(req.body);
    const game = gameService.leaveGame(req.params.id, userId);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invites/:id/accept', (req, res) => {
  try {
    const { userId, email, name } = joinGameSchema.parse(req.body);
    const invite = inviteStore.getInvite(req.params.id);
    if (!invite) return res.status(400).json({ error: 'Invite not found' });

    const game = gameService.joinGame(invite.gameId, userId, email, name);
    inviteStore.deleteInvite(invite.id);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invites/:id/decline', (req, res) => {
  try {
    const invite = inviteStore.getInvite(req.params.id);
    if (!invite) return res.status(400).json({ error: 'Invite not found' });
    inviteStore.deleteInvite(invite.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

function handleError(res: Response, err: unknown) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid request', issues: err.issues });
  }
  res.status(400).json({ error: (err as Error).message });
}

export default router;
