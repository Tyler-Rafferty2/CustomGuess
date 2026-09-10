import Link from "next/link";

export const metadata = {
  title: "About CustomGuess | Custom Guess Who Online",
  description:
    "CustomGuess is a free, browser-based version of the classic Guess Who game that lets you build your own character sets and play with friends in real time.",
  alternates: {
    canonical: "https://customguess.com/about",
  },
};

export default function AboutPage() {
  return (
    <main style={{
      maxWidth: 760,
      margin: "0 auto",
      padding: "var(--s8) var(--s5)",
      color: "var(--text-900)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <Link href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: "var(--text-sm)", color: "var(--text-400)",
        textDecoration: "none", marginBottom: "var(--s5)",
      }}>
        ← Back to home
      </Link>

      <h1 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: "var(--text-xl)",
        fontWeight: 700,
        marginBottom: "var(--s2)",
      }}>
        About CustomGuess
      </h1>
      <p style={{ color: "var(--text-400)", fontSize: "var(--text-sm)", marginBottom: "var(--s6)" }}>
        Not affiliated with Hasbro, Inc. or Guess Who®
      </p>

      <Section title="What CustomGuess Is">
        <p>CustomGuess is a free, browser-based take on the classic yes/no deduction game. Two players each pick a secret character from a shared board and take turns asking questions to figure out who the other one chose. It runs entirely in the browser over a real-time connection, so there&apos;s nothing to install and no account required to play.</p>
      </Section>

      <Section title="Why We Built It">
        <p>The classic version of this kind of game is fun, but you&apos;re stuck with whatever characters came in the box. We wanted a version where anyone could build a character set out of anything — a group of friends, a favorite TV cast, pets, coworkers — and challenge someone to figure it out. That flexibility is the whole point of CustomGuess: the game stays the same, but the board is always yours.</p>
      </Section>

      <Section title="How It Works">
        <p>Players create a lobby, choose or upload a character set, and get a short code to share. The other player joins instantly and the game runs live over WebSockets, so questions, answers, and eliminations show up in real time on both screens. See the full breakdown on the <Link href="/how-to-play" style={{ color: "var(--accent)" }}>How to Play</Link> page.</p>
      </Section>

      <Section title="Who It's For">
        <p>CustomGuess is built for quick games between friends, family game nights, and anyone who liked the original game as a kid and wants a version with unlimited replay value. Custom sets can be kept private for just your group, or shared publicly for anyone to play.</p>
      </Section>

      <p style={{ marginTop: "var(--s7)", fontSize: "var(--text-base)", color: "var(--text-600)" }}>
        Questions or feedback? <Link href="/contact" style={{ color: "var(--accent)" }}>Get in touch</Link>.
      </p>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "var(--s7)" }}>
      <h2 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: "var(--text-lg)",
        fontWeight: 600,
        marginBottom: "var(--s4)",
        paddingBottom: "var(--s2)",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-900)",
      }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", color: "var(--text-600)", lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}
