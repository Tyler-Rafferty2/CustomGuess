"use client";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Send, UserPlus } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { apiFetch } from "@/lib/api";
import { userProfilePath } from "@/lib/slug";
import { UserContext } from "@/context/UserContext";
import FriendRow from "@/components/social/FriendRow";
import SetGrid from "@/components/social/SetGrid";
import useFriendsList, { friendAction } from "@/components/social/useFriendsList";
import { SOCIAL_STYLES, initials } from "@/components/social/socialStyles";

const PAGE_STYLES = `
  .fp-layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--s4); align-items: start; }
  .fp-card { background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--r); padding: var(--s5); }
  .fp-tabs { display: flex; gap: var(--s5); border-bottom: 1px solid var(--border); margin-bottom: var(--s3); overflow-x: auto; }
  .fp-tab {
    background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
    padding: var(--s2) 0; min-height: 44px; cursor: pointer; white-space: nowrap;
    font-family: 'DM Sans', sans-serif; font-size: var(--text-base); font-weight: 500; color: var(--text-400);
    transition: color 150ms cubic-bezier(0,0,0.2,1);
  }
  .fp-tab:hover { color: var(--text-600); }
  .fp-tab[aria-selected="true"] { color: var(--text-900); font-weight: 600; border-bottom-color: var(--accent); }
  .fp-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .fp-input {
    width: 100%; height: 40px; padding: 0 var(--s3); border-radius: var(--r);
    border: 1px solid var(--border); background: var(--surface-0); color: var(--text-900);
    font-family: 'DM Sans', sans-serif; font-size: var(--text-base);
  }
  .fp-input:focus { outline: 2px solid var(--accent); outline-offset: 2px; border-color: var(--accent); }
  @media (pointer: coarse) { .fp-input { height: 44px; } }
  .fp-suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 10; margin: 0; padding: var(--s1);
    list-style: none; background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--r);
  }
  .fp-suggestion {
    display: flex; align-items: center; gap: var(--s2); min-height: 44px; padding: 0 var(--s2); border-radius: var(--r);
    font-family: 'DM Sans', sans-serif; font-size: var(--text-base); color: var(--text-900); cursor: pointer;
  }
  .fp-suggestion[aria-selected="true"] { background: var(--surface-1); }
  .fp-empty { font-family: 'DM Sans', sans-serif; font-size: var(--text-base); color: var(--text-400); margin: var(--s3) 0; }
  .fp-list > * + * { border-top: 1px solid var(--surface-1); }
  @media (max-width: 768px) { .fp-layout { grid-template-columns: 1fr; } .fp-add { order: -1; } }
  @media (prefers-reduced-motion: reduce) { .fp-tab { transition: none; } }
`;

const TABS = [
    { key: "friends", label: "Friends" },
    { key: "requests", label: "Requests" },
    { key: "following", label: "Following" },
];

const REL_HINT = { friends: "Friends", outgoing: "Request sent", incoming: "Sent you a request" };

function AddFriendBox({ onAdded }) {
    const [username, setUsername] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);

    // Debounced prefix search; ignores responses for queries the user has typed past.
    useEffect(() => {
        const q = username.trim();
        if (q.length < 2) { setSuggestions([]); return; }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (!cancelled) { setSuggestions(data); setActive(-1); }
            } catch {
                // leave the previous suggestions
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [username]);

    const pick = (s) => {
        setUsername(s.username);
        setOpen(false);
        setSuggestions([]);
        setMessage(s.relationship === "none" ? null : { error: false, text: `${s.username}: ${REL_HINT[s.relationship]}.` });
    };

    const onKeyDown = (e) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
        else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
        else if (e.key === "Escape") { setOpen(false); }
    };

    const submit = async (e) => {
        e.preventDefault();
        const name = username.trim();
        if (!name) return;
        setBusy(true);
        setMessage(null);
        setOpen(false);
        const error = await friendAction("/friends/requests", "POST", { username: name });
        setBusy(false);
        if (error) {
            setMessage({ error: true, text: error });
            return;
        }
        setMessage({ error: false, text: `Request sent to ${name}.` });
        setUsername("");
        onAdded();
    };

    const showList = open && suggestions.length > 0;

    return (
        <form className="fp-card fp-add" onSubmit={submit}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: "var(--text-900)", margin: "0 0 var(--s3)" }}>Add friend</h2>
            <label htmlFor="fp-username" className="sb-label" style={{ display: "block", marginBottom: "var(--s2)" }}>Username</label>
            <div style={{ position: "relative" }}>
                <input id="fp-username" className="fp-input" value={username}
                    onChange={(e) => { setUsername(e.target.value); setOpen(true); setMessage(null); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={onKeyDown}
                    role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls="fp-suggestions"
                    aria-activedescendant={active >= 0 ? `fp-suggestion-${active}` : undefined}
                    autoComplete="off" spellCheck={false} maxLength={40} placeholder="Start typing a username" />
                {showList && (
                    <ul id="fp-suggestions" role="listbox" className="fp-suggestions">
                        {suggestions.map((s, i) => (
                            <li key={s.id} id={`fp-suggestion-${i}`} role="option" aria-selected={i === active}
                                className="fp-suggestion" onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                                onMouseEnter={() => setActive(i)}>
                                <span className="sb-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{initials(s.username)}</span>
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.username}</span>
                                {REL_HINT[s.relationship] && <span className="sb-status">{REL_HINT[s.relationship]}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <button type="submit" className="sb-btn sb-btn--primary" disabled={busy || !username.trim()} style={{ width: "100%", marginTop: "var(--s3)" }}>
                <UserPlus size={14} /> Send request
            </button>
            {message && (
                <p role="status" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", margin: "var(--s2) 0 0",
                    color: message.error ? "var(--state-out)" : "var(--text-600)" }}>
                    {message.text}
                </p>
            )}
        </form>
    );
}

function FollowingTab() {
    const [feed, setFeed] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = () => apiFetch("/follows")
        .then((res) => (res.ok ? res.json() : { creators: [], sets: [] }))
        .then(setFeed)
        .catch(() => setFeed({ creators: [], sets: [] }));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    const unfollow = async (id) => {
        setBusyId(id);
        await apiFetch(`/follows/${id}`, { method: "DELETE" }).catch(() => {});
        await load();
        setBusyId(null);
    };

    if (!feed) return <p className="fp-empty">Loading…</p>;
    if (feed.creators.length === 0) {
        return (
            <p className="fp-empty">
                You&apos;re not following anyone yet. Follow creators from their profile to keep track of their sets.{" "}
                <Link href="/gallery" style={{ color: "var(--accent)", fontWeight: 600 }}>Browse sets</Link>
            </p>
        );
    }
    return (
        <>
            <div className="fp-list">
                {feed.creators.map((c) => (
                    <FriendRow key={c.id} person={c} actions={
                        <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busyId === c.id} onClick={() => unfollow(c.id)}>
                            Unfollow
                        </button>
                    } />
                ))}
            </div>
            <h3 className="sb-label" style={{ margin: "var(--s5) 0 var(--s3)" }}>Their sets, newest first</h3>
            {feed.sets.length === 0
                ? <p className="fp-empty">No public sets from the creators you follow yet.</p>
                : <SetGrid sets={feed.sets} showCreator />}
        </>
    );
}

export default function FriendsPage() {
    const { user, isLoading } = useContext(UserContext);
    const router = useRouter();
    const { list, loading, refresh } = useFriendsList();
    const [tab, setTab] = useState("friends");
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState(null);

    const act = async (id, path, method) => {
        setBusyId(id);
        setError(await friendAction(path, method));
        await refresh();
        setBusyId(null);
    };

    const signedUp = user && !user.isGuest;
    const requestCount = list.incoming.length;

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            <style>{SOCIAL_STYLES}</style>
            <style>{PAGE_STYLES}</style>
            <Navbar />
            <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "var(--s6) var(--s4)", width: "100%" }}>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-900)", margin: "0 0 var(--s5)" }}>
                    Friends
                </h1>

                {isLoading ? null : !signedUp ? (
                    <div className="fp-card" style={{ maxWidth: 480 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", margin: "0 0 var(--s4)" }}>
                            Create a free account to add friends, see when they&apos;re online, and invite them straight into a game.
                        </p>
                        <button className="sb-btn sb-btn--primary" onClick={() => router.push("/signup")}>Sign up</button>
                    </div>
                ) : (
                    <div className="fp-layout">
                        <section className="fp-card">
                            <div className="fp-tabs" role="tablist">
                                {TABS.map((t) => (
                                    <button key={t.key} role="tab" className="fp-tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
                                        {t.label}{t.key === "requests" && requestCount > 0 ? ` (${requestCount})` : ""}
                                    </button>
                                ))}
                            </div>
                            {error && <p role="alert" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--state-out)" }}>{error}</p>}

                            <div role="tabpanel">
                                {tab === "friends" && (loading ? <p className="fp-empty">Loading…</p> : list.friends.length === 0 ? (
                                    <p className="fp-empty">No friends yet. Add someone by username, or from their profile.</p>
                                ) : (
                                    <div className="fp-list">
                                        {list.friends.map((f) => (
                                            <FriendRow key={f.id} person={f} status={f.status} actions={
                                                f.status === "online" && (
                                                    <button className="sb-btn sb-btn--primary sb-btn--small" onClick={() => router.push(`/create?invite=${f.id}`)}>
                                                        <Send size={13} /> Invite
                                                    </button>
                                                )
                                            } />
                                        ))}
                                    </div>
                                ))}

                                {tab === "requests" && (
                                    <>
                                        <h3 className="sb-label" style={{ margin: "var(--s2) 0" }}>Received</h3>
                                        {list.incoming.length === 0 ? <p className="fp-empty">No pending requests.</p> : (
                                            <div className="fp-list">
                                                {list.incoming.map((p) => (
                                                    <FriendRow key={p.id} person={p} actions={<>
                                                        <button className="sb-btn sb-btn--primary sb-btn--small" disabled={busyId === p.id}
                                                            onClick={() => act(p.id, `/friends/requests/${p.id}/accept`, "POST")}>
                                                            <Check size={13} /> Accept
                                                        </button>
                                                        <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busyId === p.id}
                                                            onClick={() => act(p.id, `/friends/requests/${p.id}/decline`, "POST")} aria-label={`Decline ${p.username}`}>
                                                            <X size={13} />
                                                        </button>
                                                    </>} />
                                                ))}
                                            </div>
                                        )}
                                        <h3 className="sb-label" style={{ margin: "var(--s5) 0 var(--s2)" }}>Sent</h3>
                                        {list.outgoing.length === 0 ? <p className="fp-empty">No requests waiting on a reply.</p> : (
                                            <div className="fp-list">
                                                {list.outgoing.map((p) => (
                                                    <FriendRow key={p.id} person={p} actions={
                                                        <button className="sb-btn sb-btn--ghost sb-btn--small" disabled={busyId === p.id}
                                                            onClick={() => act(p.id, `/friends/requests/${p.id}`, "DELETE")}>
                                                            Cancel
                                                        </button>
                                                    } />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {tab === "following" && <FollowingTab />}
                            </div>
                        </section>

                        <AddFriendBox onAdded={refresh} />
                    </div>
                )}
                {signedUp && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)", marginTop: "var(--s4)" }}>
                        Your profile: <Link href={userProfilePath(user.id, user.username)} style={{ color: "var(--text-600)" }}>{user.username}</Link>
                    </p>
                )}
            </main>
            <Footer />
        </div>
    );
}
