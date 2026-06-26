export type CardType = 'stream' | 'meadow' | 'wolf' | 'fox' | 'bear' | 'trout' | 'dragonfly' | 'bee' | 'eagle' | 'deer' | 'rabbit';

// Each card gets a two-stop gradient (top-light → bottom-deep) for tactile depth.
const CARD_GRADIENTS: Record<CardType, [string, string]> = {
  stream: ['#5ba3e8', '#3a7bc4'],
  meadow: ['#8ec84f', '#69a338'],
  wolf: ['#8a9aa6', '#647683'],
  fox: ['#f56a1f', '#d24e00'],
  bear: ['#8a6650', '#664636'],
  trout: ['#1bb6c7', '#00838f'],
  dragonfly: ['#9069d6', '#6a45b0'],
  bee: ['#ffdc3c', '#f2b705'],
  eagle: ['#9e7d6b', '#7a5d4b'],
  deer: ['#b89478', '#94705a'],
  rabbit: ['#fbfaf7', '#e4e0d6'],
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
  const [g1, g2] = CARD_GRADIENTS[type];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="card-tile"
      data-selected={selected ? 'true' : undefined}
      style={{
        width: px, height: px + 20,
        background: `linear-gradient(160deg, ${g1} 0%, ${g2} 100%)`,
        border: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 'var(--radius-md)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.4 : 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        transition: 'transform 160ms cubic-bezier(0.34,1.4,0.64,1), box-shadow 160ms ease, outline-color 120ms ease',
        transform: selected ? 'translateY(-6px)' : 'none',
        outline: selected ? '3px solid var(--color-forest-600)' : '3px solid transparent',
        outlineOffset: '2px',
        boxShadow: selected
          ? 'var(--shadow-lg)'
          : 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.12), 0 2px 4px rgba(20,39,26,0.12)',
        padding: 0,
      }}
    >
      <span style={{ fontSize: px * 0.42, lineHeight: 1, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.18))' }}>
        {CARD_LABELS[type]}
      </span>
      {size !== 'sm' && (
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          color: isLight ? 'rgba(40,40,40,0.78)' : 'rgba(255,255,255,0.92)',
        }}>
          {type}
        </span>
      )}
    </button>
  );
}
