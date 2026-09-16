"use client";
import { useEffect, useState } from "react";
import { Copy, Check, X } from "lucide-react";

function track(name, data) {
    if (typeof window !== "undefined" && window.umami) {
        window.umami.track(name, data);
    }
}

const btnBase = {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    borderRadius: "var(--r)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};
const btnPrimary = { ...btnBase, border: "none", background: "var(--accent)", color: "#fff" };
const btnGhost = { ...btnBase, border: "1px solid var(--border)", background: "transparent", color: "var(--text-900)" };

export default function ShareModal({ open, onClose, url, title, message, eventContext }) {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        track("share_opened", { context: eventContext });

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, eventContext, onClose]);

    if (!open) return null;

    const shareText = `${message}\n${url}`;
    const canWebShare = typeof navigator !== "undefined" && !!navigator.share;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setIsCopied(true);
            track("share_completed", { context: eventContext, method: "copy" });
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // clipboard access denied or unavailable — no-op, user can still select the text manually
        }
    };

    const handleWebShare = async () => {
        try {
            await navigator.share({ title, text: message, url });
            track("share_completed", { context: eventContext, method: "web_share" });
        } catch (err) {
            if (err?.name !== "AbortError") {
                // ignore — user cancelled or the browser rejected the share sheet
            }
        }
    };

    const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;

    return (
        <div
            style={{ position: "fixed", inset: 0, background: "rgba(26,21,16,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--s6)" }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Share"
                style={{
                    width: "100%", maxWidth: "min(480px, calc(100vw - 32px))", padding: "var(--s6)",
                    background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: "var(--r)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s5)" }}>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: "var(--text-900)", margin: 0 }}>Share</h2>
                    <button onClick={onClose} aria-label="Close share dialog" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-400)", padding: "var(--s1)", display: "flex" }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "var(--text-600)", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "var(--s4)", lineHeight: 1.5, marginBottom: "var(--s4)" }}>
                    {message}
                </p>

                <div style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)" }}>
                    <div style={{ flex: 1, minWidth: 0, height: 40, display: "flex", alignItems: "center", padding: "0 var(--s3)", borderRadius: "var(--r)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-600)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {url}
                    </div>
                    <button
                        onClick={handleCopy}
                        style={{ ...btnGhost, height: 40, padding: "0 var(--s4)", gap: "var(--s2)", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                        {isCopied ? <Check size={15} /> : <Copy size={15} />}
                        {isCopied ? "Copied" : "Copy"}
                    </button>
                </div>

                <div style={{ display: "flex", gap: "var(--s3)" }}>
                    {canWebShare && (
                        <button style={{ ...btnPrimary, flex: 1, height: 44 }} onClick={handleWebShare}>
                            Share
                        </button>
                    )}
                    <a
                        href={twitterHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("share_completed", { context: eventContext, method: "twitter" })}
                        style={{ ...(canWebShare ? btnGhost : btnPrimary), flex: 1, height: 44, textDecoration: "none" }}
                    >
                        Share to X
                    </a>
                </div>
            </div>
        </div>
    );
}
