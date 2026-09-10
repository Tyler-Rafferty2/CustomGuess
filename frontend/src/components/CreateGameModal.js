"use client";
import { apiFetch } from "@/lib/api";
import { imgUrl } from "@/lib/imgUrl";
import { DESIGN_TOKENS } from "@/app/create/LobbyForm";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Shuffle, Lock, Unlock, MessageSquare, Timer, Check, Loader2 } from "lucide-react";
import SetCover from "@/components/SetCover";

const MODAL_STYLES = `
  .cgm-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(26, 21, 16, 0.5);
    display: flex; align-items: center; justify-content: center;
    padding: var(--s4);
    animation: cgm-fadeIn 150ms ease-out;
  }
  @keyframes cgm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .cgm-panel {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    width: 100%; max-width: 420px;
    max-height: 90vh;
    display: flex; flex-direction: column;
    animation: cgm-slideUp 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes cgm-slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  .cgm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--s5) var(--s5) 0;
  }
  .cgm-title {
    font-family: 'Fraunces', serif; font-size: var(--text-lg); font-weight: 700;
    color: var(--text-900);
  }
  .cgm-close {
    background: none; border: none; cursor: pointer; color: var(--text-400);
    padding: 4px; display: flex; align-items: center; justify-content: center;
  }
  .cgm-close:hover { color: var(--text-900); }
  .cgm-body { padding: var(--s5); overflow-y: auto; }
  .cgm-error {
    color: var(--state-out); font-family: 'DM Sans', sans-serif; font-size: var(--text-sm);
    margin-bottom: var(--s4);
  }
  .cgm-footer { padding: var(--s5); border-top: 1px solid var(--border); }
`;

export default function CreateGameModal({ set, onClose }) {
  const router = useRouter();

  const [selectSecret, setSelectSecret] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [chatFeature, setChatFeature] = useState(true);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(0);
  const [charSelectMode, setCharSelectMode] = useState("all");
  const [randomCount, setRandomCount] = useState(null);
  const [randomCountDraft, setRandomCountDraft] = useState("");
  const [randomPreview, setRandomPreview] = useState([]);
  const [manualSelected, setManualSelected] = useState(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [conflictLobbyId, setConflictLobbyId] = useState(null);

  useEffect(() => {
    const total = set.characters?.length ?? 0;
    const min = Math.max(set.minCharacters ?? 6, 6);
    const count = Math.max(min, total);
    setRandomCount(count);
    setRandomCountDraft(String(count));
    setManualSelected(new Set((set.characters || []).map((c) => c.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  useEffect(() => {
    if (charSelectMode !== "random" || !set.characters) return;
    const shuffled = [...set.characters].sort(() => Math.random() - 0.5);
    setRandomPreview(shuffled.slice(0, randomCount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charSelectMode]);

  const getCharacterIds = () => {
    if (charSelectMode === "all") return [];
    if (charSelectMode === "random") return randomPreview.map((c) => c.id);
    return Array.from(manualSelected);
  };

  const handleCreateLobby = async () => {
    setError(null);
    setIsCreating(true);
    const randomizeSecret = !selectSecret;
    try {
      const res = await apiFetch(`/lobby/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: set.id,
          isPrivate,
          randomizeSecret,
          chatFeature,
          turnTimerSeconds,
          characterIds: getCharacterIds(),
          randomCount: charSelectMode === "random" ? (randomCount ?? 0) : 0,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflictLobbyId(data.lobbyId);
        setIsCreating(false);
        return;
      }
      if (!res.ok) { setError(data.error || "Something went wrong"); setIsCreating(false); return; }
      router.push(`/lobby/${data.id}`);
    } catch {
      setError("Network error");
      setIsCreating(false);
    }
  };

  const handleForfeitAndCreate = async () => {
    setIsCreating(true);
    try {
      await apiFetch(`/lobby/forfeit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId: conflictLobbyId }),
      });
      setConflictLobbyId(null);
      setIsCreating(false);
      handleCreateLobby();
    } catch {
      setError("Network error");
      setIsCreating(false);
    }
  };

  const minRequired = Math.max(set.minCharacters ?? 6, 6);
  const createDisabled =
    isCreating ||
    (charSelectMode === "all" && (set.characters?.length ?? 0) < minRequired) ||
    (charSelectMode === "random" && randomPreview.length < minRequired) ||
    (charSelectMode === "manual" && manualSelected.size < minRequired);

  return (
    <>
      <style>{DESIGN_TOKENS}</style>
      <style>{MODAL_STYLES}</style>
      <div className="cgm-overlay" onClick={() => !isCreating && onClose()}>
        <div className="cgm-panel" onClick={(e) => e.stopPropagation()}>
          {conflictLobbyId ? (
            <div style={{ padding: "var(--s6)" }}>
              <div className="cgm-title" style={{ marginBottom: "var(--s2)" }}>You&apos;re already in a game</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", marginBottom: "var(--s5)", lineHeight: 1.6 }}>
                You have an active game in progress. Would you like to rejoin it, or forfeit and start a new one with {set.name}?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                <button className="btn btn--primary btn--large btn--full" onClick={() => router.push(`/lobby/${conflictLobbyId}`)}>
                  Rejoin Game
                </button>
                <button className="btn btn--large btn--full" onClick={handleForfeitAndCreate} disabled={isCreating}>
                  Forfeit &amp; Start New
                </button>
                <button
                  onClick={() => setConflictLobbyId(null)}
                  style={{ background: "none", border: "none", color: "var(--text-400)", fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", cursor: "pointer", padding: 4 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="cgm-header">
                <span className="cgm-title">New Game</span>
                <button className="cgm-close" onClick={onClose} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="cgm-body">
                {error && <div className="cgm-error">{error}</div>}

                <div className="selected-preview" style={{ marginBottom: "var(--s4)" }}>
                  <SetCover coverImageName={set.coverImageName} alt={set.name} className="selected-preview__img" style={{ height: 60, borderRadius: 4 }} />
                  <div className="selected-preview__body">
                    <div className="selected-preview__eyebrow">Selected Set</div>
                    <div className="selected-preview__name">{set.name}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "var(--s4)" }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-400)", marginBottom: "var(--s2)" }}>
                    Characters
                  </div>
                  <div className="char-mode-bar" style={{ marginBottom: "var(--s3)" }}>
                    {[
                      { key: "all", label: `All (${set.characters?.length ?? 0})` },
                      { key: "random", label: "Random" },
                      { key: "manual", label: "Manual" },
                    ].map((m) => (
                      <button
                        key={m.key}
                        className={`char-mode-pill${charSelectMode === m.key ? " char-mode-pill--active" : ""}`}
                        onClick={() => setCharSelectMode(m.key)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {charSelectMode === "random" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-600)", display: "flex", alignItems: "center", gap: 6 }}>
                        Include
                        <input
                          type="text"
                          value={randomCountDraft}
                          onChange={(e) => setRandomCountDraft(e.target.value)}
                          onBlur={() => {
                            const min = Math.max(set.minCharacters ?? 6, 6);
                            const max = set.characters?.length ?? 6;
                            const n = Math.min(Math.max(parseInt(randomCountDraft, 10) || min, min), max);
                            setRandomCount(n);
                            setRandomCountDraft(String(n));
                            const shuffled = [...set.characters].sort(() => Math.random() - 0.5);
                            setRandomPreview(shuffled.slice(0, n));
                          }}
                          style={{ width: 44, padding: "2px 6px", fontSize: "var(--text-sm)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, border: "1px solid var(--border)", borderRadius: "var(--r)", background: "var(--surface-0)", color: "var(--text-900)", textAlign: "center" }}
                        />
                        of {set.characters?.length} characters
                      </div>
                      <input
                        type="range"
                        min={Math.max(set.minCharacters ?? 6, 6)}
                        max={Math.max(set.minCharacters ?? 6, set.characters?.length ?? 6)}
                        value={randomCount ?? set.characters?.length}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setRandomCount(n);
                          setRandomCountDraft(String(n));
                          const shuffled = [...set.characters].sort(() => Math.random() - 0.5);
                          setRandomPreview(shuffled.slice(0, n));
                        }}
                        style={{ accentColor: "var(--accent)", width: "100%" }}
                      />
                      <button
                        onClick={() => {
                          const shuffled = [...set.characters].sort(() => Math.random() - 0.5);
                          setRandomPreview(shuffled.slice(0, randomCount));
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--r)", cursor: "pointer", color: "var(--text-600)", width: "fit-content" }}
                      >
                        <Shuffle size={12} /> Re-randomize
                      </button>
                      {randomPreview.length > 0 && (
                        <div className="char-picker-grid">
                          {randomPreview.map((c) => (
                            <div key={c.id} className="char-picker-item char-picker-item--on">
                              <img src={imgUrl(c.image)} alt={c.name} className="char-picker-item__img" />
                              <span className="char-picker-item__name">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {charSelectMode === "manual" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-600)" }}>
                        {manualSelected.size} of {set.characters?.length} selected
                      </div>
                      <div className="char-picker-grid">
                        {(set.characters || []).map((c) => {
                          const on = manualSelected.has(c.id);
                          return (
                            <div
                              key={c.id}
                              className={`char-picker-item ${on ? "char-picker-item--on" : "char-picker-item--off"}`}
                              onClick={() => setManualSelected((prev) => {
                                const next = new Set(prev);
                                const min = Math.max(set.minCharacters ?? 6, 6);
                                if (next.has(c.id)) {
                                  if (next.size > min) next.delete(c.id);
                                } else {
                                  next.add(c.id);
                                }
                                return next;
                              })}
                            >
                              <img src={imgUrl(c.image)} alt={c.name} className="char-picker-item__img" />
                              {on && (
                                <span className="char-picker-item__check">
                                  <Check size={9} strokeWidth={3} />
                                </span>
                              )}
                              <span className="char-picker-item__name">{c.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="settings-stack">
                  <label className="toggle-row" htmlFor="cgm-select-secret">
                    <div className="toggle-row__left">
                      <Shuffle size={16} className="toggle-row__icon" />
                      <div>
                        <div className="toggle-row__title">Select Secret Character</div>
                        <div className="toggle-row__sub">Choose your own character</div>
                      </div>
                    </div>
                    <input
                      id="cgm-select-secret"
                      type="checkbox"
                      checked={selectSecret}
                      onChange={(e) => setSelectSecret(e.target.checked)}
                    />
                  </label>

                  <label className="toggle-row" htmlFor="cgm-is-private">
                    <div className="toggle-row__left">
                      {isPrivate ? <Lock size={16} className="toggle-row__icon" /> : <Unlock size={16} className="toggle-row__icon" />}
                      <div>
                        <div className="toggle-row__title">Private Lobby</div>
                        <div className="toggle-row__sub">Join with code or link only</div>
                      </div>
                    </div>
                    <input
                      id="cgm-is-private"
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                  </label>

                  <label className="toggle-row" htmlFor="cgm-chat-feature">
                    <div className="toggle-row__left">
                      <MessageSquare size={16} className="toggle-row__icon" />
                      <div>
                        <div className="toggle-row__title">Enable Chat</div>
                        <div className="toggle-row__sub">Ask questions via chat</div>
                      </div>
                    </div>
                    <input
                      id="cgm-chat-feature"
                      type="checkbox"
                      checked={chatFeature}
                      onChange={(e) => {
                        setChatFeature(e.target.checked);
                        if (!e.target.checked) setTurnTimerSeconds(0);
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0 4px", opacity: chatFeature ? 1 : 0.4, pointerEvents: chatFeature ? "auto" : "none", transition: "opacity 150ms" }}>
                    <div className="toggle-row__left" style={{ marginBottom: 4 }}>
                      <Timer size={16} className="toggle-row__icon" />
                      <div>
                        <div className="toggle-row__title">Turn Timer</div>
                        <div className="toggle-row__sub">{chatFeature ? "Auto-forfeit if time runs out" : "Requires chat mode"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { label: "Off", value: 0 },
                        { label: "30s", value: 30 },
                        { label: "1 min", value: 60 },
                        { label: "2 min", value: 120 },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTurnTimerSeconds(value)}
                          style={{
                            flex: 1,
                            height: 34,
                            border: `1px solid ${turnTimerSeconds === value ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: "var(--r)",
                            background: turnTimerSeconds === value ? "var(--accent)" : "var(--surface-0)",
                            color: turnTimerSeconds === value ? "#fff" : "var(--text-600)",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 150ms",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="cgm-footer">
                <button
                  className="btn btn--primary btn--large btn--full"
                  onClick={handleCreateLobby}
                  disabled={createDisabled}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {isCreating && <Loader2 size={15} style={{ animation: "gw-spin 1s linear infinite" }} />}
                  {isCreating ? "Creating…" : "Create Lobby"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
