"use client";
import { apiFetch } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_PAGES, GALLERY_PAGE_SIZE } from "@/lib/gallery";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SetGrid from "@/components/SetGrid";
import CategoryLinks from "@/components/CategoryLinks";

const PAGE_SIZE = GALLERY_PAGE_SIZE;

// initialSets/initialTotal come from the server render (default sort, no
// filters), so the first paint — and what crawlers see — already has sets.
export default function GalleryPageClient({ initialSets = [], initialTotal = 0 }) {
  const hasInitial = initialSets.length > 0;
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("most-popular");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sets, setSets] = useState(initialSets);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!hasInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const categoriesInitialMount = useRef(true);
  const filtersInitialMount = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const load = async (pageToLoad, sort, search, categories, { append } = {}) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageToLoad, pageSize: PAGE_SIZE, sort });
      if (search) params.set("search", search);
      categories.forEach((c) => params.append("categories", c));
      const res = await apiFetch(`/player/set/public?${params}`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) return;
      // Page 1 may come from the cached server render while later pages are
      // live, so ordering can shift between them — drop sets already shown.
      setSets((prev) => {
        if (!append) return data.sets || [];
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...(data.sets || []).filter((s) => !seen.has(s.id))];
      });
      setTotal(data.total || 0);
      setPage(pageToLoad);
    } catch {
      // leave prior results in place
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the mount fetch when the server already rendered the default view.
    if (filtersInitialMount.current) {
      filtersInitialMount.current = false;
      if (hasInitial) return;
    }
    load(1, sortOrder, searchQuery, selectedCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder, searchQuery]);

  useEffect(() => {
    if (categoriesInitialMount.current) { categoriesInitialMount.current = false; return; }
    load(1, sortOrder, searchQuery, selectedCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories]);

  const hasMore = sets.length < total;
  const handleLoadMore = () => load(page + 1, sortOrder, searchQuery, selectedCategories, { append: true });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style>{`
        .gallery-chip {
          font-family: 'DM Sans', sans-serif; font-size: var(--text-xs); font-weight: 600;
          padding: 4px 10px; border-radius: var(--r); border: 1px solid var(--border);
          background: transparent; color: var(--text-600); cursor: pointer; white-space: nowrap;
        }
        .gallery-chip--active { background: var(--accent-light); border-color: var(--accent); color: var(--accent-dim); }
      `}</style>

      <Navbar />

      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "var(--s7) var(--s5)", width: "100%" }}>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontSize: "var(--text-xl)", fontWeight: 700,
          color: "var(--text-900)", marginBottom: "var(--s2)",
        }}>
          Browse Character Sets
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", marginBottom: "var(--s6)", lineHeight: 1.6 }}>
          Community-made Custom Guess Who boards, ready to play. Pick one to jump straight into a game, or browse for inspiration before building your own.
        </p>

        <div style={{ position: "relative", marginBottom: "var(--s4)", maxWidth: 360 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-400)" }} />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search sets…"
            style={{
              width: "100%", height: 40, padding: "0 12px 0 36px",
              background: "var(--surface-0)", border: "1px solid var(--border)",
              borderRadius: "var(--r)", color: "var(--text-900)",
              fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", marginBottom: "var(--s6)" }}>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              height: 32, borderRadius: "var(--r)", border: "1px solid var(--border)",
              background: "var(--surface-0)", color: "var(--text-600)", fontSize: "var(--text-sm)",
              fontFamily: "'DM Sans', sans-serif", padding: "0 8px",
            }}
          >
            <option value="most-popular">Most Played</option>
            <option value="most-liked">Most Liked</option>
            <option value="newest">Newest</option>
          </select>
          {CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                className={`gallery-chip${active ? " gallery-chip--active" : ""}`}
                aria-pressed={active}
                onClick={() => setSelectedCategories((prev) =>
                  prev.includes(cat.value) ? prev.filter((c) => c !== cat.value) : [...prev, cat.value]
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ color: "var(--text-400)", fontFamily: "'DM Sans', sans-serif" }}>Loading sets…</p>
        ) : sets.length === 0 ? (
          <p style={{ color: "var(--text-400)", fontFamily: "'DM Sans', sans-serif" }}>No sets found.</p>
        ) : (
          <SetGrid sets={sets} />
        )}

        {!loading && hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--s7)" }}>
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                height: 40, padding: "0 24px",
                background: "var(--surface-0)", border: "1px solid var(--border)",
                borderRadius: "var(--r)", color: "var(--text-600)",
                fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", fontWeight: 600,
                cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          </div>
        )}

        <section style={{ marginTop: "var(--s7)", paddingTop: "var(--s5)", borderTop: "1px solid var(--border)" }}>
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: "var(--text-lg)", fontWeight: 700,
            color: "var(--text-900)", marginBottom: "var(--s4)",
          }}>
            Browse by category
          </h2>
          <CategoryLinks categories={CATEGORY_PAGES} label="Browse by category" />
        </section>
      </main>

      <Footer />
    </div>
  );
}
