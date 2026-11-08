import Link from "next/link";
import { Heart } from "lucide-react";
import SetCover from "@/components/SetCover";
import { setGalleryPath } from "@/lib/slug";

// Grid of public set cards. No client hooks, so it renders on the server —
// every card is a real <a href> that crawlers can follow.
export default function SetGrid({ sets, headingLevel = "h2" }) {
  const Heading = headingLevel;
  return (
    <>
      <style>{`
        .set-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--s5);
        }
        .set-card {
          background: var(--surface-0);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          transition: border-color 150ms, transform 150ms;
        }
        .set-card:hover { border-color: var(--border-strong); transform: translateY(-2px); }
        .set-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .set-card__body { padding: var(--s4); display: flex; flex-direction: column; gap: var(--s2); flex: 1; }
        .set-card__name { font-family: 'Fraunces', serif; font-size: var(--text-lg); font-weight: 700; color: var(--text-900); margin: 0; }
        .set-card__desc {
          font-family: 'DM Sans', sans-serif; font-size: var(--text-sm); color: var(--text-600);
          margin: 0; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .set-card__meta {
          display: flex; align-items: center; gap: var(--s3); margin-top: auto;
          font-size: var(--text-xs); color: var(--text-400); font-family: 'DM Sans', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .set-card { transition: none; }
          .set-card:hover { transform: none; }
        }
      `}</style>
      <div className="set-grid">
        {sets.map((set) => (
          <Link key={set.id} href={setGalleryPath(set.id, set.name)} className="set-card">
            <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 140 }} />
            <div className="set-card__body">
              <Heading className="set-card__name">{set.name}</Heading>
              {set.description && <p className="set-card__desc">{set.description}</p>}
              <div className="set-card__meta">
                <span>{set.characterCount} characters</span>
                <span>·</span>
                <span>{set.playCount} plays</span>
                <span>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Heart size={11} aria-hidden="true" /> {set.likeCount}
                  <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>likes</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
