"use client";

import { useContext, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import { LogOut, Settings, HelpCircle, Volume2, VolumeX, X, Home, PlusSquare, Users } from "lucide-react";
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
    { label: "Create", href: "/create", Icon: PlusSquare },
    { label: "Lobby", href: "/lobby", Icon: Users },
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
    const { user, logout } = useContext(UserContext);
    const [showSettings, setShowSettings] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const router = useRouter();

    const handleLogout = () => logout();

    const pathname = usePathname();
    const isInGame = pathname?.startsWith("/lobby/");
    const lobbyID = pathname?.startsWith("/lobby/") ? pathname.split("/lobby/")[1] : null;

    const handleLeaveGame = async () => {
        setShowLeaveConfirm(false);
        if (lobbyID) {
            try {
                await fetch(`http://localhost:8080/lobby/forfeit`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-ID": user?.id,
                    },
                    body: JSON.stringify({ lobbyId: lobbyID }),
                });
            } catch (err) {
                console.error("Forfeit error:", err);
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
                            <DangerButton onClick={() => setShowLeaveConfirm(true)} Icon={LogOut} label="Leave" />
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
                        {user && user.email !== "guest" ? (
                            <>
                                {/* <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: "6px",
                                        background: T.surface1,
                                        border: `1px solid ${T.border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: T.accent, fontSize: 13, fontWeight: 600,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                        {user.name?.[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: T.text600 }}>
                                        {user.name}
                                    </span>
                                </div> */}
                                <GhostButton onClick={handleLogout} Icon={LogOut} label="Log out" />
                            </>
                        ) : (
                            <div style={{ display: "flex", gap: 8 }}>
                                <GhostButton onClick={() => router.push("/signin")} label="Sign in" />
                                <PrimaryButton onClick={() => router.push("/signup")} label="Sign up" />
                            </div>
                        )}
                    </div>

                </div>
            </nav>
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
                Guess Who
            </span>
            <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.accent,
                lineHeight: 1,
                paddingBottom: 1,
            }}>
                Multiplayer
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