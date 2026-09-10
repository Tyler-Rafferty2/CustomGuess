"use client";
import { apiFetch } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { setGalleryPath } from "@/lib/slug";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Heart } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SetCover from "@/components/SetCover";

const PAGE_SIZE = 12;

export default function GalleryPageClient() {
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("most-popular");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sets, setSets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const categoriesInitialMount = useRef(true);

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
      setSets((prev) => (append ? [...prev, ...(data.sets || [])] : (data.sets || [])));
      setTotal(data.total || 0);
      setPage(pageToLoad);
    } catch {
      // leave prior results in place
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  };

  useEffect(() => {
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
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--s5);
        }
        .gallery-card {
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
        .gallery-card:hover { border-color: var(--border-strong); transform: translateY(-2px); }
        .gallery-card__body { padding: var(--s4); display: flex; flex-direction: column; gap: var(--s2); flex: 1; }
        .gallery-card__name { font-family: 'Fraunces', serif; font-size: var(--text-lg); font-weight: 700; color: var(--text-900); margin: 0; }
        .gallery-card__desc {
          font-family: 'DM Sans', sans-serif; font-size: var(--text-sm); color: var(--text-600);
          margin: 0; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .gallery-card__meta { display: flex; align-items: center; gap: var(--s3); font-size: var(--text-xs); color: var(--text-400); font-family: 'DM Sans', sans-serif; margin-top: auto; }
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
          <div className="gallery-grid">
            {sets.map((set) => (
              <Link key={set.id} href={setGalleryPath(set.id, set.name)} className="gallery-card">
                <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 140 }} />
                <div className="gallery-card__body">
                  <h2 className="gallery-card__name">{set.name}</h2>
                  {set.description && <p className="gallery-card__desc">{set.description}</p>}
                  <div className="gallery-card__meta">
                    <span>{set.characterCount} characters</span>
                    <span>·</span>
                    <span>{set.playCount} plays</span>
                    <span>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Heart size={11} /> {set.likeCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
      </main>

      <Footer />
    </div>
  );
}
