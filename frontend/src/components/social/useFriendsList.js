"use client";
import { apiFetch } from "@/lib/api";
import { usePresence } from "@/context/PresenceContext";

// Friends list with live presence, shared through PresenceProvider.
// Returns { list, loading, refresh }.
export default function useFriendsList() {
    const { friends, loading, refreshFriends } = usePresence();
    return { list: friends, loading, refresh: refreshFriends };
}

// Calls a friend endpoint and returns an error message, or null on success.
export async function friendAction(path, method, body) {
    try {
        const res = await apiFetch(path, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.ok) return null;
        if (res.status === 404) return body?.username ? "No player with that username." : "That request is no longer pending.";
        if (res.status === 429) return "You can send another request later.";
        if (res.status === 400) return "You can't add yourself.";
        return "Something went wrong.";
    } catch {
        return "Network error.";
    }
}
