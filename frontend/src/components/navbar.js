"use client";
import { apiFetch } from '@/lib/api';

import { useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import { LogOut, Settings, HelpCircle, Volume2, VolumeX, X, Home, PlusSquare, Users, ChevronDown, User, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const NAV_ITEMS = [
    { label: "Home", href: "/", Icon: Home },
    { label: "Create Lobby", href: "/create", Icon: PlusSquare },
    { label: "Lobbies", href: "/lobby", Icon: Users },
];

/* ─────────────────────────────────────────────
   NavItem
───────────────────────────────────────────── */
function NavItem({ item, isActive, onClick }) {
    const { label, href, Icon } = item;
    return (
        <motion.button
            onClick={onClick}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: isActive ? T.surface1 : "transparent",
                border: `1px solid ${isActive ? T.border : "transparent"}`,
                borderRadius: "6px",
                color: isActive ? T.accent : T.text600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0em",
                transition: "color 150ms, background 150ms, border-color 150ms",
                outline: "none",
            }}
            whileHover={{
                background: T.surface1,
                color: T.text900,
                borderColor: T.border,
            }}
            whileTap={{ scale: 0.97 }}
        >
            {isActive && (
                <motion.span
                    layoutId="nav-indicator"
                    style={{
                        position: "absolute",
                        bottom: -1,
                        left: 10,
                        right: 10,
                        height: 2,
                        background: T.accent,
                        borderRadius: "2px 2px 0 0",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
            <Icon size={14} strokeWidth={isActive ? 2.5 : 1.8} />
            {label}
        </motion.button>
    );
}

/* ─────────────────────────────────────────────
   Main Navbar
───────────────────────────────────────────── */
export default function Navbar() {
    const { user, logout, isLoading } = useContext(UserContext);
    const [showSettings, setShowSettings] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [activeLobbyId, setActiveLobbyId] = useState(null);

    const router = useRouter();

    const handleLogout = () => logout();

    const pathname = usePathname();
    const isInGame = pathname?.startsWith("/lobby/");
    const lobbyID = pathname?.startsWith("/lobby/") ? pathname.split("/lobby/")[1] : null;

    // Check for an active game when not in one, so we can show a Rejoin button
    useEffect(() => {
        if (isInGame || !user?.id) {
            setActiveLobbyId(null);
            return;
        }
        apiFetch(`/lobby/active`, {
            headers: {  },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => setActiveLobbyId(data?.lobbyId ?? null))
            .catch(() => setActiveLobbyId(null));
    }, [pathname, user?.id, isInGame]);

    const handleLeaveGame = async () => {
        setShowLeaveConfirm(false);
        if (lobbyID) {
            try {
                await apiFetch(`/lobby/forfeit`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ lobbyId: lobbyID }),
                });
            } catch (err) {
                // console.error("Forfeit error:", err);
            }
        }
        router.push("/");
    };


    /* ── In-Game Bar ─────────────────────────────── */
    if (isInGame) {


        return (
            <>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

                <nav style={{
                    position: "relative",
                    zIndex: 20,
                    background: T.surface0,
                    borderBottom: `1px solid ${T.border}`,
                    fontFamily: "'DM Sans', sans-serif",
                }}>
                    <div style={{
                        maxWidth: 1080, margin: "0 auto", padding: "0 24px",
                        height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        <Logo />

                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11, fontWeight: 600,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            color: T.accent,
                            background: "#FBE8E0",
                            border: `1px solid ${T.accentLight}`,
                            borderRadius: "6px",
                            padding: "3px 10px",
                        }}>
                            In Game
                        </span>

                        <div style={{ display: "flex", gap: 8 }}>
                            <GhostButton onClick={() => setShowSettings(!showSettings)} Icon={Settings} label="Menu" />
                        </div>
                    </div>
                </nav>

                <AnimatePresence>
                    {showSettings && (
                        <>
                            <motion.div
                                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                onClick={() => setShowSettings(false)}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            />
                            <motion.div
                                style={{
                                    position: "fixed", top: 64, right: 24, zIndex: 50,
                                    width: 300, background: T.surface0,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: "6px", overflow: "hidden",
                                    fontFamily: "'DM Sans', sans-serif",
                                    boxShadow: "0 4px 24px rgba(26,21,16,0.08)",
                                }}
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                            >
                                <div style={{
                                    padding: "12px 16px",
                                    borderBottom: `1px solid ${T.border}`,
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}>
                                    <span style={{
                                        fontSize: 12, fontWeight: 600,
                                        letterSpacing: "0.08em", textTransform: "uppercase",
                                        color: T.text400,
                                    }}>
                                        Game Menu
                                    </span>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        style={{ background: "none", border: "none", color: T.text400, cursor: "pointer", display: "flex" }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div style={{ padding: 8 }}>
                                    <MenuRow Icon={HelpCircle} label="How to Play" sub="View game rules" onClick={() => { }} />
                                    <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                                    <MenuRow
                                        Icon={LogOut} label="Leave Game" sub="Exit current match"
                                        danger onClick={() => { setShowSettings(false); setShowLeaveConfirm(true); }}
                                    />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <LeaveModal
                    open={showLeaveConfirm}
                    onCancel={() => setShowLeaveConfirm(false)}
                    onConfirm={handleLeaveGame}
                />
            </>
        );
    }

    /* ── Standard Bar ────────────────────────────── */
    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

            <nav style={{
                position: "relative",
                zIndex: 20,
                background: T.surface0,
                borderBottom: `1px solid ${T.border}`,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{
                    maxWidth: 1080, margin: "0 auto", padding: "0 24px",
                    height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>

                    <Logo onClick={() => router.push("/")} />

                    <div style={{ display: "flex", gap: 2 }}>
                        {NAV_ITEMS.map((item) => {
                            const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                            return (
                                <NavItem
                                    key={item.href}
                                    item={item}
                                    isActive={isActive}
                                    onClick={() => router.push(item.href)}
                                />
                            );
                        })}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {activeLobbyId && (
                            <div style={{ position: "relative", display: "inline-flex" }}>
                                <motion.button
                                    onClick={() => router.push(`/lobby/${activeLobbyId}`)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        height: 32, padding: "0 14px",
                                        background: T.accent,
                                        border: `1px solid ${T.accent}`,
                                        borderRadius: "6px",
                                        color: "#fff",
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 13, fontWeight: 600,
                                        cursor: "pointer", outline: "none",
                                        letterSpacing: "0.01em",
                                    }}
                                    whileHover={{ background: T.accentDim, borderColor: T.accentDim }}
                                    whileTap={{ scale: 0.97 }}
                                    animate={{ scale: [1, 1.03, 1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                >
                                    <Swords size={13} strokeWidth={2} />
                                    Rejoin Game
                                </motion.button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await apiFetch(`/lobby/forfeit`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ lobbyId: activeLobbyId }),
                                            });
                                        } catch (err) {
                                            // console.error("Forfeit error:", err);
                                        }
                                        setActiveLobbyId(null);
                                    }}
                                    aria-label="Leave game"
                                    style={{
                                        position: "absolute", top: -7, right: -7,
                                        width: 18, height: 18, borderRadius: "50%",
                                        background: T.text900, color: "#fff",
                                        border: `2px solid ${T.surface0}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", padding: 0,
                                    }}
                                >
                                    <X size={9} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                        {!isLoading && (user && !user.isGuest ? (
                            <div style={{ position: "relative" }}>
                                {/* Trigger */}
                                <motion.button
                                    onClick={() => setShowUserMenu(v => !v)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        padding: "4px 8px 4px 4px",
                                        background: showUserMenu ? T.surface1 : "transparent",
                                        border: `1px solid ${showUserMenu ? T.borderStrong : T.border}`,
                                        borderRadius: "6px", cursor: "pointer",
                                    }}
                                    whileHover={{ background: T.surface1, borderColor: T.borderStrong }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 4,
                                        background: T.surface2, border: `1px solid ${T.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: T.accent, fontSize: 12, fontWeight: 700,
                                        fontFamily: "'Fraunces', serif",
                                    }}>
                                        {(user.username || user.email)?.[0]?.toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text600 }}>
                                        {user.username || user.email.split("@")[0]}
                                    </span>
                                    <motion.div animate={{ rotate: showUserMenu ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown size={13} color={T.text400} />
                                    </motion.div>
                                </motion.button>

                                {/* Overlay to close */}
                                <AnimatePresence>
                                    {showUserMenu && (
                                        <>
                                            <motion.div
                                                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                                onClick={() => setShowUserMenu(false)}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            />
                                            <motion.div
                                                style={{
                                                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                                                    width: 260, background: T.surface0,
                                                    border: `1px solid ${T.border}`, borderRadius: "6px",
                                                    overflow: "hidden", zIndex: 50,
                                                    boxShadow: "0 4px 24px rgba(26,21,16,0.09)",
                                                }}
                                                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {/* Header */}
                                                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
                                                        {(user.username || user.email)?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text900 }}>{user.username || user.email.split("@")[0]}</div>
                                                        <div style={{ fontSize: 11, color: T.text400 }}>{user.email}</div>
                                                    </div>
                                                </div>

                                                {/* Menu rows */}
                                                <div style={{ padding: 6 }}>
                                                    {[
                                                        { icon: <User size={14} />, label: "Profile", sub: "View your stats & history" },
                                                        // { icon: <Settings size={14} />, label: "Settings", sub: "Preferences & account" },
                                                        { icon: <HelpCircle size={14} />, label: "How to Play", sub: "Game rules & tips" },
                                                    ].map(({ icon, label, sub }) => (
                                                        <motion.button
                                                            key={label}
                                                            onClick={() => {
                                                                if (label === "How to Play") { setShowHowToPlay(true); }
                                                                else if (label === "Profile") { router.push("/profile") }
                                                                // else console.log(label + " clicked");
                                                                setShowUserMenu(false);
                                                            }}
                                                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                                                            whileHover={{ background: T.surface1 }}
                                                        >
                                                            <div style={{ width: 28, height: 28, borderRadius: 4, background: T.surface1, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, flexShrink: 0 }}>{icon}</div>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 500, color: T.text900 }}>{label}</div>
                                                                <div style={{ fontSize: 11, color: T.text400, marginTop: 1 }}>{sub}</div>
                                                            </div>
                                                        </motion.button>
                                                    ))}

                                                    <div style={{ height: 1, background: T.border, margin: "4px 6px" }} />

                                                    <motion.button
                                                        onClick={() => { handleLogout(); setShowUserMenu(false); }}
                                                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                                                        whileHover={{ background: "#FEF0EE" }}
                                                    >
                                                        <div style={{ width: 28, height: 28, borderRadius: 4, background: "#FEF0EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                            <LogOut size={14} color={T.stateOut} />
                                                        </div>
                                                        <div style={{ fontSize: 13, fontWeight: 500, color: T.stateOut }}>Log out</div>
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 8 }}>
                                <GhostButton onClick={() => router.push("/signin")} label="Sign in" />
                                <PrimaryButton onClick={() => router.push("/signup")} label="Sign up" />
                            </div>
                        ))}
                    </div>

                </div>
                <HowToPlayModal
                    open={showHowToPlay}
                    onClose={() => setShowHowToPlay(false)}
                />
            </nav >
        </>
    );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function Logo({ onClick }) {
    return (
        <motion.div
            onClick={onClick}
            style={{
                display: "flex", alignItems: "baseline", gap: 8,
                cursor: onClick ? "pointer" : "default", userSelect: "none",
            }}
            whileHover={onClick ? { opacity: 0.8 } : {}}
            whileTap={onClick ? { scale: 0.97 } : {}}
        >
            <span style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 22, fontWeight: 900,
                color: T.text900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
            }}>
                Custom Guess
            </span>
        </motion.div>
    );
}

function GhostButton({ onClick, Icon, label }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 32, padding: "0 14px",
                background: "transparent",
                border: `1px solid ${T.border}`,
                borderRadius: "6px",
                color: T.text600,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 500,
                cursor: "pointer",
                transition: "border-color 150ms, color 150ms, background 150ms",
                outline: "none",
            }}
            whileHover={{ borderColor: T.borderStrong, color: T.text900, background: T.surface1 }}
            whileTap={{ scale: 0.97 }}
        >
            {Icon && <Icon size={14} strokeWidth={1.8} />}
            {label}
        </motion.button>
    );
}

function PrimaryButton({ onClick, label }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 32, padding: "0 16px",
                background: T.accent,
                border: `1px solid ${T.accent}`,
                borderRadius: "6px",
                color: "#FFFFFF",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600,
                cursor: "pointer",
                outline: "none",
            }}
            whileHover={{ background: T.accentDim, borderColor: T.accentDim }}
            whileTap={{ scale: 0.97 }}
        >
            {label}
        </motion.button>
    );
}

function DangerButton({ onClick, Icon, label }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 32, padding: "0 14px",
                background: "transparent",
                border: `1px solid ${T.stateOut}66`,
                borderRadius: "6px",
                color: T.stateOut,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 500,
                cursor: "pointer",
                outline: "none",
            }}
            whileHover={{ background: "#FDF0EF", borderColor: T.stateOut }}
            whileTap={{ scale: 0.97 }}
        >
            {Icon && <Icon size={14} strokeWidth={1.8} />}
            {label}
        </motion.button>
    );
}

function MenuRow({ Icon, label, sub, onClick, danger }) {
    return (
        <motion.button
            onClick={onClick}
            style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", background: "transparent", border: "none",
                borderRadius: "6px", cursor: "pointer", textAlign: "left",
                color: danger ? T.stateOut : T.text900,
                fontFamily: "'DM Sans', sans-serif",
            }}
            whileHover={{ background: T.surface1 }}
            whileTap={{ scale: 0.98 }}
        >
            <Icon size={16} strokeWidth={1.8} color={danger ? T.stateOut : T.accent} />
            <div>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: T.text400, margin: 0, marginTop: 1 }}>{sub}</p>
            </div>
        </motion.button>
    );
}

function LeaveModal({ open, onCancel, onConfirm }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    style={{
                        position: "fixed", inset: 0, zIndex: 50,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(26,21,16,0.6)",
                        padding: 16,
                    }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <motion.div
                        style={{
                            width: "100%", maxWidth: 400,
                            background: T.surface0,
                            border: `1px solid ${T.border}`,
                            borderRadius: "6px",
                            padding: 32,
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                    >
                        <h2 style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 28, fontWeight: 700,
                            color: T.text900, margin: "0 0 8px",
                            letterSpacing: "-0.02em",
                        }}>
                            Leave game?
                        </h2>
                        <p style={{
                            fontSize: 14, color: T.text600, margin: "0 0 24px", lineHeight: 1.6,
                        }}>
                            This will forfeit the current match and return you to the lobby.
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                            <GhostButton onClick={onCancel} label="Stay" />
                            <DangerButton onClick={onConfirm} Icon={LogOut} label="Leave" />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function HowToPlayModal({ open, onClose }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(26,21,16,0.6)", // Warm, dark backdrop
                        padding: 16,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }} // --dur-slow + --ease-out
                >
                    <motion.div
                        style={{
                            width: "100%",
                            maxWidth: 480, // Updated to 480px per Modal specs
                            background: T.surface0,
                            border: `1px solid ${T.border}`,
                            borderRadius: "6px", // Strict --r: 6px
                            padding: 32,
                            fontFamily: "'DM Sans', sans-serif",
                            boxShadow: "0 4px 24px rgba(26,21,16,0.08)", // Optional: soft shadow for physical box feel, remove if sticking strictly to surface layers
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }} // --dur-slow
                    >
                        {/* Header Section */}
                        <h2 style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 26, // --text-xl
                            fontWeight: 700,
                            color: T.text900,
                            margin: "0 0 24px",
                            lineHeight: 1.1,
                            letterSpacing: "-0.02em",
                        }}>
                            How to play
                        </h2>

                        {/* Body Section: 3-step how-to (label + one-line text, no icons/emoji) */}
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16, // --s4
                            margin: "0 0 32px", // --s8
                        }}>
                            <p style={{ fontSize: 14, color: T.text600, margin: 0, lineHeight: 1.6 }}>
                                <strong style={{ color: T.text900, fontWeight: 600 }}>1. Ask questions. </strong>
                                Take turns asking yes or no questions about your opponent&apos;s mystery character.
                            </p>

                            <p style={{ fontSize: 14, color: T.text600, margin: 0, lineHeight: 1.6 }}>
                                <strong style={{ color: T.text900, fontWeight: 600 }}>2. Eliminate suspects. </strong>
                                Flip cards face down based on the answers you receive to narrow the field.
                            </p>

                            <p style={{ fontSize: 14, color: T.text600, margin: 0, lineHeight: 1.6 }}>
                                <strong style={{ color: T.text900, fontWeight: 600 }}>3. Guess to win. </strong>
                                Confidently identify your opponent&apos;s secret character before they guess yours.
                            </p>
                        </div>

                        {/* Footer Section: Right-aligned CTA */}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <PrimaryButton onClick={onClose} label="Got it" />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}