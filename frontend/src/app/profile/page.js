"use client";

import Navbar from "@/components/navbar";
import { useContext, useState, useEffect } from "react";
import { UserContext } from "@/context/UserContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Clock, Hash, Star, Users, Lock, Globe, Pencil, Trash2 } from "lucide-react";

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

/* Placeholder data for profile v1.5 */
const MOCK_STATS = [
    { label: "Games Played", value: "142", Icon: Hash },
    { label: "Win Rate", value: "68%", Icon: Trophy },
    { label: "Fastest Win", value: "1m 12s", Icon: Clock },
    { label: "Top Character", value: "Anita", Icon: Star },
];

const MOCK_HISTORY = [
    { id: 1, date: "2 hours ago", opponent: "Guest_482", result: "Win", turns: 8 },
    { id: 2, date: "Yesterday", opponent: "Sarah", result: "Loss", turns: 12 },
    { id: 3, date: "Yesterday", opponent: "Sarah", result: "Win", turns: 6 },
    { id: 4, date: "Oct 24", opponent: "DeductionKing", result: "Win", turns: 10 },
];

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
    const { user } = useContext(UserContext);
    const router = useRouter();
    const [mySets, setMySets] = useState([]);
    const [setsLoading, setSetsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!user?.id || user?.isGuest) { setSetsLoading(false); return; }
        fetch("http://localhost:8080/player/set/player", {
            headers: { "X-User-ID": user.id },
        })
            .then(r => r.json())
            .then(data => { setMySets(Array.isArray(data) ? data : []); setSetsLoading(false); })
            .catch(() => setSetsLoading(false));
    }, [user?.id]);

    const handleDeleteSet = async (setId) => {
        if (!confirm("Delete this set? This cannot be undone.")) return;
        setDeletingId(setId);
        try {
            await fetch(`http://localhost:8080/player/set/${setId}`, {
                method: "DELETE",
                headers: { "X-User-ID": user.id },
            });
            setMySets(prev => prev.filter(s => s.id !== setId));
        } catch { /* silently fail */ }
        setDeletingId(null);
    };

    return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600&display=swap');

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
                                {user?.name?.substring(0, 2).toUpperCase() || "GU"}
                            </div>
                            <div>
                                <h1 style={{
                                    fontFamily: "'Fraunces', serif", fontSize: 42,
                                    fontWeight: 900, color: T.text900, letterSpacing: "-0.03em"
                                }}>
                                    {user?.name || "Guest Player"}
                                </h1>
                                <p style={{ color: T.text400, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                                    Member since 2024 • Professional Sleuth
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                        {MOCK_STATS.map((stat, i) => (
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
                                    onClick={() => router.push("/create")}
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
                                        onClick={() => router.push("/create")}
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

                                            {set.coverImageName ? (
                                                <img
                                                    src={`http://localhost:8080${set.coverImageName}`}
                                                    alt={set.name}
                                                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                                                />
                                            ) : (
                                                <div style={{ width: "100%", height: 120, background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Users size={32} color={T.accentDim} />
                                                </div>
                                            )}
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
                                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>
                                                    {set.characters?.length ?? 0} character{set.characters?.length !== 1 ? "s" : ""}
                                                </p>
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
                            {MOCK_HISTORY.map((match) => (
                                <div key={match.id} className="history-row">
                                    <span style={{ fontSize: 12, color: T.text400, fontWeight: 500 }}>{match.date}</span>
                                    <span style={{ fontSize: 14, color: T.text900, fontWeight: 600 }}>vs. {match.opponent}</span>
                                    <span style={{
                                        fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                                        letterSpacing: "0.05em", color: match.result === "Win" ? T.stateLive : T.stateOut
                                    }}>
                                        {match.result}
                                    </span>
                                    <span className="history-turns" style={{
                                        textAlign: "right", fontSize: 14, color: T.text600,
                                        fontVariantNumeric: "tabular-nums"
                                    }}>
                                        {match.turns} turns
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}