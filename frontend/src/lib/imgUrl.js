import { API_URL } from './api';
export function imgUrl(path) {
    if (!path) return null;
    return path.startsWith("http") ? path : `${API_URL}${path}`;
}
