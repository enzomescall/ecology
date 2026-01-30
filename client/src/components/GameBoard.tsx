import { useState, useEffect } from 'react';
import { ArrowLeft, TreeDeciduous, TreePine, Bird, Fish, Bug, Flower, Leaf, Sprout, LogOut } from 'lucide-react';
import { getGameState, submitMove, debugActivateGame, leaveGame } from '../services/gameApi';
import type { Game, } from '../services/gameApi';
import type { User } from '../App';

interface Card {
  id: string;
  type: 'tree' | 'animal' | 'plant';
  icon: 'deciduous' | 'pine' | 'bird' | 'fish' | 'bug' | 'flower' | 'leaf' | 'sprout';
  color: string;
  value: number;
}

interface GameBoardProps {
  gameId: string;
  user: User;
  onBack: () => void;
  onGameEnd: () => void;
}

// Mock hand for now
const mockHand: Card[] = [
  { id: '1', type: 'tree', icon: 'deciduous', color: 'var(--color-forest-600)', value: 3 },
  { id: '2', type: 'animal', icon: 'bird', color: 'var(--color-sky-500)', value: 2 },
  { id: '3', type: 'plant', icon: 'flower', color: 'var(--color-amber-500)', value: 1 },
  { id: '4', type: 'tree', icon: 'pine', color: 'var(--color-forest-700)', value: 3 },
  { id: '5', type: 'animal', icon: 'fish', color: 'var(--color-sky-600)', value: 2 },
];

const iconMap = {
  deciduous: TreeDeciduous,
  pine: TreePine,
  bird: Bird,
  fish: Fish,
  bug: Bug,
  flower: Flower,
  leaf: Leaf,
  sprout: Sprout,
};

export function GameBoard({ gameId, user, onBack, onGameEnd }: GameBoardProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [isCurrentPlayer, setIsCurrentPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingGame, setIsLeavingGame] = useState(false);
  
  // Player grid (4 rows x 5 cols)
  const [grid, setGrid] = useState<(Card | null)[][]>(
    Array(4).fill(null).map(() => Array(5).fill(null))
  );

  // Check if user is the last active player
  const isLastPlayer = game ? game.players.filter(p => !p.left_game).length === 1 : false;
  const leaveText = isLastPlayer ? 'Delete Game' : 'Leave Game';

  // Reconstruct grid from game moves
  const reconstructGrid = (gameData: Game) => {
    const newGrid = Array(4).fill(null).map(() => Array(5).fill(null));
    
    gameData.moves.forEach((move) => {
      const moveData = move.moveData as any;
      if (moveData.row !== undefined && moveData.col !== undefined && moveData.cardId !== undefined) {
        // Find the card by id from mockHand (or backend if available)
        const card = mockHand.find(c => c.id === moveData.cardId);
        if (card) {
          newGrid[moveData.row][moveData.col] = card;
        }
      }
    });
    
    return newGrid;
  };

  // Poll for game state updates
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const { game: updatedGame, isCurrentPlayer: isCurrent } = await getGameState(gameId, user.userId);
        setGame(updatedGame);
        setIsCurrentPlayer(isCurrent);
        
        // Reconstruct grid from moves
        const newGrid = reconstructGrid(updatedGame);
        setGrid(newGrid);
        
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [gameId, user.userId]);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayer || !selectedCard) return;
    if (grid[row][col] !== null) return;
    setSelectedCell({ row, col });
  };

  const handlePlaceCard = async () => {
    if (!selectedCard || !selectedCell || !game) return;
    
    try {
      const moveData = {
        row: selectedCell.row,
        col: selectedCell.col,
        cardId: selectedCard.id,
      };
      
      await submitMove(gameId, user.userId, moveData);
      // Grid will be reconstructed from backend moves on next poll
      setSelectedCard(null);
      setSelectedCell(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
    }
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

  if (isLoading) {
    return (
      <div className="page-container flex-center">
        <p>Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-container flex-center">
        <p>{error || 'Game not found'}</p>
      </div>
    );
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  const canPlaceCard = selectedCard && selectedCell && isCurrentPlayer;

  return (
    <div className="min-h-screen pb-24">
      {/* Top Bar */}
      <header className="page-header">
        <div className="page-header-content">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="button-icon-sm"
              style={{ color: 'var(--color-forest-600)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-200)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="button-icon-sm"
              style={{ color: 'var(--color-error)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-100)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={leaveText}
            >
              <LogOut size={20} />
            </button>
            <h3>{game.name}</h3>
          </div>
          {isCurrentPlayer ? (
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm">Your turn</span>
            </div>
          ) : (
            <div 
              className="inline-flex px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--color-sage-200)', color: 'var(--color-forest-700)' }}
            >
              <span className="text-sm">Waiting for {currentPlayer?.name}</span>
            </div>
          )}
          {/* DEBUG: Force game active button */}
          {game.status !== 'active' && (
            <button
              onClick={async () => {
                try {
                  const updatedGame = await debugActivateGame(gameId);
                  setGame(updatedGame);
                } catch (err) {
                  alert('Debug: Failed to activate game');
                }
              }}
              className="px-2 py-1 text-xs rounded"
              style={{ backgroundColor: 'var(--color-amber-500)', color: 'white' }}
            >
              DEBUG: Activate
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        {/* Opponent Summary */}
        <div className="mb-4">
          <div className="flex gap-2">
            {game.players.map((player, idx) => (
              player.userId !== user.userId && (
                <div
                  key={player.userId}
                  className="card flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--color-sage-100)',
                    border: '1px solid var(--color-border)',
                    padding: '0.75rem',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{
                      backgroundColor: 'var(--color-sage-400)',
                      color: 'white',
                    }}
                  >
                    {getInitials(player.name)}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {player.name}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: idx === game.currentPlayerIndex
                        ? 'var(--color-success)' 
                        : 'var(--color-sage-400)',
                    }}
                  />
                </div>
              )
            ))}
          </div>
        </div>

        {/* Game Status */}
        {error && (
          <div 
            className="p-4 rounded-lg mb-4"
            style={{ 
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Player Grid */}
        <div 
          className="card mb-6"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1rem',
          }}
        >
          <div className="grid-5col gap-2">
            {grid.map((row, rowIdx) =>
              row.map((card, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  disabled={!isCurrentPlayer || !selectedCard || card !== null}
                  className="aspect-square rounded-lg transition-all disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: card 
                      ? card.color 
                      : selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                      ? 'var(--color-sage-200)'
                      : 'var(--color-bg-secondary)',
                    border: `2px solid ${
                      selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                        ? 'var(--color-forest-600)'
                        : 'var(--color-border)'
                    }`,
                    opacity: !isCurrentPlayer || (selectedCard && card === null) ? 1 : card ? 1 : 0.6,
                  }}
                >
                  {card && (
                    <div className="flex items-center justify-center h-full">
                      {(() => {
                        const Icon = iconMap[card.icon];
                        return <Icon size={24} color="white" />;
                      })()}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Hand */}
        {isCurrentPlayer && (
          <div>
            <h3 className="mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Your cards
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
              {mockHand.map((card) => {
                const Icon = iconMap[card.icon];
                const isSelected = selectedCard?.id === card.id;
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(isSelected ? null : card)}
                    className="flex-shrink-0 w-24 h-32 rounded-xl transition-all card"
                    style={{
                      backgroundColor: card.color,
                      border: `3px solid ${isSelected ? 'var(--color-forest-900)' : 'transparent'}`,
                      boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-md)',
                      transform: isSelected ? 'translateY(-8px)' : 'translateY(0)',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full text-white">
                      <Icon size={32} />
                      <span className="mt-2 text-xs opacity-90 capitalize">{card.icon}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Waiting State */}
        {!isCurrentPlayer && (
          <div 
            className="card text-center py-12"
            style={{
              backgroundColor: 'var(--color-sage-100)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Waiting for other players to take their turn.
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              We'll notify you when it's your turn again.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {isCurrentPlayer && (
        <div 
          className="fixed bottom-0 left-0 right-0 p-4"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderTop: '1px solid var(--color-border)',
            boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.05)',
          }}
        >
          <div className="max-w-2xl mx-auto">
            {selectedCard && !selectedCell && (
              <p 
                className="text-sm text-center mb-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Tap an empty cell on the grid to place your card
              </p>
            )}
            <button
              onClick={handlePlaceCard}
              disabled={!canPlaceCard}
              className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canPlaceCard ? 'var(--color-forest-600)' : 'var(--color-sage-400)',
              }}
              onMouseEnter={(e) => {
                if (canPlaceCard) {
                  e.currentTarget.style.backgroundColor = 'var(--color-forest-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (canPlaceCard) {
                  e.currentTarget.style.backgroundColor = 'var(--color-forest-600)';
                }
              }}
            >
              Place card
            </button>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Leave/Delete Game Modal */}
      {showLeaveModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 26, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !isLeavingGame && setShowLeaveModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--color-text-primary)',
              }}
            >
              {isLastPlayer ? 'Delete Game?' : 'Leave Game?'}
            </h2>
            <p 
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
                lineHeight: '1.5',
              }}
            >
              {isLastPlayer 
                ? 'You are the last player in this game. Are you sure you want to delete it?'
                : 'You are about to leave an active game. Are you sure?'
              }
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeavingGame}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  cursor: isLeavingGame ? 'not-allowed' : 'pointer',
                  opacity: isLeavingGame ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => !isLeavingGame && (e.currentTarget.style.backgroundColor = 'var(--color-sage-100)')}
                onMouseLeave={(e) => !isLeavingGame && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGame}
                disabled={isLeavingGame}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  color: 'white',
                  backgroundColor: 'var(--color-error)',
                  cursor: isLeavingGame ? 'not-allowed' : 'pointer',
                  opacity: isLeavingGame ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => !isLeavingGame && (e.currentTarget.style.backgroundColor = '#a85030')}
                onMouseLeave={(e) => !isLeavingGame && (e.currentTarget.style.backgroundColor = 'var(--color-error)')}
              >
                {isLeavingGame ? 'Processing...' : leaveText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

