import { useState } from 'react';
import { ArrowLeft, TreeDeciduous, TreePine, Bird, Fish, Bug, Flower, Leaf, Sprout } from 'lucide-react';

interface Card {
  id: string;
  type: 'tree' | 'animal' | 'plant';
  icon: 'deciduous' | 'pine' | 'bird' | 'fish' | 'bug' | 'flower' | 'leaf' | 'sprout';
  color: string;
  value: number;
}

interface Player {
  id: string;
  name: string;
  isCurrentTurn: boolean;
  grid: (Card | null)[][];
}

interface GameBoardProps {
  gameId: string;
  user: { email: string; name: string };
  onBack: () => void;
  onGameEnd: () => void;
}

// Mock data
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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isMyTurn] = useState(true); // Toggle to see waiting state
  
  // Mock player grid (4 rows x 5 cols)
  const [grid, setGrid] = useState<(Card | null)[][]>(
    Array(4).fill(null).map(() => Array(5).fill(null))
  );

  // Mock opponents
  const opponents = [
    { id: '2', name: 'Alex', isCurrentTurn: false },
    { id: '3', name: 'Jordan', isCurrentTurn: false },
  ];

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const handleCellClick = (row: number, col: number) => {
    if (!isMyTurn || !selectedCard) return;
    if (grid[row][col] !== null) return; // Cell already occupied
    
    setSelectedCell({ row, col });
  };

  const handlePlaceCard = () => {
    if (!selectedCard || !selectedCell) return;
    
    const newGrid = grid.map(row => [...row]);
    newGrid[selectedCell.row][selectedCell.col] = selectedCard;
    setGrid(newGrid);
    setSelectedCard(null);
    setSelectedCell(null);
    
    // In real app, this would submit the move and switch turns
  };

  const canPlaceCard = selectedCard && selectedCell;

  return (
    <div className="min-h-screen pb-24">
      {/* Top Bar */}
      <header 
        className="px-4 py-3 sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-forest-600)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-200)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft size={20} />
            </button>
            <h3>Forest Friends</h3>
          </div>
          {isMyTurn ? (
            <div 
              className="px-3 py-1.5 rounded-lg inline-flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm">Your turn</span>
            </div>
          ) : (
            <div 
              className="px-3 py-1.5 rounded-lg inline-flex"
              style={{ backgroundColor: 'var(--color-sage-200)', color: 'var(--color-forest-700)' }}
            >
              <span className="text-sm">Waiting for others</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 max-w-2xl mx-auto">
        {/* Opponent Summary */}
        <div className="mb-4">
          <div className="flex gap-2">
            {opponents.map((opponent) => (
              <div
                key={opponent.id}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-sage-100)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: 'var(--color-sage-400)',
                    color: 'white',
                  }}
                >
                  {getInitials(opponent.name)}
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {opponent.name}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: opponent.isCurrentTurn 
                      ? 'var(--color-success)' 
                      : 'var(--color-sage-400)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Player Grid */}
        <div 
          className="mb-6 p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '2px solid var(--color-border)',
          }}
        >
          <div className="grid grid-cols-5 gap-2">
            {grid.map((row, rowIdx) =>
              row.map((card, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  disabled={!isMyTurn || !selectedCard || card !== null}
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
                    opacity: !isMyTurn || (selectedCard && card === null) ? 1 : card ? 1 : 0.6,
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
        {isMyTurn && (
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
                    className="flex-shrink-0 w-24 h-32 rounded-xl transition-all"
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
        {!isMyTurn && (
          <div 
            className="text-center py-12 rounded-xl"
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
      {isMyTurn && (
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
              className="w-full py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canPlaceCard ? 'var(--color-forest-600)' : 'var(--color-sage-400)',
                color: 'white',
                boxShadow: 'var(--shadow-sm)',
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
    </div>
  );
}
