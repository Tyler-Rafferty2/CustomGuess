import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SetGrid from "@/components/SetGrid";
import CategoryLinks from "@/components/CategoryLinks";
import { CATEGORY_PAGES, categoryPath, fetchCategorySets, findCategoryPage } from "@/lib/gallery";

const BASE = "https://customguess.com";

// Throwing on a failed fetch (instead of rendering an empty, noindexed page)
// means ISR keeps serving the last good version while the backend is down.
// No generateStaticParams: pages render on first request, so a backend outage
// during a deploy can't fail the build.
async function loadCategorySets(cat) {
  const result = await fetchCategorySets(cat);
  if (!result.ok) throw new Error(`Failed to load sets for category ${cat.slug}`);
  return result;
}

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cat = findCategoryPage(category);
  if (!cat) return {};

  const { indexable } = await loadCategorySets(cat);

  return {
    title: { absolute: `${cat.title} | CustomGuess` },
    description: cat.description,
    alternates: { canonical: `${BASE}${categoryPath(cat.slug)}` },
    robots: !indexable ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  const cat = findCategoryPage(category);
  if (!cat) notFound();

  const { sets, total } = await loadCategorySets(cat);
  const otherCategories = CATEGORY_PAGES.filter((c) => c.slug !== cat.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Gallery", item: `${BASE}/gallery` },
      { "@type": "ListItem", position: 3, name: cat.label, item: `${BASE}${categoryPath(cat.slug)}` },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "var(--s7) var(--s5)", width: "100%" }}>
        <nav aria-label="Breadcrumb" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)", marginBottom: "var(--s5)" }}>
          <Link href="/" style={{ color: "var(--text-400)" }}>Home</Link>
          {" / "}
          <Link href="/gallery" style={{ color: "var(--text-400)" }}>Gallery</Link>
          {" / "}
          <span style={{ color: "var(--text-600)" }}>{cat.label}</span>
        </nav>

        <h1 style={{
          fontFamily: "'Fraunces', serif", fontSize: "var(--text-xl)", fontWeight: 700,
          color: "var(--text-900)", marginBottom: "var(--s4)", letterSpacing: "-0.02em",
        }}>
          {cat.heading}
        </h1>

        <div style={{ maxWidth: 720, marginBottom: "var(--s7)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
          {cat.intro.map((p, i) => (
            <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", lineHeight: 1.7, margin: 0 }}>
              {p}
            </p>
          ))}
        </div>

        <Section title={`${cat.label} boards`}>
          {sets.length > 0 ? (
            <>
              <SetGrid sets={sets} headingLevel="h3" />
              {total > sets.length && (
                <p style={{ marginTop: "var(--s5)" }}>
                  Showing the {sets.length} most-played of {total} {cat.label.toLowerCase()} boards.{" "}
                  <Link href="/gallery" style={{ color: "var(--accent)" }}>Browse every set in the gallery →</Link>
                </p>
              )}
            </>
          ) : (
            <p>
              No public {cat.label.toLowerCase()} boards yet.{" "}
              <Link href="/set/new" style={{ color: "var(--accent)" }}>Create the first one →</Link>
            </p>
          )}
        </Section>

        <div style={{ maxWidth: 720 }}>
          <Section title={`Tips for ${cat.label.toLowerCase()} boards`}>
            <ul style={{ paddingLeft: "var(--s5)", margin: 0, display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
              {cat.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </Section>

          <Section title="How to start a game">
            <p style={{ margin: 0 }}>
              Open any board above and press Play. You&apos;ll get a lobby code to send to a friend — once they join, you each
              secretly pick a character and take turns asking yes/no questions. It&apos;s free, runs in the browser, and
              doesn&apos;t need an account. New to the game? Read the <Link href="/how-to-play" style={{ color: "var(--accent)" }}>full rules and strategy guide</Link>.
            </p>
          </Section>

          <Section title="More categories">
            <CategoryLinks categories={otherCategories} label="More categories" />
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "var(--s7)" }}>
      <h2 style={{
        fontFamily: "'Fraunces', serif", fontSize: "var(--text-lg)", fontWeight: 700,
        marginBottom: "var(--s4)", paddingBottom: "var(--s2)",
        borderBottom: "1px solid var(--border)", color: "var(--text-900)",
      }}>
        {title}
      </h2>
      <div style={{ color: "var(--text-600)", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)" }}>
        {children}
      </div>
    </section>
  );
}
