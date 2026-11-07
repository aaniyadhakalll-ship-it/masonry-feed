import { memo, useState } from "react";
import type { Placed } from "../layout";
import type { Pin } from "../types";

interface Props {
  placed: Placed<Pin>;
  captionHeight: number;
  eager: boolean;
}

export const PinCard = memo(function PinCard({ placed, captionHeight, eager }: Props) {
  const { item: pin, x, y, w, h } = placed;
  const [loaded, setLoaded] = useState(false);
  return (
    <article className="pin" style={{ width: w, height: h, transform: `translate3d(${x}px, ${y}px, 0)` }}>
      <div className="pin-media" style={{ height: h - captionHeight, ["--hue" as string]: (pin.id * 47) % 360 }}>
        <img
          src={pin.image_url}
          alt={pin.title}
          width={pin.width}
          height={pin.height}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className={loaded ? "loaded" : undefined}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <h2 className="pin-title" style={{ height: captionHeight }}>{pin.title}</h2>
    </article>
  );
});
