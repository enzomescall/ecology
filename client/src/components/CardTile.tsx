export type CardType = 'stream' | 'meadow' | 'wolf' | 'fox' | 'bear' | 'trout' | 'dragonfly' | 'bee' | 'eagle' | 'deer' | 'rabbit';

const CARD_COLORS: Record<CardType, string> = {
  stream: '#4a90d9', meadow: '#7cb342', wolf: '#78909c', fox: '#e65100',
  bear: '#795548', trout: '#0097a7', dragonfly: '#7e57c2', bee: '#fdd835',
  eagle: '#8d6e63', deer: '#a1887f', rabbit: '#f5f5f5',
};

const CARD_LABELS: Record<CardType, string> = {
  stream: '🌊', meadow: '🌿', wolf: '🐺', fox: '🦊', bear: '🐻',
  trout: '🐟', dragonfly: '🪰', bee: '🐝', eagle: '🦅', deer: '🦌', rabbit: '🐇',
};

const SIZES = { sm: 40, md: 60, lg: 80 } as const;

interface Props {
  type: CardType;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
}

export function CardTile({ type, size = 'md', selected, onClick, dimmed }: Props) {
  const px = SIZES[size];
  const isLight = type === 'rabbit' || type === 'bee';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: px, height: px + 20,
        backgroundColor: CARD_COLORS[type],
        border: selected ? '3px solid var(--color-forest-900)' : '2px solid transparent',
        borderRadius: 'var(--radius-lg)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.4 : 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        transition: 'all 150ms ease',
        transform: selected ? 'translateY(-4px)' : 'none',
        boxShadow: selected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        padding: 0,
      }}
    >
      <span style={{ fontSize: px * 0.4 }}>{CARD_LABELS[type]}</span>
      {size !== 'sm' && (
        <span style={{
          fontSize: 9, fontWeight: 600, textTransform: 'capitalize',
          color: isLight ? '#333' : 'white',
        }}>
          {type}
        </span>
      )}
    </button>
  );
}
