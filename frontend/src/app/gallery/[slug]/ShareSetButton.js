"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
import ShareModal from "@/components/ShareModal";
import { buildGalleryShareContent } from "@/lib/shareMessage";

export default function ShareSetButton({ set }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    height: 48, padding: "0 24px", background: "transparent", color: "var(--text-900)",
                    border: "1px solid var(--border)", borderRadius: "var(--r)", fontFamily: "'DM Sans', sans-serif",
                    fontSize: "var(--text-base)", fontWeight: 600, cursor: "pointer",
                    marginBottom: "var(--s7)",
                }}
            >
                <Share2 size={17} />
                Share
            </button>
            {open && (
                <ShareModal
                    open={open}
                    onClose={() => setOpen(false)}
                    {...buildGalleryShareContent({ set, siteOrigin: window.location.origin })}
                    title={set.name}
                    eventContext="gallery"
                />
            )}
        </>
    );
}
