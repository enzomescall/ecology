/**
 * GAME API ROUTES
 * HTTP endpoints for game management
 */

import { Router } from 'express';
import { z } from 'zod';
import * as gameService from '../services/gameService.js';

const router = Router();

// --- Validation Schemas ---

const coordSchema = z.object({ x: z.number(), y: z.number() });

const createGameSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  gameName: z.string().optional(),
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

// --- Routes ---

// POST /games - Create game
router.post('/', (req, res) => {
  try {
    const { userId, email, name, gameName } = createGameSchema.parse(req.body);
    const game = gameService.createGame(userId, email, name, gameName);
    res.status(201).json(game);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /games/:id/join - Join game
router.post('/:id/join', (req, res) => {
  try {
    const { userId, email, name } = joinGameSchema.parse(req.body);
    const game = gameService.joinGame(req.params.id, userId, email, name);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /games/:id/start - Start game
router.post('/:id/start', (req, res) => {
  try {
    const { userId } = userIdSchema.parse(req.body);
    const game = gameService.startGame(req.params.id, userId);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /games/user-games - List games for a user
router.get('/user-games', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    res.json(gameService.getUserGames(userId));
  } catch (err) {
    handleError(res, err);
  }
});

// GET /games/:id - Get game state
router.get('/:id', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    res.json(gameService.getGameState(req.params.id, userId));
  } catch (err) {
    handleError(res, err);
  }
});

// POST /games/:id/move - Submit move
router.post('/:id/move', (req, res) => {
  try {
    const { userId, cardId, coord, swap } = submitMoveSchema.parse(req.body);
    const game = gameService.submitMove(req.params.id, userId, { cardId, coord, swap });
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /games/:id/leave - Leave game
router.post('/:id/leave', (req, res) => {
  try {
    const { userId } = userIdSchema.parse(req.body);
    const game = gameService.leaveGame(req.params.id, userId);
    res.json(game);
  } catch (err) {
    handleError(res, err);
  }
});

// --- Debug (development only) ---

router.get('/debug/all-data', (_req, res) => {
  try {
    res.json(gameService.debugGetAllGames());
  } catch (err) {
    handleError(res, err);
  }
});

// --- Error Handling ---

function handleError(res: any, err: unknown) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid request', issues: err.issues });
  }
  res.status(400).json({ error: (err as Error).message });
}

export default router;
