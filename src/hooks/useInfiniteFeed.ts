import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeed } from "../api";
import { mergeUnique } from "../layout";
import type { Pin } from "../types";

export function useInfiniteFeed(pageSize = 30) {
  const [items, setItems] = useState<Pin[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef<number | undefined>(undefined);
  const inFlight = useRef(false); // a ref, not state: guards against double-fires within one render

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFeed(cursor.current, pageSize);
      setItems((prev) => mergeUnique(prev, page.items));
      cursor.current = page.next_cursor ?? undefined;
      setHasMore(page.next_cursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load pins.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void loadMore(); // first page (StrictMode's second run is ignored by inFlight)
  }, [loadMore]);

  return { items, hasMore, loading, error, loadMore };
}
