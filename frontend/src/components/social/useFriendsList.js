"use client";
import { useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { UserContext } from "@/context/UserContext";

const EMPTY = { friends: [], incoming: [], outgoing: [] };

// Fetches GET /friends for signed-up users. Returns { list, loading, refresh }.
export default function useFriendsList() {
    const { user } = useContext(UserContext);
    const [list, setList] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const enabled = !!user && !user.isGuest;

    const refresh = useCallback(async () => {
        if (!enabled) { setList(EMPTY); setLoading(false); return; }
        try {
            const res = await apiFetch("/friends");
            if (res.ok) setList(await res.json());
        } catch {
            // keep the last list
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => { refresh(); }, [refresh]);

    return { list, loading, refresh };
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
