export interface Sized {
  id: number;
  width: number;
  height: number;
}

export interface Placed<T extends Sized> {
  item: T;
  index: number; // position in the original list (0 = newest)
  x: number;
  y: number;
  w: number;
  h: number;
}

export function columnCountFor(containerWidth: number): number {
  if (containerWidth < 520) return 2;
  if (containerWidth < 800) return 3;
  if (containerWidth < 1100) return 4;
  if (containerWidth < 1400) return 5;
  return 6;
}

/**
 * Greedy masonry: each item goes in the currently shortest column (ties -> leftmost).
 * Heights come from the API's width/height, so layout never depends on images having loaded
 * and nothing jumps when they do (zero layout shift).
 * O(n * columns); recomputed from scratch on append, which is fine into the low thousands.
 */
export function computeLayout<T extends Sized>(
  items: readonly T[],
  containerWidth: number,
  columns: number,
  gap: number,
  captionHeight = 0,
): { placed: Placed<T>[]; totalHeight: number } {
  if (containerWidth <= 0 || columns <= 0) return { placed: [], totalHeight: 0 };
  const colWidth = (containerWidth - gap * (columns - 1)) / columns;
  const heights = new Array<number>(columns).fill(0);
  const placed: Placed<T>[] = [];

  for (const [index, item] of items.entries()) {
    let col = 0;
    for (let c = 1; c < columns; c++) if (heights[c] < heights[col]) col = c;
    const h = (colWidth * item.height) / item.width + captionHeight;
    placed.push({ item, index, x: col * (colWidth + gap), y: heights[col], w: colWidth, h });
    heights[col] += h + gap;
  }
  return { placed, totalHeight: Math.max(0, Math.max(...heights) - gap) };
}

/** Items whose box intersects [top - overscan, bottom + overscan]. */
export function visibleItems<T extends Sized>(
  placed: readonly Placed<T>[],
  top: number,
  bottom: number,
  overscan: number,
): Placed<T>[] {
  const lo = top - overscan;
  const hi = bottom + overscan;
  return placed.filter((p) => p.y + p.h >= lo && p.y <= hi);
}

export function mergeUnique<T extends { id: number }>(existing: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(existing.map((e) => e.id));
  return [...existing, ...incoming.filter((i) => !seen.has(i.id))];
}
