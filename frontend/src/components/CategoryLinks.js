import Link from "next/link";
import { categoryPath } from "@/lib/gallery";

// Row of links to /gallery/category/[slug] landing pages. Server-renderable,
// so crawlers can follow every link. 44px min-height for touch targets.
export default function CategoryLinks({ categories, label = "Categories" }) {
  if (!categories.length) return null;
  return (
    <>
      <style>{`
        .category-links { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--s2); }
        .category-links__link {
          display: inline-flex; align-items: center; min-height: 44px; padding: 0 var(--s4);
          font-family: 'DM Sans', sans-serif; font-size: var(--text-sm); font-weight: 600;
          color: var(--text-600); text-decoration: none;
          border: 1px solid var(--border); border-radius: var(--r); background: var(--surface-0);
          transition: border-color 150ms, color 150ms;
        }
        .category-links__link:hover { border-color: var(--border-strong); color: var(--text-900); }
        .category-links__link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .category-links__link { transition: none; } }
      `}</style>
      <ul className="category-links" aria-label={label}>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={categoryPath(c.slug)} className="category-links__link">{c.label}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
