"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { SOCIAL_STYLES, initials } from "./socialStyles";

const secondsLeft = (expiresAt) => Math.max(0, Math.min(60, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));

// Non-blocking invite card pinned to the bottom of the viewport.
// Steps: "invite" → (optionally) "confirmLeave" → navigate; or "gone" if the invite died.
export default function InvitePopup({ invite, onDone }) {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const [step, setStep] = useState("invite");
    const [busy, setBusy] = useState(false);
    const [left, setLeft] = useState(() => secondsLeft(invite.expiresAt));

    useEffect(() => {
        setStep("invite");
        setLeft(secondsLeft(invite.expiresAt));
        const timer = setInterval(() => setLeft(secondsLeft(invite.expiresAt)), 1000);
        return () => clearInterval(timer);
    }, [invite.id, invite.expiresAt]);

    useEffect(() => {
        if (left === 0 && step !== "gone") onDone();
    }, [left, step, onDone]);

    useEffect(() => {
        if (step !== "gone") return;
        const timer = setTimeout(onDone, 3000);
        return () => clearTimeout(timer);
    }, [step, onDone]);

    const accept = async (leaveCurrent) => {
        setBusy(true);
        try {
            const res = await apiFetch(`/invites/${invite.id}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leaveCurrent }),
            });
            if (res.ok) {
                const { lobbyId } = await res.json();
                onDone();
                router.push(`/lobby/${lobbyId}`);
                return;
            }
            if (res.status === 409) {
                const data = await res.json().catch(() => ({}));
                if (data.code === "IN_WAITING_LOBBY") { setStep("confirmLeave"); return; }
                onDone(); // IN_GAME: never interrupt a running game
                return;
            }
            setStep("gone");
        } catch {
            setStep("gone");
        } finally {
            setBusy(false);
        }
    };

    const decline = async () => {
        onDone();
        apiFetch(`/invites/${invite.id}/decline`, { method: "POST" }).catch(() => {});
    };

    const motionProps = reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
        : {
            initial: { opacity: 0, y: 16 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } },
            exit: { opacity: 0, y: 16, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
        };

    return (
        <AnimatePresence>
            <motion.div
                key={invite.id}
                role="alertdialog"
                aria-labelledby="invite-title"
                aria-describedby="invite-desc"
                {...motionProps}
                style={{
                    position: "fixed", left: "50%", bottom: "var(--s5)", translateX: "-50%", zIndex: 400,
                    width: "min(400px, calc(100vw - 32px))",
                    background: "var(--surface-0)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)",
                    borderRadius: "var(--r)", padding: "var(--s4)",
                    fontFamily: "'DM Sans', sans-serif",
                }}
            >
                <style>{SOCIAL_STYLES}</style>
                {step === "gone" ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s3)" }}>
                        <p id="invite-title" style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-600)" }}>
                            This invite is no longer available.
                        </p>
                        <button className="sb-btn sb-btn--ghost sb-btn--small" onClick={onDone}>Dismiss</button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                            <span className="sb-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initials(invite.from.username)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p id="invite-title" style={{ margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, color: "var(--text-900)" }}>
                                    {step === "confirmLeave" ? "Leave your current lobby?" : `${invite.from.username} invited you to play`}
                                </p>
                                <p id="invite-desc" style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-600)" }}>
                                    {step === "confirmLeave"
                                        ? `You're waiting in another lobby. Leave it to join ${invite.from.username}?`
                                        : <>{invite.setName || "a custom set"} · <span style={{ fontVariantNumeric: "tabular-nums" }}>{left}s</span></>}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s2)", marginTop: "var(--s3)" }}>
                            {step === "confirmLeave" ? (
                                <>
                                    <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busy} onClick={() => setStep("invite")}>Cancel</button>
                                    <button className="sb-btn sb-btn--primary sb-btn--small" disabled={busy} onClick={() => accept(true)}>Leave &amp; join</button>
                                </>
                            ) : (
                                <>
                                    <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busy} onClick={decline}>Decline</button>
                                    <button className="sb-btn sb-btn--primary sb-btn--small" disabled={busy} onClick={() => accept(false)}>Accept</button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
