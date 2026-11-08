import { SERVER_API_URL } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

// Page size for the /gallery hub. Shared by the server render and the client
// "Load More" pagination so page offsets line up.
export const GALLERY_PAGE_SIZE = 12;

// Server-side fetch of public sets for crawlable pages (gallery hub, category
// pages, homepage). Cached for 10 minutes so crawls don't hammer the backend.
// Never throws: on failure returns { ok: false, sets: [], total: 0 } so callers
// can tell "backend unreachable" apart from "genuinely empty".
export async function fetchPublicSets({ page = 1, pageSize = 12, sort = "most-popular", categories = [] } = {}) {
  try {
    const params = new URLSearchParams({ page, pageSize, sort });
    categories.forEach((c) => params.append("categories", c));
    const res = await fetch(`${SERVER_API_URL}/player/set/public?${params}`, { next: { revalidate: 600 } });
    if (!res.ok) return { ok: false, sets: [], total: 0 };
    const data = await res.json();
    return { ok: true, sets: data.sets || [], total: data.total || 0 };
  } catch {
    return { ok: false, sets: [], total: 0 };
  }
}

// The single noindex rule for set pages (/gallery/[slug], the sitemap, and
// category indexability): sets without a description or with too few
// characters are thin pages and stay out of the index.
export function isIndexableSet(set) {
  return Boolean(set.description) && set.characterCount >= 4;
}

// Category pages show this many sets and are noindexed below the minimum.
// Shared by the page and the sitemap so both agree on what's indexable.
export const CATEGORY_SETS_PER_PAGE = 48;
export const CATEGORY_MIN_INDEXABLE_SETS = 3;

// `indexable` is only meaningful when `ok` is true — a failed fetch must never
// be mistaken for a thin category (that would noindex every category page).
export async function fetchCategorySets(cat) {
  const result = await fetchPublicSets({ pageSize: CATEGORY_SETS_PER_PAGE, categories: [cat.value] });
  return { ...result, indexable: result.sets.filter(isIndexableSet).length >= CATEGORY_MIN_INDEXABLE_SETS };
}

export function categoryPath(slug) {
  return `/gallery/category/${slug}`;
}

// Landing pages for each gallery category. `value` matches the backend
// category stored on sets (see lib/categories.js). Copy is hand-written per
// category so each page carries unique content, not a filled-in template.
const CATEGORY_PAGE_COPY = [
  {
    slug: "anime",
    value: "anime",
    title: "Anime Guess Who Boards — Play Free Online",
    heading: "Anime Guess Who",
    description:
      "Play anime Guess Who online with a friend. Community boards for shōnen heroes, villains, and fan favorites — free, no download.",
    intro: [
      "Anime casts are made for Guess Who. Character designs lean on bold hair colors, signature outfits, and recognizable accessories, which gives you plenty of clean yes/no splits to work with.",
      "The boards below are built by the CustomGuess community — from single-series casts to crossover lineups of favorites across shows. Pick one, send the lobby code to a friend, and see who knows the series better.",
    ],
    tips: [
      "Hair color is the strongest opener on most anime boards — it often splits the cast close to half.",
      "Ask about affiliation (\"Are they a villain?\", \"Are they in the main team?\") once visual traits stop narrowing things down.",
      "On crossover boards, \"Are they from the same series as…\" style questions can wipe out a whole show at once.",
    ],
  },
  {
    slug: "movies-tv",
    value: "movies_tv",
    title: "Movie & TV Guess Who Boards — Play Free Online",
    heading: "Movies & TV Guess Who",
    description:
      "Play Guess Who with characters from movies and TV shows. Superhero casts, sitcoms, and franchises — free online, two players.",
    intro: [
      "Movie and TV boards turn a franchise you both know into a head-to-head game. Superhero rosters, long-running sitcoms, and blockbuster series all work well because both players already know the characters' backstories.",
      "That shared knowledge opens up questions beyond looks. You can ask about plot, allegiances, or who survives to the end — as long as you both agree on the answer.",
    ],
    tips: [
      "Agree on spoiler rules before you start if one of you hasn't finished the series.",
      "Plot questions (\"Did they appear in the first film?\") work well once appearance questions run dry.",
      "On superhero boards, \"Do they have powers?\" and \"Do they wear a mask?\" are reliable early splits.",
    ],
  },
  {
    slug: "cartoons",
    value: "cartoons",
    title: "Cartoon Guess Who Boards — Play Free Online",
    heading: "Cartoon Guess Who",
    description:
      "Play cartoon Guess Who online — classic and modern animated characters on community-made boards. Free, no account needed.",
    intro: [
      "Cartoon characters are some of the easiest to play with: simple, distinctive designs and strong color palettes mean every question gives a clear answer.",
      "These boards are a good pick for playing with younger players or anyone new to Guess Who, since nobody needs deep lore knowledge to ask good questions.",
    ],
    tips: [
      "Ask whether the character is an animal or a person — on mixed cartoon boards it often eliminates a large group.",
      "Main color is a strong question here because cartoon designs tend to use one dominant color.",
      "Ask which show they're from only after the easy visual splits are used up.",
    ],
  },
  {
    slug: "video-games",
    value: "video_games",
    title: "Video Game Guess Who Boards — Play Free Online",
    heading: "Video Game Guess Who",
    description:
      "Play video game Guess Who online: Minecraft mobs, fighting game rosters, RPG parties and more. Free two-player boards.",
    intro: [
      "Video game boards cover everything from Minecraft mobs to full fighting-game rosters. Game characters are designed to be readable at a glance, which makes them natural Guess Who material.",
      "Many of these boards are large, so expect longer games and more strategy — the player who asks the most balanced questions usually wins.",
    ],
    tips: [
      "On mob or creature boards, \"Is it hostile?\" is a classic first question.",
      "For roster boards, ask about weapons or fighting style before asking about looks.",
      "Big boards reward patience: aim for questions that split the remaining characters roughly in half.",
    ],
  },
  {
    slug: "sports",
    value: "sports",
    title: "Sports Guess Who Boards — Play Free Online",
    heading: "Sports Guess Who",
    description:
      "Play sports Guess Who online with athletes, teams, and legends. Community boards for football, basketball, soccer and more.",
    intro: [
      "Sports boards test how well you really know the players. Athletes are harder to tell apart by appearance alone, so the best questions mix looks with stats, teams, and positions.",
      "Use them for a quick game with a friend who follows the same league, or as a trivia challenge for a fan who thinks they know everyone.",
    ],
    tips: [
      "Position or role (\"Are they a forward?\") is usually a better opener than appearance.",
      "Ask about teams or countries to remove whole groups in one turn.",
      "Agree whether questions are about current or career stats before you start.",
    ],
  },
  {
    slug: "music",
    value: "music",
    title: "Music Guess Who Boards — Play Free Online",
    heading: "Music Guess Who",
    description:
      "Play music Guess Who online — singers, bands, rappers, and K-pop idols on community-made boards. Free and instant.",
    intro: [
      "Music boards put artists, band members, and idols up against each other. They're a favorite for fan groups who know every member of a lineup.",
      "Along with looks, you can ask about genre, decade, or group — if your friend knows the scene as well as you do.",
    ],
    tips: [
      "Genre or group membership is a quick way to split mixed-artist boards.",
      "On single-group boards, ask about role (\"Are they a vocalist?\") or hair color, since members often share a style.",
      "Debut decade works well on boards that span several eras.",
    ],
  },
  {
    slug: "celebrities",
    value: "celebrities",
    title: "Celebrity Guess Who Boards — Play Free Online",
    heading: "Celebrity Guess Who",
    description:
      "Play celebrity Guess Who online with actors, creators, and famous faces. Free two-player boards made by the community.",
    intro: [
      "Celebrity boards are classic Guess Who with real faces. They're good for groups of friends who follow the same creators, actors, or internet personalities.",
      "Because the characters are real people, questions about career and fame work alongside the usual appearance questions.",
    ],
    tips: [
      "Ask about what they're known for (acting, music, streaming) to split broad boards.",
      "Glasses, facial hair, and hair length are dependable visual questions.",
      "Save questions about specific roles or projects for the late game.",
    ],
  },
  {
    slug: "fictional-characters",
    value: "fictional_characters",
    title: "Fictional Character Guess Who Boards — Play Free Online",
    heading: "Fictional Character Guess Who",
    description:
      "Play Guess Who online with fictional characters from books, comics, and original universes. Free community boards.",
    intro: [
      "This category covers characters from books, comics, games, and original worlds that don't fit neatly into one franchise — including boards made by creators for their own stories.",
      "Mixed boards like these reward flexible thinking: there's rarely one trait that splits everything, so you'll need to combine appearance, personality, and origin questions.",
    ],
    tips: [
      "Ask whether the character is human early — fictional boards often mix humans, creatures, and robots.",
      "Origin questions (\"Are they from a book?\") can clear out whole groups.",
      "Agree on edge cases before you start, like whether a shapeshifter counts as human.",
    ],
  },
];

// Labels come from lib/categories.js so filter chips and landing pages never
// disagree. Copy for a value missing from CATEGORIES is dropped.
export const CATEGORY_PAGES = CATEGORY_PAGE_COPY
  .map((page) => ({ ...page, label: CATEGORIES.find((c) => c.value === page.value)?.label }))
  .filter((page) => page.label);

export function findCategoryPage(slug) {
  return CATEGORY_PAGES.find((c) => c.slug === slug) || null;
}

export function categoryPageForValue(value) {
  return CATEGORY_PAGES.find((c) => c.value === value) || null;
}
