const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/g, "");
}

// Builds the canonical /gallery/[slug] path for a set.
export function setGalleryPath(id, name) {
    const base = slugify(name);
    return `/gallery/${base ? `${base}-${id}` : id}`;
}

// Extracts the set id (a UUID) from a /gallery/[slug] route param.
// The human-readable prefix is decorative and never trusted for lookups.
export function parseSetIdFromSlug(slugParam) {
    const match = UUID_RE.exec(slugParam || "");
    return match ? match[0] : null;
}
