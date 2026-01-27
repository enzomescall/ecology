# Game API Documentation

Turn-based, asynchronous game backend with in-memory state management.

## Architecture

```
HTTP Routes (games.ts)
    ↓
Game Services (gameService.ts) - Business Logic
    ↓
Data Store (gameStore.ts) - In-Memory Maps (swappable with SQL)
```

## API Endpoints

### Create Game
```http
POST /api/game
Content-Type: application/json

{
  "userId": "string",
  "email": "string@email.com",
  "name": "string"
}

Response (201):
{
  "id": "uuid",
  "hostUserId": "string",
  "name": "Game xxx...",
  "status": "lobby",
  "players": [...],
  "currentPlayerIndex": 0,
  "turnNumber": 0,
  "createdAt": "ISO8601",
  "moves": []
}
```

### Join Game
```http
POST /api/game/:gameId/join
Content-Type: application/json

{
  "userId": "string",
  "email": "string@email.com",
  "name": "string"
}

Response (200): Full Game object
Errors (400):
  - "Game not found"
  - "Cannot join: game is in 'active/finished' status"
  - "User already in this game"
```

### Start Game
```http
POST /api/game/:gameId/start
Content-Type: application/json

{
  "userId": "string"  // Must be host
}

Response (200): Full Game object with status: "active", turnNumber: 1
Errors (400):
  - "Game not found"
  - "Only host can start game"
  - "Game already started"
  - "Need at least 2 players"
```

### Get Game State
```http
GET /api/game/:gameId?userId=string

Response (200):
{
  "game": { ...Full game object... },
  "isCurrentPlayer": boolean
}

Errors (400):
  - "Game not found"
  - "User not in this game"
```

### Submit Move
```http
POST /api/game/:gameId/move
Content-Type: application/json

{
  "userId": "string",
  "moveData": { "cell": 0, "action": "place" }
}

Response (200): Full Game object with:
  - moves: [..., {new move recorded}]
  - currentPlayerIndex: incremented to next player
  - turnNumber: incremented if all players have moved

Errors (400):
  - "Game not found"
  - "Game not active"
  - "Not your turn. Current: PlayerName"
```

### Finish Game
```http
POST /api/game/:gameId/finish
Content-Type: application/json

{
  "userId": "string"  // Must be host
}

Response (200): Full Game object with status: "finished", finishedAt: ISO8601
Errors (400):
  - "Game not found"
  - "Only host can finish game"
```

## Game State Transitions

```
[Create Game] → lobby
                 ↓
            [Join Game] (can add players while in lobby)
                 ↓
            [Start Game] → active (min 2 players)
                 ↓
            [Submit Move] (cycles through players)
                 ↓
            [Finish Game] → finished
```

## Turn Progression

- Player 0 submits move → currentPlayerIndex becomes 1
- Player 1 submits move → currentPlayerIndex becomes 0, turnNumber increments
- Next cycle starts

## Data Store

In-memory Map-based storage designed for future SQL migration:
- `games`: Map<gameId, Game>
- `moves`: Map<moveId, GameMove>

All functions match future database interface patterns for seamless migration.

## Testing

```bash
# Start dev server
npm run dev

# In another terminal, create game
curl -X POST http://localhost:4000/api/game \
  -H "Content-Type: application/json" \
  -d '{"userId":"p1","email":"a@test.com","name":"Alice"}'
```

## Error Handling

- **400**: Validation error (ZodError) or game logic error
- **500**: Unexpected server error
- All errors return `{ error: "message" }` or `{ error: "message", issues: [...] }`
