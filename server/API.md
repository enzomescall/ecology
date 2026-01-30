# Game API Documentation

Turn-based, asynchronous game backend with layered architecture.

## Architecture

```
HTTP Routes (games.ts) - Input validation & error handling
    ↓
Game Services (gameService.ts) - Business logic & state transitions
    ↓
Data Store (gameStore.ts) - In-memory Maps (designed for SQL migration)
```

## Base URL
```
http://localhost:4000/api/game
```

## Endpoints

### 1. Create Game
Creates a new game with the requesting user as host.

```http
POST /api/game/games
Content-Type: application/json

Request:
{
  "userId": "user-123",
  "email": "alice@example.com",
  "name": "Alice"
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "hostUserId": "user-123",
  "name": "Game 550e8400",
  "status": "lobby",
  "players": [...],
  "currentPlayerIndex": 0,
  "turnNumber": 0,
  "createdAt": "2026-01-28T10:00:00.000Z",
  "moves": []
}
```

### 2. Join Game
Adds a player to a game (only in lobby status).

```http
POST /api/game/games/{gameId}/join
Content-Type: application/json

Request:
{
  "userId": "user-456",
  "email": "bob@example.com",
  "name": "Bob"
}

Response (200): Updated Game object with new player in players array

Error (400):
{
  "error": "Cannot join: game is in 'active' status"
}
```

### 3. Start Game
Transitions game from lobby to active (host only, requires ≥2 players).

```http
POST /api/game/games/{gameId}/start
Content-Type: application/json

Request:
{
  "userId": "user-123"
}

Response (200): Updated Game object with status: "active", turnNumber: 1, startedAt timestamp
```

### 4. Get Game State
Fetches current game state with turn indicator.

```http
GET /api/game/games/{gameId}?userId={userId}

Response (200):
{
  "game": { ...full Game object... },
  "isCurrentPlayer": true
}
```

### 5. Submit Move
Player submits their move. Automatically advances turn to next player.

```http
POST /api/game/games/{gameId}/move
Content-Type: application/json

Request:
{
  "userId": "user-123",
  "moveData": { "action": "place_tile", "x": 2, "y": 3 }
}

Response (200): Updated Game object with new move recorded
```

### 6. Finish Game
Host ends the game.

```http
POST /api/game/games/{gameId}/finish
Content-Type: application/json

Request:
{
  "userId": "user-123"
}

Response (200): Updated Game object with status: "finished"
```

## Error Responses

All errors return:
```json
{
  "error": "Human-readable message",
  "issues": [...]  // For validation errors only
}
```

Status codes: 201 (created), 200 (success), 400 (error), 500 (server error)

## Game State Flow

```
CREATE → LOBBY → START → ACTIVE → FINISH → FINISHED
         (join)        (moves)   (host only)
```

## Turn Progression

With N players, turn advances in a cycle:
- Player 0 moves → Player 1's turn
- Player 1 moves → Player 2's turn
- ...
- Player N-1 moves → Player 0's turn, turnNumber increments

## Data Store

In-memory Map-based (gameStore.ts) designed for SQL migration. All CRUD operations abstracted; replace implementation without changing service layer or routes.

Pre-defined schema in schema.sql.

## Development

```bash
npm run dev          # Start on port 4000
npm run build        # TypeScript compilation
```

Example:
```bash
# Create
GAME_ID=$(curl -X POST http://localhost:4000/api/game/games \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","email":"a@test.com","name":"Alice"}' | jq -r '.id')

# Join
curl -X POST http://localhost:4000/api/game/games/$GAME_ID/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"u2","email":"b@test.com","name":"Bob"}'

# Start
curl -X POST http://localhost:4000/api/game/games/$GAME_ID/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1"}'

# Move
curl -X POST http://localhost:4000/api/game/games/$GAME_ID/move \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","moveData":{"x":1}}'
```
