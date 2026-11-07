import { useCallback, useState } from "react";
import { Masonry } from "./components/Masonry";
import { useInfiniteFeed } from "./hooks/useInfiniteFeed";

// ?mode=naive renders everything with no lazy loading, for the "before" Lighthouse run.
const optimized = new URLSearchParams(window.location.search).get("mode") !== "naive";

export default function App() {
  const { items, hasMore, loading, error, loadMore } = useInfiniteFeed(30);
  const [stats, setStats] = useState({ rendered: 0, total: 0 });
  const onStats = useCallback((rendered: number, total: number) => setStats({ rendered, total }), []);

  return (
    <>
      <header className="bar">
        <h1>Pins</h1>
        <p className="stats" aria-live="off">
          {stats.total > 0 ? `${stats.rendered} of ${stats.total} pins in the DOM` : ""}
        </p>
      </header>
      <main>
        {items.length === 0 && !loading && !error && <p className="note">No pins yet. Create some with POST /pins, or run the seed script.</p>}
        <Masonry items={items} canLoadMore={hasMore && !loading && !error} onEndReached={loadMore} optimized={optimized} onStats={onStats} />
        {loading && <p className="note" role="status">Loading pins…</p>}
        {error && (
          <p className="note" role="alert">
            {error} <button onClick={() => void loadMore()}>Try again</button>
          </p>
        )}
        {!hasMore && items.length > 0 && <p className="note">You've reached the end.</p>}
      </main>
    </>
  );
}
