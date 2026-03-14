import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Section {
  title: string;
  content: string;
}

const SECTIONS: Section[] = [
  {
    title: 'Game Overview',
    content:
      'Ecology is a card game for 2-6 players. Each round has 10 turns. On every turn, all players pick a card from their hand and place it on their 5x4 grid at the same time. After each turn, hands are passed to the next player (left in round 1, right in round 2). At the end of 2 rounds, the player with the most points wins!',
  },
  {
    title: 'Placement Rules',
    content:
      'Cards must be placed adjacent (up, down, left, or right) to an already-placed card. Your ecosystem must fit within a 5-column by 4-row grid. The first card goes in the center. You cannot place a card on an occupied cell.',
  },
  {
    title: 'Rabbit Swap',
    content:
      'When you place a Rabbit card, you may optionally swap two adjacent cards already in your ecosystem. This can help you score better by repositioning animals near their scoring partners. You can skip the swap if you prefer.',
  },
  {
    title: 'Scoring',
    content:
      'Stream: Longest connected stream earns 8 pts (2nd: 5 pts).\n' +
      'Meadow: Connected meadow groups score 3/6/10/15 pts for size 2/3/4/5+.\n' +
      'Wolf: Most wolves earns 12 pts (2nd: 8, 3rd: 4).\n' +
      'Fox: 3 pts each, but loses points if adjacent to Bear or Wolf.\n' +
      'Bear: 2 pts per adjacent Trout or Bee.\n' +
      'Trout: 2 pts per adjacent Stream or Dragonfly.\n' +
      'Dragonfly: Score equals size of each adjacent Stream group.\n' +
      'Bee: 3 pts per adjacent Meadow group.\n' +
      'Eagle: 2 pts per Rabbit/Trout within 2 straight-line spaces.\n' +
      'Deer: 2 pts per row + 2 pts per column that contains a Deer.\n\n' +
      'Diversity Penalty: Having 4+ scoring categories at 0 pts loses points (-2 for 4, -5 for 5, -8 for 6+).',
  },
];

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          maxWidth: '32rem',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--color-text-primary)',
          }}
        >
          How to Play
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SECTIONS.map((section, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                  }}
                >
                  <span>{section.title}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isExpanded && (
                  <div
                    style={{
                      padding: '0 1rem 0.75rem',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              color: 'white',
              backgroundColor: 'var(--color-forest-600)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-forest-700)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-forest-600)')}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function HelpButton({ onClick, title = 'How to Play' }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      className="button-icon button-icon-sm"
      style={{ color: 'var(--color-forest-600)' }}
      title={title}
    >
      <HelpCircle size={20} />
    </button>
  );
}
