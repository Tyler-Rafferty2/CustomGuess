export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const WS_URL = API_URL.replace(/^http/, 'ws');
