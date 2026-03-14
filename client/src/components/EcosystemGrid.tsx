import type { JSX } from 'react';
import { CardTile } from './CardTile';
import type { CardType } from './CardTile';

interface Card { id: string; type: CardType; }
interface Coord { x: number; y: number; }
interface PlacedCard { card: Card; coord: Coord; }

interface Props {
  ecosystem: PlacedCard[];
  validPlacements?: Coord[];
  onCellClick?: (coord: Coord) => void;
  selectedCell?: Coord | null;
  size?: 'sm' | 'md';
  swapMode?: boolean;
  swapSelection?: Coord[];
  onSwapSelect?: (coord: Coord) => void;
}

function coordKey(c: Coord) { return `${c.x},${c.y}`; }

function computeBounds(ecosystem: PlacedCard[], validPlacements?: Coord[]) {
  if (ecosystem.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  const allCoords = ecosystem.map(p => p.coord);
  const origMinX = Math.min(...allCoords.map(c => c.x));
  const origMaxX = Math.max(...allCoords.map(c => c.x));
  const origMinY = Math.min(...allCoords.map(c => c.y));
  const origMaxY = Math.max(...allCoords.map(c => c.y));

  const tempMinX = Math.max(origMinX - 1, origMaxX - 4);
  const tempMaxX = Math.min(origMaxX + 1, tempMinX + 4);
  const tempMinY = Math.max(origMinY - 1, origMaxY - 3);
  const tempMaxY = Math.min(origMaxY + 1, tempMinY + 3);

  return { minX: tempMinX, maxX: tempMaxX, minY: tempMinY, maxY: tempMaxY };
}

export function EcosystemGrid({
  ecosystem, validPlacements, onCellClick, selectedCell,
  size = 'md', swapMode, swapSelection = [], onSwapSelect,
}: Props) {
  const { minX, maxX, minY, maxY } = computeBounds(ecosystem, validPlacements);
  const cols = maxX - minX + 1;
  const cardByCoord = new Map(ecosystem.map(p => [coordKey(p.coord), p]));
  const validSet = new Set((validPlacements ?? []).map(coordKey));
  const cellPx = size === 'sm' ? 44 : 68;

  const cells: JSX.Element[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = coordKey({ x, y });
      const placed = cardByCoord.get(key);
      const isValid = validSet.has(key);
      const isSelected = selectedCell && selectedCell.x === x && selectedCell.y === y;
      const isSwapSelected = swapSelection.some(s => s.x === x && s.y === y);

      if (placed) {
        const handleClick = swapMode && onSwapSelect
          ? () => onSwapSelect({ x, y })
          : undefined;
        cells.push(
          <div key={key} style={{ position: 'relative' }}>
            <CardTile
              type={placed.card.type}
              size={size === 'sm' ? 'sm' : 'md'}
              selected={isSwapSelected}
              onClick={handleClick}
            />
          </div>
        );
      } else if (isValid && size !== 'sm') {
        cells.push(
          <button
            key={key}
            onClick={() => onCellClick?.({ x, y })}
            style={{
              width: cellPx, height: cellPx + 20,
              border: isSelected
                ? '3px solid var(--color-forest-600)'
                : '2px dashed var(--color-sage-400)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isSelected ? 'var(--color-sage-200)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          />
        );
      } else {
        cells.push(
          <div key={key} style={{ width: cellPx, height: cellPx + 20 }} />
        );
      }
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, auto)`,
      gap: size === 'sm' ? 2 : 6,
      justifyContent: 'center',
    }}>
      {cells}
    </div>
  );
}
