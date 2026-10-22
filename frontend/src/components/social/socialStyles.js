// Shared styles for the friends / following / profile components.
// Tokens come from globals.css; see designSchema.txt §2–§5.
export const SOCIAL_STYLES = `
  .sb-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--s2);
    height: 40px; padding: 0 var(--s4); border-radius: var(--r);
    font-family: 'DM Sans', sans-serif; font-size: var(--text-base); font-weight: 600;
    border: 1px solid var(--border); background: var(--surface-1); color: var(--text-900);
    cursor: pointer; white-space: nowrap;
    transition: background 150ms cubic-bezier(0,0,0.2,1), border-color 150ms cubic-bezier(0,0,0.2,1);
  }
  .sb-btn:hover:not(:disabled) { border-color: var(--border-strong); background: var(--surface-2); }
  .sb-btn:active:not(:disabled) { background: var(--surface-2); }
  .sb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sb-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .sb-btn--primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .sb-btn--primary:hover:not(:disabled) { background: var(--accent-dim); border-color: var(--accent-dim); }
  .sb-btn--ghost { background: transparent; }
  .sb-btn--ghost:hover:not(:disabled) { background: var(--surface-1); }
  .sb-btn--danger { background: transparent; color: var(--state-out); border-color: var(--border); }
  .sb-btn--danger:hover:not(:disabled) { background: var(--surface-1); border-color: var(--state-out); }
  .sb-btn--small { height: 32px; padding: 0 var(--s3); font-size: var(--text-sm); }
  @media (pointer: coarse) { .sb-btn--small { min-height: 44px; } }

  .sb-avatar {
    /* circular avatar: the one explicit exception to --r */
    border-radius: 50%;
    background: var(--surface-2); color: var(--text-600);
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    font-family: 'DM Sans', sans-serif; font-weight: 600;
  }
  .sb-status { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: var(--text-sm); color: var(--text-400); }
  .sb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-400); flex-shrink: 0; }
  .sb-dot--online { background: var(--state-live); }
  .sb-dot--in_game { background: var(--accent); }
  .sb-label {
    font-family: 'DM Sans', sans-serif; font-size: var(--text-xs); font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-400);
  }
  @media (prefers-reduced-motion: reduce) { .sb-btn { transition: none; } }
`;

export const STATUS_LABEL = { online: "Online", in_game: "In a game", offline: "Offline" };

export function initials(name) {
    const parts = (name || "?").trim().split(/[\s_\-.]+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || "?").slice(0, 2);
    return letters.toUpperCase();
}
