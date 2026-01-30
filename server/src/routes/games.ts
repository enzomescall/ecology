/**
 * GAME API ROUTES
 * HTTP endpoints for game management
 */

import { Router } from 'express';
import { z } from 'zod';
import * as gameService from '../services/gameService.js';
import type {
  CreateGameRequest,
  JoinGameRequest,
  StartGameRequest,
  SubmitMoveRequest,
} from '../types/game.js';

const router = Router();

// Validation schemas
const createGameSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  gameName: z.string().optional(),
});

const joinGameSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
});

const startGameSchema = z.object({
  userId: z.string().min(1),
});

const submitMoveSchema = z.object({
  userId: z.string().min(1),
  moveData: z.record(z.string(), z.unknown()),
});

// POST /games - Create game
router.post('/', (req, res) => {
  try {
    const validated = createGameSchema.parse(req.body);
    const game = gameService.createGame(
      validated.userId,
      validated.email,
      validated.name,
      validated.gameName
    );
    res.status(201).json(game);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', issues: err.issues });
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /games/:id/join - Join game
router.post('/:id/join', (req, res) => {
  try {
    const validated = joinGameSchema.parse(req.body);
    const game = gameService.joinGame(
      req.params.id,
      validated.userId,
      validated.email,
      validated.name
    );
    res.json(game);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', issues: err.issues });
    }
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /games/:id/start - Start game
router.post('/:id/start', (req, res) => {
  try {
    const validated = startGameSchema.parse(req.body);
    const game = gameService.startGame(req.params.id, validated.userId);
    res.json(game);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', issues: err.issues });
    }
    res.status(400).json({ error: (err as Error).message });
  }
});

// GET /user-games - List games for a user
router.get('/user-games', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId query param required' });
    }

    const games = gameService.getUserGames(userId);
    res.json(games);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// GET /games/:id - Get game state
router.get('/:id', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId query param required' });
    }

    const { game, isCurrentPlayer } = gameService.getGameState(req.params.id, userId);
    res.json({ game, isCurrentPlayer });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /games/:id/move - Submit move
router.post('/:id/move', (req, res) => {
  try {
    const validated = submitMoveSchema.parse(req.body);
    const game = gameService.submitMove(
      req.params.id,
      validated.userId,
      validated.moveData
    );
    res.json(game);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', issues: err.issues });
    }
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /games/:id/finish - End game
router.post('/:id/finish', (req, res) => {
  try {
    const validated = z.object({ userId: z.string().min(1) }).parse(req.body);
    const game = gameService.finishGame(req.params.id, validated.userId);
    res.json(game);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', issues: err.issues });
    }
    res.status(400).json({ error: (err as Error).message });
  }
});

// DEBUG: POST /games/:id/debug/activate - Force game to active (development only)
router.post('/:id/debug/activate', (req, res) => {
  try {
    const game = gameService.debugActivateGame(req.params.id);
    res.json(game);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// DEBUG: GET /debug/data - View all games in memory (development only)
router.get('/debug/all-data', (req, res) => {
  try {
    const allGames = gameService.debugGetAllGames();
    res.json(allGames);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
