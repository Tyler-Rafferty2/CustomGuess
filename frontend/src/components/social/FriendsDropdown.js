"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Users, Check, X, Send } from "lucide-react";
import FriendRow from "./FriendRow";
import useFriendsList, { friendAction } from "./useFriendsList";
import { SOCIAL_STYLES } from "./socialStyles";

const DROPDOWN_STYLES = `
  .fd-trigger {
    position: relative; width: 36px; height: 36px; border-radius: var(--r);
    border: 1px solid var(--border); background: var(--surface-0); color: var(--text-600);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    transition: border-color 150ms cubic-bezier(0,0,0.2,1), color 150ms cubic-bezier(0,0,0.2,1);
  }
  .fd-trigger:hover, .fd-trigger[aria-expanded="true"] { border-color: var(--accent); color: var(--accent); }
  .fd-trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (pointer: coarse) { .fd-trigger { width: 44px; height: 44px; } }
  .fd-badge {
    position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: var(--r); background: var(--accent); color: #fff;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; line-height: 18px;
    font-variant-numeric: tabular-nums;
  }
  .fd-panel {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 50;
    width: min(320px, calc(100vw - 32px)); max-height: min(480px, 70vh); overflow-y: auto;
    background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--r);
    padding: var(--s4);
  }
  .fd-section + .fd-section { margin-top: var(--s3); padding-top: var(--s3); border-top: 1px solid var(--surface-1); }
  @media (prefers-reduced-motion: reduce) { .fd-trigger { transition: none; } }
`;

export default function FriendsDropdown() {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const { list, loading, refresh } = useFriendsList();
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const toggle = () => {
        if (!open) refresh();
        setOpen((o) => !o);
    };

    const respond = async (id, verb) => {
        setBusyId(id);
        await friendAction(`/friends/requests/${id}/${verb}`, "POST");
        await refresh();
        setBusyId(null);
    };

    const online = list.friends.filter((f) => f.status !== "offline");
    const offline = list.friends.filter((f) => f.status === "offline");
    const incomingCount = list.incoming.length;
    const close = () => setOpen(false);

    return (
        <div style={{ position: "relative", display: "inline-flex" }}>
            <style>{SOCIAL_STYLES}</style>
            <style>{DROPDOWN_STYLES}</style>
            <button className="fd-trigger" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}
                aria-label={incomingCount ? `Friends, ${incomingCount} pending ${incomingCount === 1 ? "request" : "requests"}` : "Friends"}>
                <Users size={16} />
                {incomingCount > 0 && <span className="fd-badge" aria-hidden="true">{incomingCount}</span>}
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={close} />
                        <motion.div
                            className="fd-panel"
                            role="dialog"
                            aria-label="Friends"
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
                        >
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--s2)" }}>
                                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: "var(--text-900)", margin: 0 }}>Friends</h2>
                                <button className="sb-btn sb-btn--ghost sb-btn--small" style={{ border: "none" }}
                                    onClick={() => { close(); router.push("/friends"); }}>
                                    See all
                                </button>
                            </div>

                            {loading ? (
                                <p className="sb-status">Loading…</p>
                            ) : (
                                <>
                                    {incomingCount > 0 && (
                                        <div className="fd-section">
                                            <div className="sb-label">Requests · {incomingCount}</div>
                                            {list.incoming.map((p) => (
                                                <FriendRow key={p.id} person={p} compact onNavigate={close} actions={<>
                                                    <button className="sb-btn sb-btn--primary sb-btn--small" disabled={busyId === p.id}
                                                        onClick={() => respond(p.id, "accept")} aria-label={`Accept ${p.username}`}>
                                                        <Check size={14} />
                                                    </button>
                                                    <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busyId === p.id}
                                                        onClick={() => respond(p.id, "decline")} aria-label={`Decline ${p.username}`}>
                                                        <X size={14} />
                                                    </button>
                                                </>} />
                                            ))}
                                        </div>
                                    )}

                                    {list.friends.length === 0 && incomingCount === 0 ? (
                                        <div className="fd-section">
                                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", margin: "0 0 var(--s3)" }}>
                                                No friends yet. Add someone by username to see when they&apos;re online.
                                            </p>
                                            <button className="sb-btn sb-btn--small" onClick={() => { close(); router.push("/friends"); }}>
                                                Add a friend
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {online.length > 0 && (
                                                <div className="fd-section">
                                                    <div className="sb-label">Online · {online.length}</div>
                                                    {online.map((f) => (
                                                        <FriendRow key={f.id} person={f} status={f.status} compact onNavigate={close}
                                                            actions={f.status === "online" && (
                                                                <button className="sb-btn sb-btn--primary sb-btn--small"
                                                                    onClick={() => { close(); router.push(`/create?invite=${f.id}`); }}
                                                                    aria-label={`Invite ${f.username}`}>
                                                                    <Send size={13} /> Invite
                                                                </button>
                                                            )} />
                                                    ))}
                                                </div>
                                            )}
                                            {offline.length > 0 && (
                                                <div className="fd-section">
                                                    <div className="sb-label">Offline · {offline.length}</div>
                                                    {offline.map((f) => (
                                                        <FriendRow key={f.id} person={f} status="offline" compact onNavigate={close} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
