import { describe, expect, it } from "vitest";
import { columnCountFor, computeLayout, mergeUnique, visibleItems } from "./layout";

const item = (id: number, width = 100, height = 100) => ({ id, width, height });

describe("computeLayout", () => {
  it("places each item in the shortest column, leftmost on ties", () => {
    // 2 columns of width 100, gap 0. Heights: 100 (tall), 50, 50, 50
    const items = [item(1, 100, 100), item(2, 100, 50), item(3, 100, 50), item(4, 100, 50)];
    const { placed } = computeLayout(items, 200, 2, 0);
    expect(placed.map((p) => [p.x, p.y])).toEqual([
      [0, 0],   // col 0 (tie -> leftmost)
      [100, 0], // col 1 is shorter now
      [100, 50], // col 1 (50) still shorter than col 0 (100)
      [0, 100], // both columns at 100 -> leftmost
    ]);
  });

  it("derives height from aspect ratio and adds caption height", () => {
    const { placed } = computeLayout([item(1, 200, 400)], 100, 1, 0, 30);
    expect(placed[0].w).toBe(100);
    expect(placed[0].h).toBe(230); // 100 * 400/200 + 30
  });

  it("never overlaps items within a column", () => {
    const items = Array.from({ length: 200 }, (_, i) => item(i, 300 + (i % 3) * 100, 200 + ((i * 37) % 500)));
    const { placed } = computeLayout(items, 1000, 4, 16, 36);
    const byCol = new Map<number, typeof placed>();
    for (const p of placed) byCol.set(p.x, [...(byCol.get(p.x) ?? []), p]);
    for (const col of byCol.values()) {
      for (let i = 1; i < col.length; i++) expect(col[i].y).toBeGreaterThanOrEqual(col[i - 1].y + col[i - 1].h + 16 - 1e-6);
    }
  });

  it("total height is the tallest column without trailing gap", () => {
    // width 200, gap 10 -> columns are 95px wide; item 1 is 95 tall, item 2 is 47.5 tall
    const { totalHeight } = computeLayout([item(1, 100, 100), item(2, 100, 50)], 200, 2, 10);
    expect(totalHeight).toBe(95);
  });

  it("handles empty input and zero width", () => {
    expect(computeLayout([], 500, 3, 8)).toEqual({ placed: [], totalHeight: 0 });
    expect(computeLayout([item(1)], 0, 3, 8).placed).toEqual([]);
  });
});

describe("visibleItems", () => {
  it("returns only items intersecting the window plus overscan", () => {
    const { placed } = computeLayout(Array.from({ length: 100 }, (_, i) => item(i)), 100, 1, 0);
    // single column, each 100 tall: item i spans [100i, 100i+100]
    const ids = visibleItems(placed, 1000, 1200, 0).map((p) => p.item.id);
    expect(ids).toEqual([9, 10, 11, 12]); // 9 ends exactly at 1000 (inclusive edge)
    expect(visibleItems(placed, 1000, 1200, 200).length).toBeGreaterThan(ids.length);
  });

  it("renders a small, bounded slice of a huge list", () => {
    const { placed } = computeLayout(Array.from({ length: 10_000 }, (_, i) => item(i, 100, 150)), 1200, 5, 16, 36);
    expect(visibleItems(placed, 50_000, 50_900, 600).length).toBeLessThan(80);
  });
});

describe("columnCountFor", () => {
  it("grows with width", () => {
    expect([360, 600, 900, 1200, 1800].map(columnCountFor)).toEqual([2, 3, 4, 5, 6]);
  });
});

describe("mergeUnique", () => {
  it("drops duplicates by id and keeps order (e.g. a page fetched twice)", () => {
    const merged = mergeUnique([{ id: 3 }, { id: 2 }], [{ id: 2 }, { id: 1 }]);
    expect(merged.map((m) => m.id)).toEqual([3, 2, 1]);
  });
});
