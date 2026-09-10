import Link from "next/link";

export const metadata = {
  title: "How to Play Custom Guess Who Online | CustomGuess",
  description:
    "Learn the rules of Custom Guess Who: how to build a character set, ask yes/no questions, eliminate suspects, and win. Play free online with friends.",
  alternates: {
    canonical: "https://customguess.com/how-to-play",
  },
};

export default function HowToPlayPage() {
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
        How to Play Custom Guess Who Online
      </h1>
      <p style={{ color: "var(--text-600)", fontSize: "var(--text-base)", lineHeight: 1.7, marginBottom: "var(--s7)" }}>
        Custom Guess Who is a two-player deduction game. Each player secretly picks a character from a shared board, then takes turns asking yes/no questions to narrow down who the other player picked. The first to correctly name the opponent&apos;s character wins.
      </p>

      <Section title="1. Create or Join a Game">
        <p>One player creates a game and picks a character set — either the default set or a custom one built from your own photos and names. Creating a game gives you a short lobby code.</p>
        <p>The second player joins by entering that code, or by browsing public lobbies from the Lobbies page. No account or app download is required — you can play as a guest.</p>
      </Section>

      <Section title="2. Pick Your Secret Character">
        <p>Once both players are in the lobby, each of you privately selects one character from the board. This is the character your opponent has to guess. Your opponent cannot see which one you picked.</p>
      </Section>

      <Section title="3. Ask Yes/No Questions">
        <p>Players alternate turns asking a single yes/no question about the opponent&apos;s secret character — for example, &quot;Does your character wear glasses?&quot; or &quot;Is your character&apos;s hair brown?&quot;</p>
        <p>Based on the answer, you eliminate characters on your own board that don&apos;t match. A running question log keeps track of everything asked so far so you never lose your place.</p>
      </Section>

      <Section title="4. Eliminate and Deduce">
        <p>Good questions split the remaining characters roughly in half each time, so you can narrow the field quickly. Track which traits you&apos;ve already asked about to avoid wasting a turn on a question that won&apos;t eliminate anyone new.</p>
      </Section>

      <Section title="5. Make Your Final Guess">
        <p>Once you&apos;re confident, use your turn to guess your opponent&apos;s character directly instead of asking a question. A correct guess wins the game immediately. A wrong guess ends your turn, so only guess when you&apos;re sure.</p>
      </Section>

      <Section title="Tips for Winning">
        <ul style={{ paddingLeft: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
          <li>Ask broad questions early (hair color, accessories) to eliminate large groups at once.</li>
          <li>Save narrow questions (a specific name or an unusual feature) for when only a few characters remain.</li>
          <li>Watch the question log — re-asking something already covered wastes a turn.</li>
          <li>When playing a custom set, skim the board first so you know what traits are actually available to ask about.</li>
        </ul>
      </Section>

      <Section title="Building Your Own Character Set">
        <p>Anyone can create a custom character set from the Create page by uploading photos and naming each character. Custom sets can be shared publicly or kept private for a specific group of friends, making it easy to play with people, pets, or characters from a show you all know.</p>
      </Section>

      <p style={{ marginTop: "var(--s7)", fontSize: "var(--text-base)", color: "var(--text-600)" }}>
        Ready to play? <Link href="/create" style={{ color: "var(--accent)" }}>Create a game</Link> or <Link href="/lobby" style={{ color: "var(--accent)" }}>browse public lobbies</Link>.
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
