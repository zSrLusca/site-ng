import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Banner } from "../../types";
import { assetUrl } from "../../api";

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % banners.length), 7000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;
  const b = banners[i];

  return (
    <section className="hero">
      {b.image ? <img src={assetUrl(b.image)} alt={b.title} /> : <div className="hero-art" />}
      <div className="hero-copy">
        <h2>{b.title}</h2>
        {b.description && <p>{b.description}</p>}
        {b.buttonText && b.buttonUrl && (
          <Link to={b.buttonUrl} className="btn btn-neon">{b.buttonText}</Link>
        )}
      </div>
      {banners.length > 1 && (
        <div className="hero-dots">
          {banners.map((x, idx) => (
            <button key={x.id} className={idx === i ? "on" : ""} onClick={() => setI(idx)} />
          ))}
        </div>
      )}
    </section>
  );
}
