"use client";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserContext } from "@/context/UserContext";

/* Design tokens — v3.0 schema */
const T = {
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
};

const MAX_COMMENT = 500;
const EASE_OUT = [0.0, 0.0, 0.2, 1];

const dismissKey = (pollId) => `poll-dismissed-${pollId}`;

function readDismissed(pollId) {
  try {
    return localStorage.getItem(dismissKey(pollId)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(pollId) {
  try {
    localStorage.setItem(dismissKey(pollId), "1");
  } catch {}
}

export default function FeaturePoll() {
  const { user, isLoading } = useContext(UserContext);
  const reduceMotion = useReducedMotion();

  const [poll, setPoll] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState("vote"); // "vote" | "results"
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;
    apiFetch("/poll")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPoll(data);
        setDismissed(readDismissed(data.id));
        setMode(data.myVote ? "results" : "vote");
        setSelected(data.myVote?.optionKey ?? null);
        setComment(data.myVote?.comment ?? "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoading, user?.id, user?.isGuest]);

  if (isLoading || !user || !poll || dismissed) return null;

  const isGuest = !!user.isGuest;
  const hasVoted = !!poll.myVote;

  const dismiss = () => {
    writeDismissed(poll.id);
    setDismissed(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionKey: selected, comment }),
      });
      if (!res.ok) {
        setError((await res.text()).trim() || "Couldn't save your vote");
        return;
      }
      const data = await res.json();
      setPoll(data);
      setComment(data.myVote?.comment ?? "");
      setMode("results");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.aside
      className="feature-poll"
      aria-labelledby="feature-poll-title"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <style>{`
        .feature-poll {
          width: 100%; max-width: 320px;
          background: ${T.surface0}; border: 1px solid ${T.border};
          border-radius: 6px; padding: 20px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .feature-poll__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .feature-poll__eyebrow {
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: ${T.accent}; margin-bottom: 4px;
        }
        .feature-poll__title {
          font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700;
          line-height: 1.2; letter-spacing: -0.02em; color: ${T.text900};
        }
        .feature-poll__close {
          flex-shrink: 0; width: 44px; height: 44px; margin: -12px -12px 0 0;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; border-radius: 6px;
          color: ${T.text400}; cursor: pointer;
          transition: color 150ms, background 150ms;
        }
        .feature-poll__close:hover { color: ${T.text900}; background: ${T.surface1}; }
        .feature-poll__close:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }

        .feature-poll__options { display: flex; flex-direction: column; gap: 6px; border: none; }
        .feature-poll__option {
          display: flex; gap: 12px; align-items: flex-start;
          min-height: 44px; padding: 8px 12px;
          background: ${T.surface0}; border: 1px solid ${T.border}; border-radius: 6px;
          cursor: pointer; transition: border-color 150ms, background 150ms;
        }
        .feature-poll__option:hover { border-color: ${T.borderStrong}; background: ${T.surface1}; }
        .feature-poll__option--selected,
        .feature-poll__option--selected:hover { border-color: ${T.accent}; background: ${T.surface1}; }
        .feature-poll__option:focus-within { outline: 2px solid ${T.accent}; outline-offset: 2px; }
        .feature-poll__radio { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .feature-poll__dot {
          flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px;
          border: 1.5px solid ${T.borderStrong}; border-radius: 50%; /* circular radio indicator — explicit exception */
          display: flex; align-items: center; justify-content: center;
        }
        .feature-poll__option--selected .feature-poll__dot { border-color: ${T.accent}; }
        .feature-poll__option--selected .feature-poll__dot::after {
          content: ""; width: 8px; height: 8px; border-radius: 50%; background: ${T.accent};
        }
        .feature-poll__label { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: ${T.text900}; }
        .feature-poll__desc { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; line-height: 1.5; color: ${T.text600}; margin-top: 0; }

        .feature-poll__comment {
          width: 100%; height: 56px; padding: 8px 12px; resize: none;
          background: ${T.surface0}; border: 1px solid ${T.border}; border-radius: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.6; color: ${T.text900};
          outline: none; transition: border-color 150ms;
        }
        .feature-poll__comment::placeholder { color: ${T.text400}; }
        .feature-poll__comment:focus { border-color: ${T.accent}; }
        .feature-poll__meta {
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
          color: ${T.text400}; font-variant-numeric: tabular-nums;
        }
        .feature-poll__error { font-family: 'DM Sans', sans-serif; font-size: 12px; line-height: 1.5; color: ${T.stateOut}; }

        .feature-poll__submit {
          height: 44px; padding: 0 24px; align-self: flex-end;
          background: ${T.accent}; border: 1px solid ${T.accent}; border-radius: 6px;
          color: #FFFFFF; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          letter-spacing: 0.02em; cursor: pointer; outline: none;
          transition: background 150ms, border-color 150ms;
        }
        .feature-poll__submit:hover:not(:disabled) { background: ${T.accentDim}; border-color: ${T.accentDim}; }
        .feature-poll__submit:active:not(:disabled) { transform: scale(0.98); }
        .feature-poll__submit:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
        .feature-poll__submit:disabled { opacity: 0.38; cursor: not-allowed; }

        .feature-poll__link {
          background: none; border: none; padding: 0; min-height: 44px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: ${T.accent}; cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center;
        }
        .feature-poll__link:hover { color: ${T.accentDim}; text-decoration: underline; }
        .feature-poll__link:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 6px; }

        .feature-poll__result { display: flex; flex-direction: column; gap: 6px; }
        .feature-poll__result-row {
          display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${T.text900};
        }
        .feature-poll__result-row--mine { font-weight: 600; }
        .feature-poll__pct { font-variant-numeric: tabular-nums; color: ${T.text600}; }
        .feature-poll__track { height: 8px; background: ${T.surface1}; border-radius: 6px; overflow: hidden; }
        .feature-poll__bar { height: 100%; background: ${T.borderStrong}; border-radius: 6px; }
        .feature-poll__bar--mine { background: ${T.accent}; }

        @media (max-width: 1024px) {
          .feature-poll { max-width: 520px; }
        }
      `}</style>

      <div className="feature-poll__head">
        <div>
          <p className="feature-poll__eyebrow">Feature poll</p>
          <h2 id="feature-poll-title" className="feature-poll__title">{poll.question}</h2>
        </div>
        <button type="button" className="feature-poll__close" onClick={dismiss} aria-label="Dismiss poll">
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {isGuest && (
        <>
          <ul className="feature-poll__options" style={{ listStyle: "none" }}>
            {poll.options.map((o) => (
              <li key={o.key} className="feature-poll__option" style={{ cursor: "default" }}>
                <div>
                  <div className="feature-poll__label">{o.label}</div>
                  <div className="feature-poll__desc">{o.description}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/signup" className="feature-poll__link">Sign up to vote →</Link>
        </>
      )}

      {!isGuest && (
        /* Both views share one grid cell so the card is always as tall as the
           taller view — switching vote/results never resizes it (which would
           re-center and shift the hero beside it). */
        <div style={{ display: "grid" }}>
          <form
            onSubmit={submit}
            inert={mode !== "vote"}
            aria-hidden={mode !== "vote"}
            style={{
              gridArea: "1 / 1",
              visibility: mode === "vote" ? "visible" : "hidden",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <fieldset className="feature-poll__options">
              <legend className="feature-poll__meta" style={{ marginBottom: 4 }}>Pick one</legend>
              {poll.options.map((o) => {
                const isSel = selected === o.key;
                return (
                  <label key={o.key} className={`feature-poll__option${isSel ? " feature-poll__option--selected" : ""}`}>
                    <input
                      type="radio"
                      name="feature-poll"
                      value={o.key}
                      checked={isSel}
                      onChange={() => setSelected(o.key)}
                      className="feature-poll__radio"
                    />
                    <span className="feature-poll__dot" aria-hidden="true" />
                    <span>
                      <span className="feature-poll__label" style={{ display: "block" }}>{o.label}</span>
                      <span className="feature-poll__desc" style={{ display: "block" }}>{o.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div>
              <textarea
                className="feature-poll__comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                maxLength={MAX_COMMENT}
                placeholder="Something else? Tell us (optional)"
                aria-label="Optional comment"
              />
              {/* Error shares the counter's row so showing it doesn't add height */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="feature-poll__error" role="alert">{error}</span>
                <span className="feature-poll__meta">{comment.length}/{MAX_COMMENT}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              {hasVoted ? (
                <button type="button" className="feature-poll__link" onClick={() => { setMode("results"); setError(""); }}>
                  Cancel
                </button>
              ) : <span />}
              <button type="submit" className="feature-poll__submit" disabled={!selected || submitting}>
                {submitting ? "Saving…" : hasVoted ? "Update vote" : "Vote"}
              </button>
            </div>
          </form>

          {poll.results && (
            <div
              inert={mode !== "results"}
              aria-hidden={mode !== "results"}
              aria-live="polite"
              style={{
                gridArea: "1 / 1",
                visibility: mode === "results" ? "visible" : "hidden",
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              {poll.options.map((o) => {
                const pct = poll.results.percentages[o.key] ?? 0;
                const mine = poll.myVote?.optionKey === o.key;
                return (
                  <div key={o.key} className="feature-poll__result">
                    <div className={`feature-poll__result-row${mine ? " feature-poll__result-row--mine" : ""}`}>
                      <span>{o.label}{mine && <span className="feature-poll__meta"> · your vote</span>}</span>
                      <span className="feature-poll__pct">{pct}%</span>
                    </div>
                    <div className="feature-poll__track">
                      <motion.div
                        className={`feature-poll__bar${mine ? " feature-poll__bar--mine" : ""}`}
                        initial={{ width: reduceMotion ? `${pct}%` : 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE_OUT }}
                      />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span className="feature-poll__meta">
                  Thanks for voting · {poll.results.total} {poll.results.total === 1 ? "vote" : "votes"}
                </span>
                <button
                  type="button"
                  className="feature-poll__link"
                  onClick={() => {
                    setSelected(poll.myVote?.optionKey ?? null);
                    setComment(poll.myVote?.comment ?? "");
                    setMode("vote");
                  }}
                >
                  Change vote
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  );
}
