"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePresence } from "@/context/PresenceContext";
import FriendRow from "./FriendRow";
import { SOCIAL_STYLES } from "./socialStyles";

const SEND_ERRORS = {
    400: "Can't invite to this lobby",
    403: "Not friends anymore",
    409: "Not available right now",
    429: "Slow down a moment",
};

const secondsUntil = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));

// Shown to the lobby creator while waiting for a second player: online friends
// with Invite buttons. Also sends the invite requested by /create?invite=<friendId>.
export default function LobbyInvitePanel({ lobbyId }) {
    const { friends, loading, inviteResults } = usePresence();
    // friendId → { invite } | { error }
    const [sent, setSent] = useState({});
    const [, setTick] = useState(0);
    const autoInviteDone = useRef(false);

    const send = async (friendId) => {
        setSent((s) => ({ ...s, [friendId]: { sending: true } }));
        try {
            const res = await apiFetch("/invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toUserId: friendId, lobbyId }),
            });
            if (!res.ok) {
                setSent((s) => ({ ...s, [friendId]: { error: SEND_ERRORS[res.status] || "Couldn't send invite" } }));
                return;
            }
            const invite = await res.json();
            setSent((s) => ({ ...s, [friendId]: { invite } }));
        } catch {
            setSent((s) => ({ ...s, [friendId]: { error: "Network error" } }));
        }
    };

    // Tick once a second while any invite is pending so countdowns update.
    const anyPending = Object.values(sent).some((e) => e.invite && !inviteResults[e.invite.id]);
    useEffect(() => {
        if (!anyPending) return;
        const timer = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(timer);
    }, [anyPending]);

    // /create?invite=<id> lands here; send that invite once, then drop the param.
    useEffect(() => {
        if (autoInviteDone.current || loading) return;
        const params = new URLSearchParams(window.location.search);
        const target = params.get("invite");
        if (!target) return;
        autoInviteDone.current = true;
        params.delete("invite");
        const query = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
        send(target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    const shown = friends.friends.filter((f) => f.status !== "offline" || sent[f.id]);

    const rowState = (f) => {
        const entry = sent[f.id];
        if (!entry) {
            return f.status === "online"
                ? <button className="sb-btn sb-btn--primary sb-btn--small" onClick={() => send(f.id)} aria-label={`Invite ${f.username}`}><Send size={13} /> Invite</button>
                : null;
        }
        if (entry.sending) return <span className="sb-status">Sending…</span>;
        if (entry.error) return <span className="sb-status" style={{ color: "var(--state-out)" }}>{entry.error}</span>;
        const outcome = inviteResults[entry.invite.id];
        if (outcome === "accepted") return <span className="sb-status">Joining…</span>;
        if (outcome === "declined" || outcome === "expired") {
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)" }}>
                    <span className="sb-status">{outcome === "declined" ? "Declined" : "Expired"}</span>
                    {f.status === "online" && (
                        <button className="sb-btn sb-btn--ghost sb-btn--small" onClick={() => send(f.id)}>Invite again</button>
                    )}
                </span>
            );
        }
        return <span className="sb-status" style={{ fontVariantNumeric: "tabular-nums" }}>Invited · {secondsUntil(entry.invite.expiresAt)}s</span>;
    };

    return (
        <div className="gw-card" style={{ marginBottom: "var(--s3)", padding: "var(--s6)" }}>
            <style>{SOCIAL_STYLES}</style>
            <span className="gw-label" style={{ display: "block", marginBottom: "var(--s3)" }}>Invite a friend</span>
            {loading ? (
                <p className="sb-status">Loading…</p>
            ) : shown.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", margin: 0 }}>
                    No friends online.{" "}
                    <Link href="/friends" style={{ color: "var(--accent)", fontWeight: 600 }}>Manage friends</Link>
                </p>
            ) : (
                // About five rows tall, then scrolls, so a long list never pushes the page around.
                <div style={{ maxHeight: 240, overflowY: "auto", overscrollBehavior: "contain" }}>
                    {shown.map((f) => (
                        <FriendRow key={f.id} person={f} status={f.status} compact actions={rowState(f)} />
                    ))}
                </div>
            )}
        </div>
    );
}
