"use client";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Clock, Check, X, Send, Bell, BellOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserContext } from "@/context/UserContext";
import { SOCIAL_STYLES } from "./socialStyles";

const FRIEND_ERRORS = {
    404: "That request is no longer pending.",
    429: "You can send another request later.",
};

// Add friend / Follow / Invite controls for one other user. Used on profiles
// and on the end-of-game screen. The parent owns `relationship` and `following`
// and receives updates through onChange.
export default function RelationshipButtons({
    userId,
    relationship,
    following = false,
    status,
    onChange,
    showFollow = true,
    small = false,
}) {
    const { user } = useContext(UserContext);
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const size = small ? " sb-btn--small" : "";
    const signedOut = !user || user.isGuest;

    if (relationship === "self") {
        return (
            <>
                <style>{SOCIAL_STYLES}</style>
                <button className={`sb-btn${size}`} onClick={() => router.push("/profile")}>Edit profile</button>
            </>
        );
    }

    const run = async (path, method, next) => {
        if (signedOut) { router.push("/signup"); return; }
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch(path, {
                method,
                headers: { "Content-Type": "application/json" },
                body: method === "POST" && path === "/friends/requests" ? JSON.stringify({ userId }) : undefined,
            });
            if (!res.ok) {
                setError(FRIEND_ERRORS[res.status] || "Something went wrong.");
                return;
            }
            let update = next;
            if (res.status !== 204) {
                const data = await res.json().catch(() => null);
                if (data?.relationship) update = { ...next, relationship: data.relationship };
            }
            onChange?.({ relationship, following, ...update });
        } catch {
            setError("Network error.");
        } finally {
            setBusy(false);
            setMenuOpen(false);
        }
    };

    let friendControl;
    switch (relationship) {
        case "outgoing":
            friendControl = (
                <button className={`sb-btn sb-btn--ghost${size}`} disabled={busy}
                    onClick={() => run(`/friends/requests/${userId}`, "DELETE", { relationship: "none" })}
                    aria-label="Request sent. Cancel request">
                    <Clock size={14} /> Request sent
                </button>
            );
            break;
        case "incoming":
            friendControl = (
                <>
                    <button className={`sb-btn sb-btn--primary${size}`} disabled={busy}
                        onClick={() => run(`/friends/requests/${userId}/accept`, "POST", { relationship: "friends" })}>
                        <Check size={14} /> Accept request
                    </button>
                    <button className={`sb-btn sb-btn--ghost${size}`} disabled={busy}
                        onClick={() => run(`/friends/requests/${userId}/decline`, "POST", { relationship: "none" })}>
                        <X size={14} /> Decline
                    </button>
                </>
            );
            break;
        case "friends":
            friendControl = (
                <>
                    {status === "online" && (
                        <button className={`sb-btn sb-btn--primary${size}`}
                            onClick={() => router.push(`/create?invite=${userId}`)}>
                            <Send size={14} /> Invite
                        </button>
                    )}
                    <span style={{ position: "relative" }}>
                        <button className={`sb-btn${size}`} onClick={() => setMenuOpen((o) => !o)}
                            aria-haspopup="menu" aria-expanded={menuOpen}>
                            <UserCheck size={14} /> Friends
                        </button>
                        {menuOpen && (
                            <div role="menu" style={{
                                position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20,
                                background: "var(--surface-0)", border: "1px solid var(--border)",
                                borderRadius: "var(--r)", padding: "var(--s1)",
                            }}>
                                <button role="menuitem" className={`sb-btn sb-btn--danger sb-btn--small`} disabled={busy}
                                    onClick={() => run(`/friends/${userId}`, "DELETE", { relationship: "none" })}>
                                    Remove friend
                                </button>
                            </div>
                        )}
                    </span>
                </>
            );
            break;
        default:
            friendControl = (
                <button className={`sb-btn sb-btn--primary${size}`} disabled={busy}
                    onClick={() => run("/friends/requests", "POST", { relationship: "outgoing" })}>
                    <UserPlus size={14} /> Add friend
                </button>
            );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--s1)" }}>
            <style>{SOCIAL_STYLES}</style>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)", justifyContent: "flex-end" }}>
                {showFollow && (
                    <button className={`sb-btn sb-btn--ghost${size}`} disabled={busy} aria-pressed={following}
                        onClick={() => run(`/follows/${userId}`, following ? "DELETE" : "POST", { following: !following })}>
                        {following ? <><BellOff size={14} /> Following</> : <><Bell size={14} /> Follow</>}
                    </button>
                )}
                {friendControl}
            </div>
            {error && (
                <span role="alert" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--state-out)" }}>
                    {error}
                </span>
            )}
        </div>
    );
}
