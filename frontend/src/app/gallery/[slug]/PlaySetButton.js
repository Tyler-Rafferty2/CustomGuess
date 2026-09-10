"use client";
import { useState } from "react";
import CreateGameModal from "@/components/CreateGameModal";

export default function PlaySetButton({ set }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 48, padding: "0 28px", background: "var(--accent)", color: "#fff",
          border: "none", borderRadius: "var(--r)", fontFamily: "'DM Sans', sans-serif",
          fontSize: "var(--text-base)", fontWeight: 600, cursor: "pointer",
          marginBottom: "var(--s7)",
        }}
      >
        Play with this set →
      </button>
      {open && <CreateGameModal set={set} onClose={() => setOpen(false)} />}
    </>
  );
}
