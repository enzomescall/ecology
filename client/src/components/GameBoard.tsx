import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut, Mail, Plus, X } from 'lucide-react';
import { getGameState, submitMove, leaveGame, startGame, getGameInvites, inviteMorePlayers, removeLobbyInviteOrPlayer, nudgePlayers, addBot, removeBot } from '../services/gameApi';
import type { BotDifficulty } from '../services/gameApi';
import type { Card, Coord, PlacedCard, GameStateResponse, CardType, LobbyInviteState } from '../services/gameApi';
import { CardTile } from './CardTile';
import { EcosystemGrid } from './EcosystemGrid';
import { HowToPlayModal, HelpButton } from './HowToPlayModal';
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

const SCORING_HINTS: Record<CardType, string> = {
  stream: 'Longest connected stream vs opponents (8/5 pts)',
  meadow: 'Connected meadow groups (2→3, 3→6, 4→10, 5+→15)',
  wolf: 'Most wolves vs opponents (12/8/4 pts)',
  fox: '3 pts per fox not adjacent to bear or wolf',
  bear: '2 pts per adjacent trout or bee',
  trout: '2 pts per adjacent stream or dragonfly',
  dragonfly: 'Score = size of each adjacent stream group',
  bee: '3 pts per adjacent meadow group',
  eagle: '2 pts per rabbit/trout within 2 straight-line spaces',
  deer: '2 pts per row + 2 pts per column with deer',
  rabbit: 'Allows swapping two adjacent cards after placement',
};

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
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showScoringHint, setShowScoringHint] = useState(false);
  const [pendingPlacedCard, setPendingPlacedCard] = useState<PlacedCard | null>(null);
  const [lobbyInvites, setLobbyInvites] = useState<LobbyInviteState | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [inviteInputs, setInviteInputs] = useState<string[]>(['']);
  const [isManagingInvites, setIsManagingInvites] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [selectedNudgePlayerIds, setSelectedNudgePlayerIds] = useState<string[]>([]);
  const [isNudgingPlayers, setIsNudgingPlayers] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

  const isLobbyHost = gameState?.game.status === 'lobby' && gameState.game.players[0]?.userId === user.userId;

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

  const fetchLobbyInvites = useCallback(async () => {
    if (!isLobbyHost) return;
    try {
      const state = await getGameInvites(gameId, user.userId);
      setLobbyInvites(state);
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to load invites');
    }
  }, [gameId, user.userId, isLobbyHost]);

  useEffect(() => {
    if (!isLobbyHost) {
      setLobbyInvites(null);
      return;
    }
    fetchLobbyInvites();
    const id = setInterval(fetchLobbyInvites, 5000);
    return () => clearInterval(id);
  }, [fetchLobbyInvites, isLobbyHost]);

  // Clear pending placed card once server state confirms it
  useEffect(() => {
    if (pendingPlacedCard && gameState) {
      const exists = gameState.ecosystem.some(
        p => p.coord.x === pendingPlacedCard.coord.x && p.coord.y === pendingPlacedCard.coord.y
      );
      if (exists) setPendingPlacedCard(null);
    }
  }, [gameState, pendingPlacedCard]);

  // Actions
  const handleSubmitMove = async (skipSwap = false) => {
    if (!selectedCard || !selectedCell || !gameState) return;
    setIsSubmitting(true);
    // Track the card we're placing for immediate preview
    setPendingPlacedCard({ card: selectedCard, coord: selectedCell });
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
      setShowScoringHint(false);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
      setPendingPlacedCard(null);
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

  const addInviteField = () => setInviteInputs(prev => [...prev, '']);

  const updateInviteInput = (index: number, value: string) => {
    setInviteInputs(prev => prev.map((email, i) => i === index ? value : email));
  };

  const removeInviteInput = (index: number) => {
    setInviteInputs(prev => prev.length === 1 ? [''] : prev.filter((_, i) => i !== index));
  };

  const handleSendInvites = async () => {
    const emails = Array.from(new Set(inviteInputs.map(email => email.trim().toLowerCase()).filter(Boolean)));
    if (emails.length === 0) {
      setInviteMessage('Add at least one email to invite.');
      return;
    }

    setIsManagingInvites(true);
    setInviteMessage(null);
    try {
      const state = await inviteMorePlayers(gameId, user.userId, emails);
      setLobbyInvites(state);
      setInviteInputs(['']);
      setInviteMessage(state.created?.length ? `Sent ${state.created.length} invite${state.created.length === 1 ? '' : 's'}.` : 'Everyone entered was already in this lobby.');
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setIsManagingInvites(false);
    }
  };

  const handleRemoveInviteOrPlayer = async (email: string) => {
    setIsManagingInvites(true);
    setInviteMessage(null);
    try {
      const state = await removeLobbyInviteOrPlayer(gameId, user.userId, email);
      setLobbyInvites(state);
      await fetchState();
      setInviteMessage(`Removed ${email} from this lobby.`);
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to remove email');
    } finally {
      setIsManagingInvites(false);
    }
  };

  const handleAddBot = async (difficulty: BotDifficulty) => {
    setIsManagingInvites(true);
    setInviteMessage(null);
    try {
      await addBot(gameId, user.userId, difficulty);
      await fetchState();
      setInviteMessage(`Added a ${difficulty} bot.`);
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to add bot');
    } finally {
      setIsManagingInvites(false);
    }
  };

  const handleRemoveBot = async (botUserId: string) => {
    setIsManagingInvites(true);
    setInviteMessage(null);
    try {
      await removeBot(gameId, user.userId, botUserId);
      await fetchState();
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to remove bot');
    } finally {
      setIsManagingInvites(false);
    }
  };

  const toggleNudgePlayer = (playerId: string) => {
    setSelectedNudgePlayerIds(prev => (
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    ));
  };

  const handleNudgePlayers = async () => {
    if (selectedNudgePlayerIds.length === 0) {
      setNudgeMessage('Choose at least one player to nudge.');
      return;
    }

    setIsNudgingPlayers(true);
    setNudgeMessage(null);
    try {
      const response = await nudgePlayers(gameId, user.userId, selectedNudgePlayerIds);
      setSelectedNudgePlayerIds([]);
      setNudgeMessage(`Sent follow-up email${response.nudged.length === 1 ? '' : 's'} to ${response.nudged.length} player${response.nudged.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setNudgeMessage(err instanceof Error ? err.message : 'Failed to send follow-up emails');
    } finally {
      setIsNudgingPlayers(false);
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

  const { game, hand, ecosystem, opponentEcosystems, opponentSubmittedMoves, hasSubmitted, waitingFor } = gameState;
  const isHost = game.players[0]?.userId === user.userId;

  // Merge pending placed card into ecosystem for immediate preview. If the page refreshed
  // after submitting but before the turn resolved, restore that preview from server state.
  const submittedPlacedCard = gameState.submittedMove && gameState.submittedCard
    ? { card: gameState.submittedCard, coord: gameState.submittedMove.coord }
    : null;
  const previewPlacedCard = pendingPlacedCard ?? submittedPlacedCard;
  const displayEcosystem = previewPlacedCard && !ecosystem.some(p => coordEq(p.coord, previewPlacedCard.coord))
    ? [...ecosystem, previewPlacedCard]
    : ecosystem;

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

    const acceptedPlayers = lobbyInvites?.accepted ?? game.players;
    const pendingInvites = lobbyInvites?.pending ?? [];

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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <HelpButton onClick={() => setShowHowToPlay(true)} />
              <span className="label-badge">Lobby</span>
            </div>
          </div>
        </header>
        <main className="page-content lobby-page">
          <section className="lobby-hero card">
            <div className="lobby-hero-kicker">Waiting room</div>
            <h2>{acceptedPlayers.length < 2 ? 'Invite one more player to begin' : 'Ready when you are'}</h2>
            <p>
              {isHost
                ? 'Send more invitations, track pending replies, and remove anyone from the lobby before the game starts.'
                : 'Waiting for the host to start the game.'}
            </p>
            {isHost ? (
              <button
                className="button-primary"
                onClick={handleStart}
                disabled={acceptedPlayers.length < 2 || isSubmitting}
                style={{ opacity: acceptedPlayers.length < 2 ? 0.55 : 1 }}
              >
                {isSubmitting ? 'Starting...' : acceptedPlayers.length < 2 ? 'Need at least 2 players' : 'Start Game'}
              </button>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Waiting for host to start the game...</p>
            )}
          </section>

          {error && (
            <p className="text-sm mb-4" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}

          {isHost && (
            <section className="lobby-panel card">
              <div className="lobby-panel-header">
                <div>
                  <div className="lobby-hero-kicker">Add players</div>
                  <h3>Send more email invites</h3>
                </div>
                <Mail size={22} color="var(--color-forest-600)" />
              </div>

              <div className="form-input-list">
                {inviteInputs.map((email, index) => (
                  <div className="lobby-invite-input-row" key={index}>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="player@example.com"
                      value={email}
                      onChange={(e) => updateInviteInput(index, e.target.value)}
                    />
                    <button
                      className="button-icon button-icon-sm"
                      onClick={() => removeInviteInput(index)}
                      aria-label="Remove email field"
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="lobby-actions-row">
                <button className="button-secondary" onClick={addInviteField} type="button">
                  <Plus size={16} /> Add another
                </button>
                <button className="button-primary" onClick={handleSendInvites} disabled={isManagingInvites} type="button">
                  {isManagingInvites ? 'Sending...' : 'Send invites'}
                </button>
              </div>
              {inviteMessage && (
                <p className="text-sm mt-3" style={{ color: inviteMessage.startsWith('Failed') ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                  {inviteMessage}
                </p>
              )}
            </section>
          )}

          {isHost && (
            <section className="lobby-panel card">
              <div className="lobby-panel-header">
                <div>
                  <div className="lobby-hero-kicker">Computer players</div>
                  <h3>Add a bot</h3>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Fill empty seats with AI opponents. Easy is beatable; Impossible runs a self-play-trained search.
              </p>
              <div className="lobby-actions-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <select
                  className="input"
                  value={botDifficulty}
                  onChange={e => setBotDifficulty(e.target.value as BotDifficulty)}
                  disabled={isManagingInvites || acceptedPlayers.length >= 6}
                  style={{ maxWidth: 180 }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="impossible">Impossible</option>
                </select>
                <button
                  className="button-primary"
                  onClick={() => handleAddBot(botDifficulty)}
                  disabled={isManagingInvites || acceptedPlayers.length >= 6}
                  type="button"
                >
                  <Plus size={16} /> Add bot
                </button>
              </div>
            </section>
          )}

          <section className="lobby-roster-grid">
            <div className="lobby-panel card">
              <div className="lobby-panel-header">
                <div>
                  <div className="lobby-hero-kicker">Accepted</div>
                  <h3>Joined players ({acceptedPlayers.length})</h3>
                </div>
                <span className="lobby-count-pill">{acceptedPlayers.length}/6</span>
              </div>
              <div className="space-stack-sm">
                {acceptedPlayers.map(p => {
                  const isBot = p.userId.startsWith('ai:');
                  return (
                  <div className="lobby-person-row" key={p.userId}>
                    <div className="lobby-avatar" style={{ backgroundColor: isBot ? 'var(--color-amber-500, #d97706)' : p.userId === user.userId ? 'var(--color-forest-600)' : 'var(--color-sky-500)' }}>
                      {isBot ? '🤖' : p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="lobby-person-copy">
                      <strong>{p.name}{p.userId === user.userId ? ' (you)' : ''}</strong>
                      <span>{isBot ? 'Computer player' : p.email}</span>
                    </div>
                    {p.userId === game.players[0]?.userId ? (
                      <span className="label-badge">Host</span>
                    ) : isHost ? (
                      <button
                        className="lobby-remove-button"
                        onClick={() => isBot ? handleRemoveBot(p.userId) : handleRemoveInviteOrPlayer(p.email)}
                        disabled={isManagingInvites}
                        aria-label={`Remove ${p.name}`}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="lobby-panel card">
              <div className="lobby-panel-header">
                <div>
                  <div className="lobby-hero-kicker">Pending</div>
                  <h3>Invited, not replied ({pendingInvites.length})</h3>
                </div>
              </div>
              <div className="space-stack-sm">
                {pendingInvites.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No outstanding invitations.</p>
                ) : pendingInvites.map(invite => (
                  <div className="lobby-person-row pending" key={invite.id}>
                    <div className="lobby-avatar pending"><Mail size={15} /></div>
                    <div className="lobby-person-copy">
                      <strong>{invite.invitedEmail}</strong>
                      <span>Waiting for reply</span>
                    </div>
                    {isHost && (
                      <button
                        className="lobby-remove-button"
                        onClick={() => handleRemoveInviteOrPlayer(invite.invitedEmail)}
                        disabled={isManagingInvites}
                        aria-label={`Remove ${invite.invitedEmail}`}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="label-badge">Round {game.round}/2</span>
            <span className="label-badge">Turn {game.turn}/10</span>
            <HelpButton onClick={() => setShowHowToPlay(true)} />
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

        {isHost && (
          <section className="card mb-4" style={{ padding: '1rem' }}>
            <div className="mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Nudge players</h3>
                <p className="text-sm" style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>
                  Send a follow-up email with the game link to selected players.
                </p>
              </div>
              <Mail size={20} color="var(--color-forest-600)" />
            </div>
            <div className="space-stack-sm">
              {game.players.filter(p => !p.leftGame).map(player => (
                <label key={player.userId} className="lobby-person-row" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedNudgePlayerIds.includes(player.userId)}
                    onChange={() => toggleNudgePlayer(player.userId)}
                    disabled={isNudgingPlayers}
                  />
                  <div className="lobby-person-copy">
                    <strong>{player.name}{player.userId === user.userId ? ' (you)' : ''}</strong>
                    <span>{player.email}</span>
                  </div>
                </label>
              ))}
            </div>
            <button
              className="button-secondary mt-3"
              onClick={handleNudgePlayers}
              disabled={isNudgingPlayers || selectedNudgePlayerIds.length === 0}
              type="button"
              style={{ opacity: selectedNudgePlayerIds.length === 0 ? 0.55 : 1 }}
            >
              {isNudgingPlayers ? 'Sending...' : `Send follow-up email${selectedNudgePlayerIds.length === 1 ? '' : 's'}`}
            </button>
            {nudgeMessage && (
              <p className="text-sm mt-3" style={{ color: nudgeMessage.startsWith('Failed') || nudgeMessage.startsWith('Choose') ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                {nudgeMessage}
              </p>
            )}
          </section>
        )}

        {/* Hand */}
        {!hasSubmitted && hand.length > 0 && (
          <div className="mb-4">
            <div className="mb-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Your cards
              </h3>
              {selectedCard && (
                <button
                  onClick={() => setShowScoringHint(!showScoringHint)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-forest-600)', fontSize: '0.8125rem',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  title="Show scoring hint"
                >
                  ? {selectedCard.type}
                </button>
              )}
            </div>
            {showScoringHint && selectedCard && (
              <div style={{
                padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                backgroundColor: 'var(--color-sage-100)', borderRadius: 'var(--radius-lg)',
                fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-sage-300)',
              }}>
                <strong style={{ textTransform: 'capitalize' }}>{selectedCard.type}:</strong>{' '}
                {SCORING_HINTS[selectedCard.type]}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0' }}
              className="no-scrollbar">
              {[...hand].sort((a, b) => a.type.localeCompare(b.type)).map(card => (
                <CardTile
                  key={card.id}
                  type={card.type}
                  size="lg"
                  selected={selectedCard?.id === card.id}
                  onClick={() => {
                    if (swapMode) return;
                    setSelectedCard(selectedCard?.id === card.id ? null : card);
                    setSelectedCell(null);
                    setShowScoringHint(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Player Ecosystem */}
        <div className="card mb-6" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <h3 className="mb-2" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Ecosystem
          </h3>
          {displayEcosystem.length === 0 && !selectedCard ? (
            <div style={{
              padding: '2.25rem 1rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              color: 'var(--color-text-muted)',
            }}>
              <div style={{ fontSize: '2.25rem', lineHeight: 1 }} aria-hidden>🌱</div>
              <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: 280 }}>
                Your habitat is empty. Pick a card above to place your first species.
              </p>
            </div>
          ) : (
            <EcosystemGrid
              ecosystem={displayEcosystem}
              validPlacements={placements}
              onCellClick={handleCellClick}
              selectedCell={selectedCell}
              size="md"
              swapMode={swapMode}
              swapSelection={swapSelection}
              onSwapSelect={handleSwapSelect}
            />
          )}
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
                const submittedMove = opponentSubmittedMoves[id];
                const isWaiting = !submittedMove;
                return (
                  <div
                    key={id}
                    className="card"
                    style={{
                      padding: '0.85rem',
                      border: `1.5px solid ${submittedMove ? 'var(--color-amber-500)' : 'var(--color-forest-500)'}`,
                      boxShadow: submittedMove ? '0 0 0 3px rgba(224,165,40,0.12)' : '0 0 0 3px rgba(61,133,83,0.12)',
                    }}
                  >
                    <p className="text-sm mb-2" style={{
                      fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {player?.name ?? id}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.72rem',
                        fontWeight: 700, letterSpacing: '0.02em',
                        background: submittedMove ? 'rgba(224,165,40,0.16)' : 'rgba(61,133,83,0.14)',
                        color: submittedMove ? 'var(--color-amber-600)' : 'var(--color-forest-600)',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: 999,
                          background: submittedMove ? 'var(--color-amber-500)' : 'var(--color-forest-500)',
                        }} />
                        {isWaiting ? 'Playing' : 'Submitted'}
                      </span>
                    </p>
                    <EcosystemGrid
                      ecosystem={eco}
                      hiddenPlacements={submittedMove ? [submittedMove.coord] : undefined}
                      size="sm"
                    />
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

      {/* How to Play Modal */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}
