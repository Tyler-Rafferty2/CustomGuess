import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SERVER_API_URL } from "@/lib/api";
import { parseSetIdFromSlug, setGalleryPath } from "@/lib/slug";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SetCover from "@/components/SetCover";
import { CATEGORIES } from "@/lib/categories";
import { imgUrl } from "@/lib/imgUrl";
import PlaySetButton from "./PlaySetButton";

async function fetchSet(id) {
  const res = await fetch(`${SERVER_API_URL}/player/set/public/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

async function loadOrRedirect(slug) {
  const id = parseSetIdFromSlug(slug);
  if (!id) notFound();

  const set = await fetchSet(id);
  if (!set) notFound();

  const canonical = setGalleryPath(set.id, set.name);
  if (canonical !== `/gallery/${slug}`) {
    redirect(canonical);
  }
  return set;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const id = parseSetIdFromSlug(slug);
  if (!id) return {};
  const set = await fetchSet(id);
  if (!set) return {};

  const title = `Play ${set.name} — Custom Guess Who Online | CustomGuess`;
  const description = set.description
    ? `${set.description} Play this ${set.characterCount}-character Custom Guess Who board free online with a friend.`
    : `Play a free ${set.characterCount}-character Custom Guess Who board: ${set.name}. No download or account required.`;

  const thin = !set.description || set.characterCount < 4;

  return {
    title,
    description,
    alternates: { canonical: `https://customguess.com${setGalleryPath(set.id, set.name)}` },
    robots: thin ? { index: false, follow: true } : undefined,
  };
}

export default async function SetGalleryPage({ params }) {
  const { slug } = await params;
  const set = await loadOrRedirect(slug);

  const categoryLabels = (set.categories ?? [])
    .map((v) => CATEGORIES.find((c) => c.value === v)?.label)
    .filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 760, margin: "0 auto", padding: "var(--s7) var(--s5)", width: "100%" }}>
        <nav style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)", marginBottom: "var(--s5)" }}>
          <Link href="/" style={{ color: "var(--text-400)" }}>Home</Link>
          {" / "}
          <Link href="/gallery" style={{ color: "var(--text-400)" }}>Gallery</Link>
          {" / "}
          <span style={{ color: "var(--text-600)" }}>{set.name}</span>
        </nav>

        <div style={{ borderRadius: "var(--r)", overflow: "hidden", marginBottom: "var(--s5)" }}>
          <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 220 }} />
        </div>

        <h1 style={{
          fontFamily: "'Fraunces', serif", fontSize: "var(--text-xl)", fontWeight: 700,
          color: "var(--text-900)", marginBottom: "var(--s2)",
        }}>
          Play {set.name} — Custom Guess Who Online
        </h1>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: "var(--s3)",
          fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)",
          marginBottom: "var(--s5)",
        }}>
          <span>{set.characterCount} characters</span>
          <span>·</span>
          <span>2 players</span>
          <span>·</span>
          <span>Free online</span>
          <span>·</span>
          <span>{set.playCount} plays</span>
          {set.creator && (<><span>·</span><span>Created by {set.creator}</span></>)}
        </div>

        {categoryLabels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", marginBottom: "var(--s5)" }}>
            {categoryLabels.map((label) => (
              <span key={label} style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-xs)", fontWeight: 600,
                padding: "4px 10px", borderRadius: "var(--r)", border: "1px solid var(--border)",
                color: "var(--text-600)",
              }}>
                {label}
              </span>
            ))}
          </div>
        )}

        {set.description && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", lineHeight: 1.7, marginBottom: "var(--s6)" }}>
            {set.description}
          </p>
        )}

        <PlaySetButton set={set} />

        {(set.characters || []).length > 0 && (
          <Section title={`Characters in ${set.name}`}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
              gap: "var(--s3)",
            }}>
              {set.characters.map((char) => (
                <div key={char.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s1)" }}>
                  <img
                    src={imgUrl(char.image)}
                    alt={char.name}
                    loading="lazy"
                    style={{
                      width: "100%", aspectRatio: "1 / 1", objectFit: "cover",
                      borderRadius: "var(--r)", border: "1px solid var(--border)",
                      background: "var(--surface-1)",
                    }}
                  />
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-xs)",
                    color: "var(--text-600)", textAlign: "center",
                  }}>
                    {char.name}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={`How to Play ${set.name}`}>
          <p>Create a game with the {set.name} board and share the lobby code with a friend. Each of you secretly picks one of the {set.characterCount} characters, then takes turns asking yes/no questions to figure out the other&apos;s pick — eliminating characters on your own board as you go. First to correctly name the opponent&apos;s character wins.</p>
        </Section>

        <Section title="Good Opening Questions">
          <ul style={{ paddingLeft: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            <li>Start broad — ask about a visual trait most characters either have or don&apos;t (hair color, an accessory, a color scheme) to eliminate a large group at once.</li>
            <li>Avoid asking about a single named character early; save specific guesses for when only a few remain.</li>
            <li>Keep track of what you&apos;ve already asked in the question log so you don&apos;t waste a turn repeating ground you&apos;ve covered.</li>
          </ul>
        </Section>

        <Section title="FAQ">
          <FaqItem q={`Is ${set.name} free to play?`}>
            Yes. CustomGuess is free, with no account or download required — you can join and play as a guest.
          </FaqItem>
          <FaqItem q="How many players can join?">
            This is a two-player game. One player creates the lobby and shares a short code with the other.
          </FaqItem>
          <FaqItem q="Can I use my own characters instead?">
            Yes — anyone can build a custom character set from their own photos on the <Link href="/create" style={{ color: "var(--accent)" }}>Create</Link> page, and share it publicly or keep it private.
          </FaqItem>
        </Section>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)" }}>
          <Link href="/gallery" style={{ color: "var(--accent)" }}>← Browse more character sets</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "var(--s7)" }}>
      <h2 style={{
        fontFamily: "'Fraunces', serif", fontSize: "var(--text-lg)", fontWeight: 600,
        marginBottom: "var(--s4)", paddingBottom: "var(--s2)",
        borderBottom: "1px solid var(--border)", color: "var(--text-900)",
      }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", color: "var(--text-600)", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)" }}>
        {children}
      </div>
    </section>
  );
}

function FaqItem({ q, children }) {
  return (
    <div>
      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-900)", marginBottom: "var(--s1)" }}>
        {q}
      </h3>
      <p>{children}</p>
    </div>
  );
}
