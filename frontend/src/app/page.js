"use client";
import { API_URL } from '@/lib/api';

import Navbar from "../components/navbar";
import { useContext, useState } from "react";
import { UserContext } from "@/context/UserContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

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

/* Placeholder character data */
const CHARACTERS = [
  { id: "1", name: "Alice", state: "active", hue: 28 },
  { id: "2", name: "Bernard", state: "eliminated", hue: 195 },
  { id: "3", name: "Clara", state: "active", hue: 340 },
  { id: "4", name: "David", state: "active", hue: 60 },
  { id: "5", name: "Elena", state: "active", hue: 150 },
  { id: "6", name: "Frank", state: "eliminated", hue: 270 },
  { id: "7", name: "Grace", state: "active", hue: 10 },
  { id: "8", name: "Henry", state: "active", hue: 220 },
  { id: "9", name: "Irene", state: "eliminated", hue: 85 },
  { id: "10", name: "James", state: "active", hue: 310 },
  { id: "11", name: "Karen", state: "active", hue: 165 },
  { id: "12", name: "Leo", state: "active", hue: 45 },
];

/* Warm-tinted flat face placeholder */
function FaceSVG({ hue, eliminated }) {
  const faceColor = eliminated ? "#E8E0D8" : `hsl(${hue}, 38%, 82%)`;
  const skinColor = eliminated ? "#DDD5CA" : `hsl(${hue}, 32%, 74%)`;
  const featureCol = eliminated ? "#C4B8A8" : `hsl(${hue}, 20%, 52%)`;
  return (
    <svg viewBox="0 0 48 56" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="56" fill={faceColor} />
      <circle cx="24" cy="22" r="13" fill={skinColor} />
      <ellipse cx="24" cy="45" rx="14" ry="9" fill={skinColor} />
      {!eliminated && (
        <>
          <circle cx="19" cy="20" r="2" fill={featureCol} opacity="0.9" />
          <circle cx="29" cy="20" r="2" fill={featureCol} opacity="0.9" />
          <path d="M19 27 Q24 31 29 27" stroke={featureCol} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
        </>
      )}
    </svg>
  );
}

function CharacterCard({ char, index }) {
  const isEliminated = char.state === "eliminated";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0, 0, 0.2, 1] }}
      style={{
        position: "relative",
        background: T.surface0,
        border: `1px solid ${T.border}`,
        borderRadius: "6px",
        overflow: "hidden",
        opacity: isEliminated ? 0.35 : 1,
        filter: isEliminated ? "saturate(0)" : "none",
        aspectRatio: "3 / 4",
        transition: "opacity 250ms",
      }}
    >
      {/* Face area — 78% height */}
      <div style={{ width: "100%", height: "78%" }}>
        <FaceSVG hue={char.hue} eliminated={isEliminated} />
      </div>

      {/* Name strip */}
      <div style={{
        height: "22%",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderTop: `1px solid ${T.border}`,
        background: isEliminated ? T.surface1 : T.surface0,
        padding: "0 4px",
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 9, fontWeight: 600,
          color: isEliminated ? T.text400 : T.text600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.2,
        }}>
          {char.name}
        </span>
      </div>

      {/* Elimination diagonal strike */}
      {isEliminated && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <svg viewBox="0 0 48 56" width="100%" height="100%"
            style={{ position: "absolute", top: 0, left: 0 }}>
            <line x1="4" y1="4" x2="44" y2="52"
              stroke={T.stateOut} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function Home() {
  const { user } = useContext(UserContext);
  const router = useRouter();
  const [lobbyCode, setLobbyCode] = useState("");
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  const joinLobby = async (e) => {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/lobby/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
        body: JSON.stringify({ code: lobbyCode }),
      });
      let data;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok) { setError(data?.error || "Could not find game"); return; }
      router.push(`/lobby/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .primary-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; height: 48px; padding: 0 24px;
          background: ${T.accent}; border: 1px solid ${T.accent};
          border-radius: 6px; color: #FFFFFF;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer; outline: none;
          transition: background 150ms, border-color 150ms;
        }
        .primary-btn:hover  { background: ${T.accentDim}; border-color: ${T.accentDim}; }
        .primary-btn:active { transform: scale(0.98); }
        .primary-btn:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }

        .ghost-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; height: 48px; padding: 0 24px;
          background: transparent; border: 1px solid ${T.border};
          border-radius: 6px; color: ${T.text600};
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer; outline: none;
          transition: border-color 150ms, color 150ms, background 150ms;
        }
        .ghost-btn:hover  { border-color: ${T.borderStrong}; color: ${T.text900}; background: ${T.surface1}; }
        .ghost-btn:active { transform: scale(0.98); }
        .ghost-btn:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }

        .code-input {
          flex: 1; height: 44px; padding: 0 16px;
          background: ${T.surface0}; border: 1px solid ${T.border};
          border-right: none;
          border-radius: 6px 0 0 6px;
          color: ${T.text900}; font-family: 'DM Sans', sans-serif;
          font-size: 16px; font-weight: 600; letter-spacing: 0.25em; text-align: center;
          text-transform: uppercase; outline: none;
          transition: border-color 150ms;
        }
        .code-input::placeholder { color: ${T.text400}; letter-spacing: 0.1em; font-weight: 400; }
        .code-input:focus { border-color: ${T.accent}; }
        .code-input:focus + .code-submit { border-left-color: ${T.accent}; }

        .code-submit {
          height: 44px; padding: 0 20px;
          background: ${T.surface1}; border: 1px solid ${T.border};
          border-radius: 0 6px 6px 0;
          color: ${T.accent}; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
          cursor: pointer; outline: none;
          transition: background 150ms, color 150ms, border-color 150ms;
          white-space: nowrap;
        }
        .code-submit:hover:not(:disabled) { background: ${T.accent}; color: #fff; border-color: ${T.accent}; }
        .code-submit:active:not(:disabled) { transform: scale(0.97); }
        .code-submit:disabled { opacity: 0.38; cursor: not-allowed; }

        @media (max-width: 1024px) {
          .board-col { display: none !important; }
          .content-col { max-width: 520px !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <Navbar />

      <main style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 24px",
      }}>
        <div style={{
          width: "100%", margin: "0 auto",
          display: "flex", justifyContent: "center",
        }}>

          {/* RIGHT — Actions */}
          <motion.div
            className="content-col"
            style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 28 }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay: 0.08 }}
          >
            {/* Headline */}
            <div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", color: T.accent,
                marginBottom: 10,
              }}>
                Multiplayer · Real-time
              </p>
              <h1 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 52, fontWeight: 900, lineHeight: 1.0,
                color: T.text900, letterSpacing: "-0.03em",
              }}>
                Custom Guess
              </h1>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15, fontWeight: 400, lineHeight: 1.6,
                color: T.text600, marginTop: 12,
              }}>
                Ask questions. Eliminate suspects. Identify your opponent&apos;s hidden character before they find yours.
              </p>
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <motion.button
                className="primary-btn"
                onClick={() => router.push("/create")}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} strokeWidth={2.5} />
                Create Game
              </motion.button>

              <motion.button
                className="ghost-btn"
                onClick={() => router.push("/lobby")}
                whileTap={{ scale: 0.98 }}
              >
                <Search size={15} strokeWidth={1.8} />
                Browse Public Games
              </motion.button>
            </div>

            {/* Join with code */}
            <div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: T.text400, marginBottom: 8,
              }}>
                Join with code
              </p>
              <form onSubmit={joinLobby} style={{ display: "flex" }}>
                <input
                  className="code-input"
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  aria-label="Lobby code"
                />
                <button
                  type="submit"
                  className="code-submit"
                  disabled={joining || lobbyCode.length < 4}
                  aria-label="Join lobby"
                >
                  {joining ? "…" : "Join →"}
                </button>
              </form>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12, color: T.stateOut, marginTop: 8,
                  }}
                >
                  {error}
                </motion.p>
              )}
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* Guest nudge */}
            {!user && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, color: T.text400, lineHeight: 1.5,
              }}>
                Playing as guest.{" "}
                <button
                  onClick={() => router.push("/signin")}
                  style={{
                    background: "none", border: "none", padding: 0,
                    color: T.accent, fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    textDecoration: "underline", textUnderlineOffset: 3,
                  }}
                >
                  Sign in
                </button>
                {" "}to save stats and track your record.
              </p>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}