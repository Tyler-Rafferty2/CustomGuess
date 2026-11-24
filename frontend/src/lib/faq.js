// Homepage FAQ. Rendered visibly on the homepage AND emitted as FAQPage
// JSON-LD from app/page.js — keep one source so the markup always matches
// what users can see (Google ignores/penalizes FAQ schema with hidden answers).
export const HOME_FAQ = [
  {
    q: "How do I play Guess Who online with a friend?",
    a: "Create a game, pick a character set, and send your friend the game code or link. You each choose a secret character, then take turns asking yes/no questions until someone guesses right. It's free, 2-player, and runs in real time in your browser.",
  },
  {
    q: "How do I make my own Guess Who board?",
    a: "Sign in with a free account, start a new character set, and upload photos of anyone you like: friends, family, celebrities, or characters from your favorite show or game. Name each character, save the set, and use it in any game you create.",
  },
  {
    q: "Is CustomGuess free?",
    a: "Yes, CustomGuess is completely free. There's nothing to download and no payment to play or to make your own Guess Who sets.",
  },
  {
    q: "Do I need an account to play?",
    a: "No. You can join or host a game as a guest instantly. A free account is only needed to create and save your own custom character sets.",
  },
];

export const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};
