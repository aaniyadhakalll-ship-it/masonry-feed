import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { columnCountFor, computeLayout, visibleItems } from "../layout";
import type { Pin } from "../types";
import { PinCard } from "./PinCard";

const GAP = 16;
const CAPTION = 36;
const OVERSCAN = 600; // px rendered above/below the viewport so fast scrolling doesn't show blanks
const QUANTUM = 200; // the window snaps to 200px steps, so React re-renders per 200px scrolled, not per frame
const EAGER_COUNT = 6; // above-the-fold images load eagerly (helps LCP); everything else is lazy

function useContainerWidth(ref: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** The slice of the container (in container coordinates) currently in the viewport. */
function useViewWindow(ref: RefObject<HTMLElement>, totalHeight: number) {
  const [win, setWin] = useState({ top: 0, bottom: typeof window === "undefined" ? 1000 : window.innerHeight });
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const t = -el.getBoundingClientRect().top;
      const top = Math.floor(t / QUANTUM) * QUANTUM;
      const bottom = Math.ceil((t + window.innerHeight) / QUANTUM) * QUANTUM;
      setWin((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, totalHeight]);
  return win;
}

interface Props {
  items: Pin[];
  canLoadMore: boolean;
  onEndReached: () => void;
  /** false = naive mode: render every item, no lazy loading. Exists so Lighthouse "before" is reproducible. */
  optimized: boolean;
  onStats?: (rendered: number, total: number) => void;
}

export function Masonry({ items, canLoadMore, onEndReached, optimized, onStats }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const columns = columnCountFor(width);

  const { placed, totalHeight } = useMemo(
    () => computeLayout(items, width, columns, GAP, CAPTION),
    [items, width, columns],
  );
  const { top, bottom } = useViewWindow(containerRef, totalHeight);
  const visible = useMemo(
    () => (optimized ? visibleItems(placed, top, bottom, OVERSCAN) : placed),
    [optimized, placed, top, bottom],
  );

  useEffect(() => onStats?.(visible.length, items.length), [visible.length, items.length, onStats]);

  // Infinite scroll: when the sentinel (just below the feed) is within 1200px of the viewport, load more.
  // Re-created after every page so a sentinel that is still in range triggers the next load.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !canLoadMore) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && onEndReached(), {
      rootMargin: "1200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [canLoadMore, onEndReached, items.length]);

  return (
    <>
      <div ref={containerRef} className="masonry" style={{ height: totalHeight }}>
        {visible.map((p) => (
          <PinCard
            key={p.item.id}
            placed={p}
            captionHeight={CAPTION}
            eager={!optimized || p.index < EAGER_COUNT}
          />
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="sentinel" />
    </>
  );
}
