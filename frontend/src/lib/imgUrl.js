export function imgUrl(path) {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://localhost:8080${path}`;
}
