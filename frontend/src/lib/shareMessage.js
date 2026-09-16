import { setGalleryPath } from "./slug";

const FALLBACK_MESSAGE =
    "I just played CustomGuess — a free online Guess Who you can build with your own characters. Come play!";

export function buildGameShareContent({ characterSet, isWinner, questionCount, siteOrigin }) {
    if (!characterSet?.public) {
        return { url: siteOrigin, message: FALLBACK_MESSAGE, isFallback: true };
    }

    const url = `${siteOrigin}${setGalleryPath(characterSet.id, characterSet.name)}`;
    const verb = isWinner ? "won" : "played";
    const questionPart = questionCount ? ` in ${questionCount} questions` : "";
    const message = `I just ${verb} a game of ${characterSet.name} on CustomGuess${questionPart} — think you can guess who I am?`;

    return { url, message, isFallback: false };
}

export function buildGalleryShareContent({ set, siteOrigin }) {
    const url = `${siteOrigin}${setGalleryPath(set.id, set.name)}`;
    const message = `Check out ${set.name} on CustomGuess — a free online Guess Who board.`;

    return { url, message, isFallback: false };
}
