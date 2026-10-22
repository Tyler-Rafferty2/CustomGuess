"use client";
import Link from "next/link";
import { setGalleryPath } from "@/lib/slug";
import SetCover from "@/components/SetCover";

const SET_GRID_STYLES = `
  .sg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s3); }
  .sg-card { display: block; border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; background: var(--surface-0);
    text-decoration: none; color: inherit; transition: border-color 150ms cubic-bezier(0,0,0.2,1); }
  .sg-card:hover { border-color: var(--border-strong); }
  .sg-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (max-width: 768px) { .sg-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 480px) { .sg-grid { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .sg-card { transition: none; } }
`;

// Grid of set cards linking to each set's gallery page. showCreator adds "by X" to each card.
export default function SetGrid({ sets, showCreator = false }) {
    return (
        <div className="sg-grid">
            <style>{SET_GRID_STYLES}</style>
            {sets.map((set) => (
                <Link key={set.id} href={setGalleryPath(set.id, set.name)} className="sg-card">
                    <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 120 }} />
                    <div style={{ padding: "var(--s3)" }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {set.name}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                            {showCreator && set.creator ? `by ${set.creator} · ` : ""}{set.playCount.toLocaleString()} plays · {set.likeCount} likes
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
