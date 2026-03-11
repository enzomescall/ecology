import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { getGameState, submitMove, leaveGame, startGame } from '../services/gameApi';
import type { Card, Coord, PlacedCard, GameStateResponse } from '../services/gameApi';
import { CardTile } from './CardTile';
import { EcosystemGrid } from './EcosystemGrid';
import type { User } from '../App';

interface GameBoardProps {
  gameId: string;
  user: User;
  onBack: () => void;
  onGameEnd: () => void;
}

// --- Helpers ---

function validPlacements(ecosystem: PlacedCard[]): Coord[] {
  if (ecosystem.length === 0) return [{ x: 0, y: 0 }];
  const occupied = new Set(ecosystem.map(p => `${p.coord.x},${p.coord.y}`));
  const adjacent = new Set<string>();
  for (const p of ecosystem) {
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const key = `${p.coord.x + dx},${p.coord.y + dy}`;
      if (!occupied.has(key)) adjacent.add(key);
    }
  }
  return [...adjacent].map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
}

function coordEq(a: Coord, b: Coord) { return a.x === b.x && a.y === b.y; }

// --- Component ---

export function GameBoard({ gameId, user, onBack, onGameEnd }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCell, setSelectedCell] = useState<Coord | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<Coord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingGame, setIsLeavingGame] = useState(false);

  // Polling
  const fetchState = useCallback(async () => {
    try {
      const state = await getGameState(gameId, user.userId);
      setGameState(state);
      if (state.game.status === 'finished') onGameEnd();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    }
  }, [gameId, user.userId, onGameEnd]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 2000);
    return () => clearInterval(id);
  }, [fetchState]);

  // Actions
  const handleSubmitMove = async (skipSwap = false) => {
    if (!selectedCard || !selectedCell || !gameState) return;
    setIsSubmitting(true);
    try {
      const swap = swapMode && swapSelection.length === 2 && !skipSwap
        ? { a: swapSelection[0], b: swapSelection[1] } : null;
      await submitMove(gameId, user.userId, {
        cardId: selectedCard.id,
        coord: selectedCell,
        swap,
      });
      setSelectedCard(null);
      setSelectedCell(null);
      setSwapMode(false);
      setSwapSelection([]);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellClick = (coord: Coord) => {
    if (!selectedCard) return;
    setSelectedCell(coordEq(coord, selectedCell ?? { x: -999, y: -999 }) ? null : coord);
  };

  const handlePlaceCard = () => {
    if (selectedCard?.type === 'rabbit') {
      setSwapMode(true);
    } else {
      handleSubmitMove();
    }
  };

  const handleSwapSelect = (coord: Coord) => {
    setSwapSelection(prev => {
      const exists = prev.some(s => coordEq(s, coord));
      if (exists) return prev.filter(s => !coordEq(s, coord));
      if (prev.length >= 2) return prev;
      return [...prev, coord];
    });
  };

  const handleLeaveGame = async () => {
    try {
      setIsLeavingGame(true);
      await leaveGame(gameId, user.userId);
      setShowLeaveModal(false);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave game');
      setIsLeavingGame(false);
    }
  };

  // Loading / error states
  if (!gameState) {
    return (
      <div className="page-container flex-center">
        <p>{error || 'Loading game...'}</p>
      </div>
    );
  }

  const { game, hand, ecosystem, opponentEcosystems, hasSubmitted, waitingFor } = gameState;
  const isHost = game.players[0]?.userId === user.userId;

  // --- Lobby View ---
  if (game.status === 'lobby') {
    const handleStart = async () => {
      setIsSubmitting(true);
      try {
        await startGame(gameId, user.userId);
        await fetchState();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start game');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div style={{ minHeight: '100vh' }}>
        <header className="page-header">
          <div className="page-header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={onBack} className="button-icon button-icon-sm"
                style={{ color: 'var(--color-forest-600)' }}>
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ margin: 0 }}>{game.name}</h3>
            </div>
            <span className="label-badge">Lobby</span>
          </div>
        </header>
        <main className="page-content" style={{ textAlign: 'center' }}>
          <h3 className="mb-4">Players ({game.players.length})</h3>
          <div className="space-stack-sm mb-6">
            {game.players.map(p => (
              <div key={p.userId} style={{
                padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '0.5rem',
                  backgroundColor: p.userId === user.userId ? 'var(--color-forest-600)' : 'var(--color-sky-500)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 'bold',
                }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span>{p.name}{p.userId === user.userId ? ' (you)' : ''}</span>
                {p.userId === game.players[0]?.userId && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>Host</span>
                )}
              </div>
            ))}
          </div>
          {error && (
            <p className="text-sm mb-4" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}
          {isHost ? (
            <button
              className="button-primary"
              onClick={handleStart}
              disabled={game.players.length < 2 || isSubmitting}
              style={{ opacity: game.players.length < 2 ? 0.5 : 1 }}
            >
              {isSubmitting ? 'Starting...' : game.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
            </button>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Waiting for host to start the game...</p>
          )}
        </main>
      </div>
    );
  }

  const canPlace = selectedCard && selectedCell && !hasSubmitted && !swapMode;
  const canSwap = swapMode && swapSelection.length === 2;
  const placements = selectedCard && !hasSubmitted ? validPlacements(ecosystem) : undefined;

  // Status text
  const statusText = () => {
    if (hasSubmitted) return `Waiting for: ${waitingFor.join(', ') || '...'}`;
    if (swapMode) return 'Select two cards to swap (optional)';
    if (selectedCard && !selectedCell) return 'Place your card on the grid';
    if (!selectedCard) return 'Select a card from your hand';
    return 'Confirm your placement';
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* Header */}
      <header className="page-header">
        <div className="page-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} className="button-icon button-icon-sm"
              style={{ color: 'var(--color-forest-600)' }}>
              <ArrowLeft size={20} />
            </button>
            <button onClick={() => setShowLeaveModal(true)} className="button-icon button-icon-sm"
              style={{ color: 'var(--color-error)' }} title="Leave Game">
              <LogOut size={20} />
            </button>
            <h3 style={{ margin: 0 }}>{game.name}</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="label-badge">Round {game.round}/2</span>
            <span className="label-badge">Turn {game.turn}/10</span>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* Status */}
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
          {statusText()}
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4" style={{
            padding: '0.75rem', borderRadius: 'var(--radius-lg)',
            backgroundColor: '#fef2f2', color: 'var(--color-error)',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Hand */}
        {!hasSubmitted && hand.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Your cards
            </h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
              className="no-scrollbar">
              {hand.map(card => (
                <CardTile
                  key={card.id}
                  type={card.type}
                  size="lg"
                  selected={selectedCard?.id === card.id}
                  onClick={() => {
                    if (swapMode) return;
                    setSelectedCard(selectedCard?.id === card.id ? null : card);
                    setSelectedCell(null);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Player Ecosystem */}
        <div className="card mb-6" style={{ padding: '1rem', textAlign: 'center' }}>
          <h3 className="mb-2" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Your Ecosystem
          </h3>
          <EcosystemGrid
            ecosystem={ecosystem}
            validPlacements={placements}
            onCellClick={handleCellClick}
            selectedCell={selectedCell}
            size="md"
            swapMode={swapMode}
            swapSelection={swapSelection}
            onSwapSelect={handleSwapSelect}
          />
        </div>

        {/* Action Buttons */}
        {!hasSubmitted && (
          <div className="mb-6" style={{ display: 'flex', gap: 8 }}>
            {!swapMode && (
              <button
                className="button-primary"
                disabled={!canPlace || isSubmitting}
                onClick={handlePlaceCard}
                style={{ opacity: canPlace ? 1 : 0.5 }}
              >
                {isSubmitting ? 'Placing...' : 'Place Card'}
              </button>
            )}
            {swapMode && (
              <>
                <button
                  className="button-primary"
                  disabled={!canSwap || isSubmitting}
                  onClick={() => handleSubmitMove(false)}
                  style={{ opacity: canSwap ? 1 : 0.5, flex: 1 }}
                >
                  Place & Swap
                </button>
                <button
                  className="button-secondary"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitMove(true)}
                  style={{ flex: 1 }}
                >
                  Skip Swap
                </button>
              </>
            )}
          </div>
        )}

        {/* Opponent Ecosystems */}
        {Object.keys(opponentEcosystems).length > 0 && (
          <div>
            <h3 className="mb-3" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Opponents
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(opponentEcosystems).map(([id, eco]) => {
                const player = game.players.find(p => p.userId === id);
                return (
                  <div key={id} className="card" style={{ padding: '0.75rem' }}>
                    <p className="text-sm mb-2" style={{
                      fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, marginBottom: 6,
                    }}>
                      {player?.name ?? id}
                    </p>
                    <EcosystemGrid ecosystem={eco} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(26,46,26,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={() => !isLeavingGame && setShowLeaveModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)', borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '1.5rem',
              maxWidth: '28rem', width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Leave Game?
            </h2>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              You are about to leave an active game. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="button-secondary" disabled={isLeavingGame}
                onClick={() => setShowLeaveModal(false)} style={{ width: 'auto' }}>
                Cancel
              </button>
              <button className="button-primary" disabled={isLeavingGame}
                onClick={handleLeaveGame}
                style={{ width: 'auto', backgroundColor: 'var(--color-error)' }}>
                {isLeavingGame ? 'Leaving...' : 'Leave Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
