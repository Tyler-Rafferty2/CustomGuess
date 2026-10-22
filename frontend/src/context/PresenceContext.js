"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, WS_URL } from "@/lib/api";
import { UserContext } from "@/context/UserContext";
import InvitePopup from "@/components/social/InvitePopup";

export const PresenceContext = createContext(null);

const EMPTY_LIST = { friends: [], incoming: [], outgoing: [] };
const MAX_BACKOFF_MS = 30000;

// Holds the site-wide socket for signed-up users: friends + live presence,
// incoming invite popups, and outcomes of invites this user sent.
export function PresenceProvider({ children }) {
    const { user } = useContext(UserContext);
    const enabled = !!user && !user.isGuest;

    const [friends, setFriends] = useState(EMPTY_LIST);
    const [loading, setLoading] = useState(true);
    const [incomingInvite, setIncomingInvite] = useState(null);
    // inviteId → "accepted" | "declined" | "expired", for invites this user sent.
    const [inviteResults, setInviteResults] = useState({});

    const refreshFriends = useCallback(async () => {
        if (!enabled) { setFriends(EMPTY_LIST); setLoading(false); return; }
        try {
            const res = await apiFetch("/friends");
            if (res.ok) setFriends(await res.json());
        } catch {
            // keep the last list
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    const handleEvent = useCallback((ev) => {
        switch (ev.type) {
            case "presence":
                setFriends((list) => ({
                    ...list,
                    friends: list.friends.map((f) => (f.id === ev.data.userId ? { ...f, status: ev.data.status } : f)),
                }));
                break;
            case "friends_changed":
                refreshFriends();
                break;
            case "invite_received":
                setIncomingInvite(ev.data);
                break;
            case "invite_resolved":
                setInviteResults((r) => ({ ...r, [ev.data.inviteId]: ev.data.outcome }));
                setIncomingInvite((cur) => (cur && cur.id === ev.data.inviteId ? null : cur));
                break;
            default:
        }
    }, [refreshFriends]);

    const handleEventRef = useRef(handleEvent);
    useEffect(() => { handleEventRef.current = handleEvent; }, [handleEvent]);

    useEffect(() => {
        if (!enabled) {
            setFriends(EMPTY_LIST);
            setIncomingInvite(null);
            setLoading(false);
            return;
        }
        let socket = null;
        let retryTimer = null;
        let backoff = 1000;
        let closed = false;

        const connect = () => {
            socket = new WebSocket(`${WS_URL}/presence/ws`);
            socket.onopen = () => {
                backoff = 1000;
                refreshFriends();
            };
            socket.onmessage = (msg) => {
                try { handleEventRef.current(JSON.parse(msg.data)); } catch { /* ignore malformed */ }
            };
            socket.onclose = () => {
                if (closed) return;
                retryTimer = setTimeout(connect, backoff);
                backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
            };
        };

        refreshFriends();
        connect();
        return () => {
            closed = true;
            clearTimeout(retryTimer);
            socket?.close();
        };
    }, [enabled, user?.id, refreshFriends]);

    const dismissInvite = useCallback(() => setIncomingInvite(null), []);

    const statusOf = useCallback(
        (userId) => friends.friends.find((f) => f.id === userId)?.status ?? null,
        [friends],
    );

    return (
        <PresenceContext.Provider value={{ friends, loading, refreshFriends, statusOf, inviteResults }}>
            {children}
            {incomingInvite && (
                <InvitePopup invite={incomingInvite} onDone={dismissInvite} />
            )}
        </PresenceContext.Provider>
    );
}

export function usePresence() {
    return useContext(PresenceContext);
}
