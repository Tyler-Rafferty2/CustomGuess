"use client";
import { apiFetch } from '@/lib/api';

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SetCover from "@/components/SetCover";
import { useContext, useState, useEffect } from "react";
import { UserContext } from "@/context/UserContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Hash, Star, Lock, Globe, Pencil, Trash2, Layers, Heart, Play } from "lucide-react";

/* ─────────────────────────────────────────────
   Design tokens — v3.0 schema
───────────────────────────────────────────── */
const T = {
    bg: "#F7F3EE",
    surface0: "#FFFFFF",
    surface1: "#F2EDE7",
    surface2: "#E8E0D8",
    accent: "#D9572B",
    accentLight: "#F2C5B4",
    accentDim: "#B84422",
    text900: "#1A1510",
    text600: "#5C5047",
    text400: "#A0937F",
    border: "#DDD5CA",
    borderStrong: "#C4B8A8",
    stateOut: "#C0392B",
    stateLive: "#2A7A56",
};

function formatDuration(seconds) {
    if (seconds == null) return "—";
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatResult(result) {
    switch (result) {
        case "win": return { label: "Win", win: true };
        case "loss": return { label: "Loss", win: false };
        case "forfeit_win": return { label: "Win (FF)", win: true };
        case "forfeit_loss": return { label: "Loss (FF)", win: false };
        default: return { label: result, win: false };
    }
}

function StatCard({ stat, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: [0, 0, 0.2, 1] }}
            style={{
                background: T.surface0,
                border: `1px solid ${T.border}`,
                borderRadius: "6px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <stat.Icon size={14} color={T.accent} />
                <span style={{
                    fontSize: 11, fontWeight: 600, color: T.text400,
                    textTransform: "uppercase", letterSpacing: "0.08em"
                }}>
                    {stat.label}
                </span>
            </div>
            <span style={{
                fontFamily: "'Fraunces', serif", fontSize: 28,
                fontWeight: 700, color: T.text900, fontVariantNumeric: "tabular-nums"
            }}>
                {stat.value}
            </span>
        </motion.div>
    );
}

export default function Profile() {
    const { user, updateUser } = useContext(UserContext);
    const router = useRouter();
    const [mySets, setMySets] = useState([]);
    const [setsLoading, setSetsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [usernameModalOpen, setUsernameModalOpen] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [usernameSaving, setUsernameSaving] = useState(false);
    const [usernameError, setUsernameError] = useState(null);
    const [usernameSaved, setUsernameSaved] = useState(false);

    useEffect(() => {
        if (!user?.id || user?.isGuest) { setSetsLoading(false); return; }
        apiFetch(`/player/set/player?page=1&pageSize=100`, {
            headers: {  },
        })
            .then(r => r.json())
            .then(data => { setMySets(Array.isArray(data.sets) ? data.sets : []); setSetsLoading(false); })
            .catch(() => setSetsLoading(false));
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        apiFetch(`/player/stats`, {
            headers: {  },
        })
            .then(r => r.json())
            .then(data => { setStats(data); setStatsLoading(false); })
            .catch(() => setStatsLoading(false));
    }, [user?.id]);

    useEffect(() => {
        if (user?.username) setUsernameInput(user.username);
    }, [user?.username]);

    const handleSaveUsername = async () => {
        setUsernameError(null);
        setUsernameSaved(false);
        setUsernameSaving(true);
        try {
            const res = await apiFetch(`/users/username`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: usernameInput }),
            });
            const data = await res.json();
            if (!res.ok) { setUsernameError(data.error || "Something went wrong"); return; }
            updateUser(data);
            setUsernameSaved(true);
            setTimeout(() => {
                setUsernameSaved(false);
                setUsernameModalOpen(false);
            }, 1200);
        } catch { setUsernameError("Network error"); }
        finally { setUsernameSaving(false); }
    };

    const handleToggleLike = async (setId) => {
        setMySets(prev => prev.map(s => {
            if (s.id !== setId) return s;
            const wasLiked = s.likedByMe;
            return { ...s, likedByMe: !wasLiked, likeCount: (s.likeCount ?? 0) + (wasLiked ? -1 : 1) };
        }));
        try {
            const res = await apiFetch(`/player/set/${setId}/like`, {
                method: "POST",
                headers: {  },
            });
            if (res.ok) {
                const data = await res.json();
                setMySets(prev => prev.map(s =>
                    s.id === setId ? { ...s, likedByMe: data.likedByMe, likeCount: data.likeCount } : s
                ));
            }
        } catch { /* optimistic state remains */ }
    };

    const handleDeleteSet = (setId) => setDeleteConfirmId(setId);

    const confirmDeleteSet = async () => {
        const setId = deleteConfirmId;
        setDeleteConfirmId(null);
        setDeletingId(setId);
        try {
            await apiFetch(`/player/set/${setId}`, {
                method: "DELETE",
                headers: {  },
            });
            setMySets(prev => prev.filter(s => s.id !== setId));
        } catch { /* silently fail */ }
        setDeletingId(null);
    };

    return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
            {deleteConfirmId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: T.surface0, border: `1px solid ${T.border}`, borderRadius: 6, padding: 32, width: '100%', maxWidth: 360 }}>
                        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: T.text900, marginBottom: 8, marginTop: 0 }}>Delete Set?</h2>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", color: T.text600, fontSize: 14, marginBottom: 24 }}>
                            This cannot be undone. The set and all its characters will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{ flex: 1, height: 40, background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: T.text600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteSet}
                                style={{ flex: 1, height: 40, background: T.stateOut, border: `1px solid ${T.stateOut}`, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#fff', cursor: 'pointer' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
        .back-btn {
          display: flex; align-items: center; gap: 8px;
          background: transparent; border: 1px solid ${T.border};
          border-radius: 6px; color: ${T.text600};
          padding: 8px 16px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 150ms; width: fit-content;
        }
        .back-btn:hover { border-color: ${T.borderStrong}; background: ${T.surface1}; color: ${T.text900}; }

        .history-row {
          display: grid; grid-template-columns: 1fr 2fr 1fr 1fr;
          align-items: center; background: ${T.surface0};
          padding: 16px 24px; transition: background 150ms;
        }
        .history-row:hover { background: ${T.surface1}; }

        .set-card-actions { opacity: 0; transition: opacity 150ms; }
        .set-card-actions:focus-within { opacity: 1; }
        *:hover > .set-card-actions { opacity: 1; }

        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .history-row { grid-template-columns: 1fr 1.5fr 1fr; padding: 12px 16px; }
          .history-turns { display: none; }
          .set-card-actions { opacity: 1; }
        }
      `}</style>

            <Navbar />

            <main style={{ flex: 1, padding: "48px 24px" }}>
                <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>

                    {/* Header */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <button className="back-btn" onClick={() => router.push("/")}>
                            <ArrowLeft size={16} /> Back to Game
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: "6px", background: T.accentLight,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, fontWeight: 700, color: T.accentDim, border: `2px solid ${T.accent}`
                            }}>
                                {(user?.username || user?.email || "G")[0].toUpperCase()}
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <h1 style={{
                                        fontFamily: "'Fraunces', serif", fontSize: 42,
                                        fontWeight: 900, color: T.text900, letterSpacing: "-0.03em",
                                        margin: 0,
                                    }}>
                                        {user?.username || user?.email?.split("@")[0] || "Guest Player"}
                                    </h1>
                                    {!user?.isGuest && (
                                        <button
                                            onClick={() => {
                                                setUsernameInput(user?.username || "");
                                                setUsernameError(null);
                                                setUsernameSaved(false);
                                                setUsernameModalOpen(true);
                                            }}
                                            title="Edit username"
                                            style={{
                                                background: "transparent", border: `1px solid ${T.border}`,
                                                borderRadius: "6px", cursor: "pointer",
                                                width: 30, height: 30, display: "flex",
                                                alignItems: "center", justifyContent: "center",
                                                color: T.text400, transition: "all 150ms", flexShrink: 0,
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.text600; e.currentTarget.style.background = T.surface1; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text400; e.currentTarget.style.background = "transparent"; }}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                    )}
                                </div>
                                <p style={{ color: T.text400, fontSize: 14, fontFamily: "'DM Sans', sans-serif", margin: "4px 0 0" }}>
                                    {user?.email && !user?.isGuest ? user.email : "Guest"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Username change modal */}
                    {usernameModalOpen && (
                        <div
                            onMouseDown={() => setUsernameModalOpen(false)}
                            style={{
                                position: "fixed", inset: 0, zIndex: 100,
                                background: "rgba(247,243,238,0.75)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                                onMouseDown={e => e.stopPropagation()}
                                style={{
                                    background: T.surface0, border: `1px solid ${T.border}`,
                                    borderRadius: "6px", padding: "28px 28px 24px",
                                    width: "100%", maxWidth: 400,
                                    display: "flex", flexDirection: "column", gap: 16,
                                }}
                            >
                                <div>
                                    <h2 style={{
                                        fontFamily: "'Fraunces', serif", fontSize: 20,
                                        fontWeight: 700, color: T.text900, margin: "0 0 4px",
                                        letterSpacing: "-0.01em",
                                    }}>
                                        Change username
                                    </h2>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text400, margin: 0 }}>
                                        You can change your username once every 30 days.
                                    </p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label htmlFor="username-input" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: T.text600 }}>
                                        New username
                                    </label>
                                    <input
                                        id="username-input"
                                        autoFocus
                                        value={usernameInput}
                                        onChange={e => { setUsernameInput(e.target.value); setUsernameError(null); setUsernameSaved(false); }}
                                        onKeyDown={e => e.key === "Enter" && handleSaveUsername()}
                                        placeholder="Enter username"
                                        style={{
                                            height: 40, padding: "0 12px",
                                            background: T.surface0,
                                            border: `1px solid ${usernameError ? T.stateOut : T.border}`,
                                            borderRadius: "6px", fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14, color: T.text900, outline: "none",
                                        }}
                                    />
                                    {usernameError && (
                                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.stateOut, margin: 0 }}>
                                            {usernameError}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                    <button
                                        onClick={() => setUsernameModalOpen(false)}
                                        style={{
                                            height: 40, padding: "0 16px", borderRadius: "6px",
                                            border: `1px solid ${T.border}`, background: "transparent",
                                            color: T.text600, fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14, fontWeight: 500, cursor: "pointer",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveUsername}
                                        disabled={usernameSaving || !usernameInput.trim()}
                                        style={{
                                            height: 40, padding: "0 20px", borderRadius: "6px", border: "none",
                                            background: usernameSaved ? T.stateLive : T.accent,
                                            color: "#fff", fontFamily: "'DM Sans', sans-serif",
                                            fontSize: 14, fontWeight: 600, cursor: "pointer",
                                            opacity: (usernameSaving || !usernameInput.trim()) ? 0.6 : 1,
                                            transition: "background 200ms",
                                        }}
                                    >
                                        {usernameSaving ? "Saving…" : usernameSaved ? "Saved!" : "Save"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                        {[
                            { label: "Games Played", value: statsLoading ? "…" : String(stats?.gamesPlayed ?? 0), Icon: Hash },
                            { label: "Win Rate", value: statsLoading ? "…" : `${Math.round((stats?.winRate ?? 0) * 100)}%`, Icon: Trophy },
                            { label: "Wins", value: statsLoading ? "…" : String(stats?.wins ?? 0), Icon: Star },
                            { label: "Top Set", value: statsLoading ? "…" : (stats?.topSet?.name ?? "—"), Icon: Layers },
                        ].map((stat, i) => (
                            <StatCard key={stat.label} stat={stat} index={i} />
                        ))}
                    </div>

                    {/* My Sets Section */}
                    {!user?.isGuest && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: T.text900, margin: 0 }}>
                                    My Sets
                                </h2>
                                <button
                                    onClick={() => router.push("/set/new")}
                                    style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: "6px 16px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "transparent", color: T.text600, cursor: "pointer", transition: "all 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = T.surface1; e.currentTarget.style.color = T.text900; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.text600; }}
                                >
                                    + New Set
                                </button>
                            </div>

                            {setsLoading ? (
                                <div style={{ padding: "32px", textAlign: "center", color: T.text400, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                                    Loading sets…
                                </div>
                            ) : mySets.length === 0 ? (
                                <div style={{ background: T.surface0, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "40px 24px", textAlign: "center" }}>
                                    <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: T.text900, marginBottom: 8 }}>No sets yet</p>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.text400, marginBottom: 20 }}>Create your first character set to use in games.</p>
                                    <button
                                        onClick={() => router.push("/set/new")}
                                        style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, padding: "10px 24px", borderRadius: "6px", border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}
                                    >
                                        Create a Set
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                                    {mySets.map((set, i) => (
                                        <motion.div
                                            key={set.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] }}
                                            style={{ background: T.surface0, border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", position: "relative" }}
                                        >
                                            {/* Action buttons — shown on hover via CSS */}
                                            <div className="set-card-actions" style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
                                                <button
                                                    onClick={() => router.push(`/edit/${set.id}`)}
                                                    title="Edit set"
                                                    style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.92)", border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                >
                                                    <Pencil size={12} color={T.text600} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSet(set.id)}
                                                    title="Delete set"
                                                    disabled={deletingId === set.id}
                                                    style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.92)", border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                >
                                                    <Trash2 size={12} color={T.stateOut} />
                                                </button>
                                            </div>

                                            <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 120 }} />
                                            <div style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                                    <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: T.text900, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {set.name}
                                                    </p>
                                                    {set.public
                                                        ? <Globe size={12} color={T.text400} style={{ flexShrink: 0 }} />
                                                        : <Lock size={12} color={T.text400} style={{ flexShrink: 0 }} />
                                                    }
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>
                                                            {set.characters?.length ?? 0} char{set.characters?.length !== 1 ? "s" : ""}
                                                        </p>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400 }} title="Times played">
                                                            <Play size={11} strokeWidth={2} />
                                                            {set.playCount ?? 0}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleLike(set.id); }}
                                                        title={set.likedByMe ? "Unlike" : "Like"}
                                                        style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", padding: "2px 4px", borderRadius: 4, cursor: "pointer", color: set.likedByMe ? T.stateOut : T.text400, fontSize: 12, fontWeight: 600, transition: "color 150ms" }}
                                                        onMouseEnter={e => e.currentTarget.style.color = T.stateOut}
                                                        onMouseLeave={e => e.currentTarget.style.color = set.likedByMe ? T.stateOut : T.text400}
                                                    >
                                                        <Heart size={12} fill={set.likedByMe ? "currentColor" : "none"} strokeWidth={2} />
                                                        {set.likeCount ?? 0}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* History Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h2 style={{
                            fontFamily: "'Fraunces', serif", fontSize: 20,
                            color: T.text900, marginBottom: 16
                        }}>
                            Match History
                        </h2>
                        <div style={{
                            borderRadius: "6px", border: `1px solid ${T.border}`,
                            overflow: "hidden", display: "flex", flexDirection: "column", gap: "1px",
                            background: T.border
                        }}>
                            {statsLoading ? (
                                <div style={{ padding: "32px", textAlign: "center", color: T.text400, fontFamily: "'DM Sans', sans-serif", fontSize: 14, background: T.surface0 }}>
                                    Loading history…
                                </div>
                            ) : !stats?.recentGames?.length ? (
                                <div style={{ padding: "40px 24px", textAlign: "center", background: T.surface0 }}>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.text400, margin: 0 }}>No games yet</p>
                                </div>
                            ) : stats.recentGames.map((match, idx) => {
                                const { label, win } = formatResult(match.result);
                                return (
                                    <div key={idx} className="history-row">
                                        <span style={{ fontSize: 12, color: T.text400, fontWeight: 500 }}>
                                            {new Date(match.finishedAt).toLocaleDateString()}
                                        </span>
                                        <span style={{ fontSize: 14, color: T.text900, fontWeight: 600 }}>vs. {match.opponentName}</span>
                                        <span style={{
                                            fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                                            letterSpacing: "0.05em", color: win ? T.stateLive : T.stateOut
                                        }}>
                                            {label}
                                        </span>
                                        <span className="history-turns" style={{
                                            textAlign: "right", fontSize: 12, color: T.text600,
                                            fontVariantNumeric: "tabular-nums"
                                        }}>
                                            {match.characterSetName && (
                                                <span style={{ color: T.text400, marginRight: 8 }}>{match.characterSetName}</span>
                                            )}
                                            {formatDuration(match.durationSeconds)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                </div>
            </main>
        <Footer />
        </div>
    );
}