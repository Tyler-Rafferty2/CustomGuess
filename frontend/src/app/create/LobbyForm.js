"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageCropperIntegration from './ImageCropperIntegration';
import { UserCircle, ArrowLeft, Search, Plus, Check, Star, Lock, Unlock, MessageSquare, Shuffle } from "lucide-react";

// ─── Design Token Injection ───────────────────────────────────────────────────
const DESIGN_TOKENS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600&display=swap');

  :root {
    --bg:             #F7F3EE;
    --surface-0:      #FFFFFF;
    --surface-1:      #F2EDE7;
    --surface-2:      #E8E0D8;
    --accent:         #D9572B;
    --accent-light:   #F2C5B4;
    --accent-dim:     #B84422;
    --text-900:       #1A1510;
    --text-600:       #5C5047;
    --text-400:       #A0937F;
    --border:         #DDD5CA;
    --border-strong:  #C4B8A8;
    --state-out:      #C0392B;
    --state-live:     #2A7A56;

    --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px;
    --s5: 20px; --s6: 24px; --s8: 32px; --s10: 40px;
    --s12: 48px; --s16: 64px;
    --r: 6px;

    --text-hero: 42px; --text-xl: 26px; --text-lg: 20px;
    --text-md: 16px; --text-base: 14px; --text-sm: 12px; --text-xs: 11px;

    --dur-instant: 80ms; --dur-fast: 150ms; --dur-default: 250ms;
    --dur-slow: 400ms; --dur-scene: 600ms;
    --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
    --ease-in:  cubic-bezier(0.4, 0.0, 1.0, 1);
    --ease-snap: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .lobby-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .lobby-root {
    min-height: 100vh;
    background-color: var(--bg);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    color: var(--text-900);
  }

  /* ── Header ── */
  .lobby-header {
    background: var(--surface-0);
    border-bottom: 1px solid var(--border);
    padding: var(--s4) var(--s6);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .lobby-header__inner {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lobby-header__title {
    font-family: 'Fraunces', serif;
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--text-900);
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .lobby-header__sub {
    font-size: var(--text-sm);
    color: var(--text-400);
    font-weight: 500;
    margin-top: 2px;
  }
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: var(--s2);
    padding: var(--s2) var(--s3);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-600);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out),
                border-color var(--dur-fast) var(--ease-out),
                color var(--dur-fast) var(--ease-out);
    height: 40px;
  }
  .btn-back:hover {
    background: var(--surface-1);
    border-color: var(--border-strong);
    color: var(--text-900);
  }
  .btn-back:active { background: var(--surface-2); }

  /* ── Layout ── */
  .lobby-body {
    display: flex;
    height: calc(100vh - 73px);
    overflow: hidden;
    max-width: 1080px;
    margin: 0 auto;
    width: 100%;
  }

  /* ── Left Panel ── */
  .panel-left {
    flex: 1;
    overflow-y: auto;
    padding: var(--s6);
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  /* ── Tabs ── */
  .tab-bar {
    display: flex;
    gap: var(--s1);
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 3px;
    margin-bottom: var(--s6);
  }
  .tab-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s2);
    padding: var(--s2) var(--s4);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background var(--dur-fast) var(--ease-out),
                color var(--dur-fast) var(--ease-out);
    background: transparent;
    color: var(--text-600);
    height: 40px;
    white-space: nowrap;
  }
  .tab-btn:hover:not(.tab-btn--active) {
    background: var(--surface-1);
    color: var(--text-900);
  }
  .tab-btn--active {
    background: var(--accent);
    color: #fff;
  }
  .tab-btn--active:hover { background: var(--accent-dim); }

  /* ── Search ── */
  .search-wrap {
    position: relative;
    margin-bottom: var(--s6);
  }
  .search-icon {
    position: absolute;
    left: var(--s4);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-400);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    height: 40px;
    padding: 0 var(--s4) 0 42px;
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    color: var(--text-900);
    transition: border-color var(--dur-fast) var(--ease-out);
    outline: none;
  }
  .search-input::placeholder { color: var(--text-400); }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  /* ── Sets Grid ── */
  .sets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--s4);
  }
  .set-card {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    overflow: hidden;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease-out),
                transform var(--dur-default) var(--ease-out);
  }
  .set-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }
  .set-card--selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
  .set-card__img {
    width: 100%;
    height: 140px;
    object-fit: cover;
    display: block;
    background: var(--surface-1);
    position: relative;
  }
  .set-card__img-wrap {
    position: relative;
    height: 140px;
    overflow: hidden;
    background: var(--surface-1);
  }
  .set-card__check {
    position: absolute;
    top: var(--s3);
    right: var(--s3);
    width: 28px;
    height: 28px;
    background: var(--accent);
    border-radius: 50%; /* circle: intentional exception to --r */
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .set-card__body { padding: var(--s4); }
  .set-card__name {
    font-family: 'Fraunces', serif;
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-900);
    margin-bottom: var(--s1);
    letter-spacing: -0.01em;
  }
  .set-card__desc {
    font-size: var(--text-sm);
    color: var(--text-400);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: var(--s3);
  }
  .set-card__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .set-card__creator { font-size: var(--text-xs); color: var(--text-400); font-weight: 500; }
  .set-card__rating {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-600);
  }
  .set-card__badge {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px var(--s2);
    border-radius: var(--r);
    background: var(--surface-1);
    color: var(--text-600);
    border: 1px solid var(--border);
  }
  .set-card__badge--public {
    background: #EEF7F2;
    color: var(--state-live);
    border-color: #C2E0D0;
  }

  /* ── Empty / Loading States ── */
  .state-empty {
    grid-column: 1 / -1;
    padding: var(--s16) 0;
    text-align: center;
    color: var(--text-400);
    font-size: var(--text-base);
  }
  .state-loading {
    grid-column: 1 / -1;
    padding: var(--s16) 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s4);
    color: var(--text-400);
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .guest-notice {
    grid-column: 1 / -1;
    padding: var(--s6);
    background: #FEF7ED;
    border: 1px solid #F5D28A;
    border-radius: var(--r);
    display: flex;
    align-items: flex-start;
    gap: var(--s4);
  }
  .guest-notice__icon { color: #C98C1A; flex-shrink: 0; margin-top: 2px; }
  .guest-notice__title {
    font-weight: 600;
    font-size: var(--text-md);
    color: #7A5210;
    margin-bottom: 2px;
  }
  .guest-notice__sub { font-size: var(--text-sm); color: #A0722A; }

  /* ── Create Set Form ── */
  .create-form {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: var(--s8);
  }
  .create-form__title {
    font-family: 'Fraunces', serif;
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-900);
    letter-spacing: -0.02em;
    margin-bottom: var(--s6);
    display: flex;
    align-items: center;
    gap: var(--s3);
  }
  .create-form__row {
    display: flex;
    gap: var(--s6);
    margin-bottom: var(--s5);
  }
  .create-form__col { flex: 1; display: flex; flex-direction: column; gap: var(--s4); }
  .create-form__cover { width: 220px; flex-shrink: 0; }

  .field-label {
    display: block;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-600);
    margin-bottom: var(--s2);
    letter-spacing: 0.02em;
  }
  .field-input {
    width: 100%;
    height: 40px;
    padding: 0 var(--s4);
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    color: var(--text-900);
    outline: none;
    transition: border-color var(--dur-fast) var(--ease-out);
  }
  .field-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
  .field-input::placeholder { color: var(--text-400); }
  .field-textarea {
    width: 100%;
    padding: var(--s3) var(--s4);
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    color: var(--text-900);
    outline: none;
    resize: vertical;
    transition: border-color var(--dur-fast) var(--ease-out);
    line-height: 1.6;
  }
  .field-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
  .field-textarea::placeholder { color: var(--text-400); }

  .cover-dropzone {
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--r);
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-1);
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease-out),
                background var(--dur-fast) var(--ease-out);
    position: relative;
    overflow: hidden;
  }
  .cover-dropzone:hover {
    border-color: var(--accent);
    background: var(--bg);
  }
  .cover-dropzone__label {
    text-align: center;
    color: var(--text-400);
    font-size: var(--text-sm);
  }
  .cover-dropzone__btn {
    display: inline-block;
    margin-top: var(--s3);
    padding: var(--s2) var(--s4);
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-900);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .cover-dropzone__btn:hover { background: var(--surface-2); }
  .cover-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cover-remove {
    position: absolute;
    top: var(--s2);
    right: var(--s2);
    width: 28px;
    height: 28px;
    background: var(--state-out);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    cursor: pointer;
    transition: opacity var(--dur-fast);
  }
  .cover-remove:hover { opacity: 0.85; }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--s4);
    border: 1px solid var(--border);
    border-radius: var(--r);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out),
                border-color var(--dur-fast) var(--ease-out);
    margin-top: var(--s4);
  }
  .toggle-row:hover {
    background: var(--surface-1);
    border-color: var(--border-strong);
  }
  .toggle-row__left {
    display: flex;
    align-items: center;
    gap: var(--s3);
  }
  .toggle-row__icon { color: var(--text-400); }
  .toggle-row__title {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-900);
  }
  .toggle-row__sub {
    font-size: var(--text-sm);
    color: var(--text-400);
    margin-top: 1px;
  }
  .toggle-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  .form-actions {
    display: flex;
    gap: var(--s3);
    margin-top: var(--s6);
    padding-top: var(--s5);
    border-top: 1px solid var(--border);
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s2);
    height: 40px;
    padding: 0 var(--s5);
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background var(--dur-fast) var(--ease-out),
                border-color var(--dur-fast) var(--ease-out),
                color var(--dur-fast) var(--ease-out),
                opacity var(--dur-fast);
    white-space: nowrap;
  }
  .btn--primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .btn--primary:hover { background: var(--accent-dim); border-color: var(--accent-dim); }
  .btn--primary:active { background: var(--accent-dim); }
  .btn--primary:disabled {
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--text-400);
    cursor: not-allowed;
  }
  .btn--secondary {
    background: var(--surface-0);
    color: var(--text-900);
    border-color: var(--border);
  }
  .btn--secondary:hover { background: var(--surface-1); border-color: var(--border-strong); }
  .btn--large { height: 48px; padding: 0 var(--s6); font-size: var(--text-md); }
  .btn--full { width: 100%; }

  /* ── Right Panel ── */
  .panel-right {
    width: 320px;
    flex-shrink: 0;
    border-left: 1px solid var(--border);
    background: var(--surface-0);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .panel-right__inner { padding: var(--s6); flex: 1; display: flex; flex-direction: column; }
  .panel-right__heading {
    font-family: 'Fraunces', serif;
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-900);
    letter-spacing: -0.02em;
    margin-bottom: var(--s5);
  }

  /* Selected Set Preview */
  .selected-preview {
    border: 1px solid var(--border);
    border-radius: var(--r);
    overflow: hidden;
    margin-bottom: var(--s5);
    animation: fadeIn var(--dur-default) var(--ease-out);
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .selected-preview__img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    background: var(--surface-1);
    display: block;
  }
  .selected-preview__body { padding: var(--s3) var(--s4); }
  .selected-preview__eyebrow {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 2px;
  }
  .selected-preview__name {
    font-family: 'Fraunces', serif;
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-900);
    letter-spacing: -0.01em;
  }

  .settings-stack { display: flex; flex-direction: column; gap: var(--s3); }

  .panel-right__cta {
    margin-top: auto;
    padding-top: var(--s6);
  }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--border);
    margin: var(--s5) 0;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .lobby-body { flex-direction: column; height: auto; overflow: visible; }
    .panel-right { width: 100%; border-left: none; border-top: 1px solid var(--border); }
    .panel-left { padding: var(--s4); }
    .sets-grid { grid-template-columns: 1fr 1fr; }
    .create-form__row { flex-direction: column; }
    .create-form__cover { width: 100%; }
  }
  @media (max-width: 480px) {
    .sets-grid { grid-template-columns: 1fr; }
    .tab-btn span { display: none; }
  }
`;

export default function CreateLobbyPage({ user, setError, setLobby, getPlayers, onConflict }) {
    const router = useRouter();
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectSecret, setSelectSecret] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    const [setView, setSetView] = useState("public");
    const [searchQuery, setSearchQuery] = useState("");
    const [publicSets, setPublicSets] = useState([]);
    const [mySets, setMySets] = useState([]);
    const [loading, setLoading] = useState(false);

    const [newSetName, setNewSetName] = useState("");
    const [newSetDescription, setNewSetDescription] = useState("");
    const [newSetCards, setNewSetCards] = useState([]);
    const [newSetImage, setNewSetImage] = useState("");
    const [isSetPublic, setIsSetPublic] = useState(false);
    const [chatFeature, setChatFeature] = useState(true);
    const [images, setImages] = useState([]);

    useEffect(() => { loadSetsPublic(); }, []);
    useEffect(() => { if (user?.isGuest == false) loadSets(); }, [user]);

    const loadSets = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch("http://localhost:8080/player/set/player", {
                method: "GET",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setMySets(data); setLoading(false);
        } catch { setError("Network error"); }
    };

    const loadSetsPublic = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch("http://localhost:8080/player/set/public", {
                method: "GET", headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setPublicSets(data); setLoading(false);
        } catch { setError("Network error"); }
    };

    const handleCreateLobby = async () => {
        if (!selectedSet) { setError("Please select a set"); return; }
        setError(null);
        const randomizeSecret = !selectSecret;
        try {
            const res = await fetch("http://localhost:8080/lobby/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ setId: selectedSet.id, isPrivate, randomizeSecret, chatFeature }),
            });
            const data = await res.json();
            if (res.status === 409) {
                onConflict(data.lobbyId);  // trigger the modal
                return;
            }
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setLobby(data);
            router.push(`/lobby/${data.id}`);
        } catch { setError("Network error"); }
    };

    const handleCreateSet = async () => {
        setSetView("my-sets");
        const formData = new FormData();
        formData.append("name", newSetName);
        formData.append("description", newSetDescription);
        formData.append("public", isSetPublic);
        formData.append("coverImage", newSetImage?.file || "");
        images.forEach((card, index) => {
            formData.append(`characters[${index}][name]`, card.name);
            formData.append(`characters[${index}][image]`, card.croppedFile || card.file);
        });
        try {
            const res = await fetch("http://localhost:8080/player/set/create", {
                method: "POST", headers: { "X-User-ID": user?.id }, body: formData,
            });
            let data;
            try { data = await res.json(); } catch { data = await res.text(); }
            loadSets();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
        } catch { setError("Network error"); }
        setNewSetName(""); setNewSetDescription(""); setNewSetCards([]);
        setNewSetImage(""); setIsSetPublic(false); setChatFeature(true);
    };

    const filteredSets = () => {
        const sets = setView === "public" ? publicSets : mySets;
        if (!searchQuery) return sets;
        return sets.filter(set =>
            set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            set.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <>
            <style>{DESIGN_TOKENS}</style>
            <div className="lobby-root">
                {/* Header */}
                <header className="lobby-header">
                    <div className="lobby-header__inner">
                        <div>
                            <h1 className="lobby-header__title">Create New Game</h1>
                            <p className="lobby-header__sub">Choose a character set and configure your game</p>
                        </div>
                        <button className="btn-back" onClick={() => router.back()}>
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    </div>
                </header>

                <div className="lobby-body">
                    {/* Left Panel */}
                    <div className="panel-left">
                        {/* Tabs */}
                        <div className="tab-bar" role="tablist">
                            <button
                                role="tab"
                                aria-selected={setView === "public"}
                                className={`tab-btn${setView === "public" ? " tab-btn--active" : ""}`}
                                onClick={() => setSetView("public")}
                            >
                                <Search size={15} />
                                <span>Public Sets</span>
                            </button>
                            <button
                                role="tab"
                                aria-selected={setView === "my-sets"}
                                className={`tab-btn${setView === "my-sets" ? " tab-btn--active" : ""}`}
                                onClick={() => setSetView("my-sets")}
                            >
                                <UserCircle size={15} />
                                <span>My Sets</span>
                            </button>
                            {!user?.isGuest && (
                                <button
                                    role="tab"
                                    aria-selected={setView === "create"}
                                    className={`tab-btn${setView === "create" ? " tab-btn--active" : ""}`}
                                    onClick={() => setSetView("create")}
                                >
                                    <Plus size={15} />
                                    <span>Create New</span>
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        {setView !== "create" && (
                            <div className="search-wrap">
                                <Search size={16} className="search-icon" aria-hidden="true" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search character sets…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="Search character sets"
                                />
                            </div>
                        )}

                        {/* Content */}
                        {setView === "create" ? (
                            <div className="create-form">
                                <h2 className="create-form__title">
                                    <Plus size={20} />
                                    Create Character Set
                                </h2>

                                <div className="create-form__row">
                                    <div className="create-form__col">
                                        <div>
                                            <label className="field-label" htmlFor="set-name">Set Name</label>
                                            <input
                                                id="set-name"
                                                type="text"
                                                className="field-input"
                                                value={newSetName}
                                                onChange={(e) => setNewSetName(e.target.value)}
                                                placeholder="Enter set name"
                                            />
                                        </div>
                                        <div>
                                            <label className="field-label" htmlFor="set-desc">Description</label>
                                            <textarea
                                                id="set-desc"
                                                className="field-textarea"
                                                value={newSetDescription}
                                                onChange={(e) => setNewSetDescription(e.target.value)}
                                                placeholder="Describe your character set"
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    <div className="create-form__cover">
                                        <label className="field-label">Cover Image</label>
                                        <div className="cover-dropzone">
                                            <input
                                                type="file"
                                                id="cover-upload"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => setNewSetImage({ file, preview: ev.target.result });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            {newSetImage ? (
                                                <>
                                                    <img src={newSetImage.preview} alt="Cover preview" className="cover-preview" />
                                                    <button
                                                        className="cover-remove"
                                                        onClick={() => setNewSetImage("")}
                                                        aria-label="Remove cover image"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <label htmlFor="cover-upload" className="cover-dropzone__label" style={{ cursor: "pointer" }}>
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block", color: "var(--text-400)" }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Upload cover</span>
                                                    <span className="cover-dropzone__btn">Choose Image</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <ImageCropperIntegration images={images} setImages={setImages} />
                                </div>

                                <label className="toggle-row" htmlFor="set-public">
                                    <div className="toggle-row__left">
                                        <Unlock size={16} className="toggle-row__icon" />
                                        <div>
                                            <div className="toggle-row__title">Make Public</div>
                                            <div className="toggle-row__sub">Anyone can view and use this character set</div>
                                        </div>
                                    </div>
                                    <input
                                        id="set-public"
                                        type="checkbox"
                                        checked={isSetPublic}
                                        onChange={(e) => setIsSetPublic(e.target.checked)}
                                    />
                                </label>

                                <div className="form-actions">
                                    <button className="btn btn--secondary btn--full" onClick={() => setSetView("my-sets")}>
                                        Cancel
                                    </button>
                                    <button className="btn btn--primary btn--full" onClick={handleCreateSet}>
                                        Create Set
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="sets-grid" role="list">
                                {loading ? (
                                    <div className="state-loading">
                                        <div className="spinner" aria-label="Loading" role="status" />
                                        <span>Loading sets…</span>
                                    </div>
                                ) : filteredSets().length === 0 ? (
                                    setView === "my-sets" && user?.isGuest ? (
                                        <div className="guest-notice" role="alert">
                                            <svg className="guest-notice__icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <div className="guest-notice__title">Sign in required</div>
                                                <div className="guest-notice__sub">Create an account to build custom character sets</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="state-empty">No sets found</div>
                                    )
                                ) : (
                                    filteredSets().map((set) => (
                                        <div
                                            key={set.id}
                                            role="listitem"
                                            className={`set-card${selectedSet?.id === set.id ? " set-card--selected" : ""}`}
                                            onClick={() => setSelectedSet(set)}
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && setSelectedSet(set)}
                                            aria-pressed={selectedSet?.id === set.id}
                                        >
                                            <div className="set-card__img-wrap">
                                                <img
                                                    src={`http://localhost:8080` + set.coverImageName}
                                                    alt={set.name}
                                                    className="set-card__img"
                                                />
                                                {selectedSet?.id === set.id && (
                                                    <div className="set-card__check" aria-hidden="true">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="set-card__body">
                                                <h3 className="set-card__name">{set.name}</h3>
                                                <p className="set-card__desc">{set.description}</p>
                                                <div className="set-card__meta">
                                                    {set.creator && (
                                                        <span className="set-card__creator">by {set.creator}</span>
                                                    )}
                                                    {set.rating && (
                                                        <span className="set-card__rating">
                                                            <Star size={13} fill="currentColor" style={{ color: "#C98C1A" }} />
                                                            {set.rating}
                                                        </span>
                                                    )}
                                                    {set.isPublic !== undefined && (
                                                        <span className={`set-card__badge${set.isPublic ? " set-card__badge--public" : ""}`}>
                                                            {set.isPublic ? "Public" : "Private"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel — Game Settings */}
                    {setView !== "create" && (
                        <aside className="panel-right" aria-label="Game settings">
                            <div className="panel-right__inner">
                                <h2 className="panel-right__heading">Game Settings</h2>

                                {selectedSet && (
                                    <div className="selected-preview">
                                        <img
                                            src={`http://localhost:8080` + selectedSet.coverImageName}
                                            alt={selectedSet.name}
                                            className="selected-preview__img"
                                        />
                                        <div className="selected-preview__body">
                                            <div className="selected-preview__eyebrow">Selected Set</div>
                                            <div className="selected-preview__name">{selectedSet.name}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="settings-stack">
                                    <label className="toggle-row" htmlFor="select-secret">
                                        <div className="toggle-row__left">
                                            <Shuffle size={16} className="toggle-row__icon" />
                                            <div>
                                                <div className="toggle-row__title">Select Secret Character</div>
                                                <div className="toggle-row__sub">Choose your own character</div>
                                            </div>
                                        </div>
                                        <input
                                            id="select-secret"
                                            type="checkbox"
                                            checked={selectSecret}
                                            onChange={(e) => setSelectSecret(e.target.checked)}
                                        />
                                    </label>

                                    <label className="toggle-row" htmlFor="is-private">
                                        <div className="toggle-row__left">
                                            {isPrivate
                                                ? <Lock size={16} className="toggle-row__icon" />
                                                : <Unlock size={16} className="toggle-row__icon" />
                                            }
                                            <div>
                                                <div className="toggle-row__title">Private Lobby</div>
                                                <div className="toggle-row__sub">Join with code or link only</div>
                                            </div>
                                        </div>
                                        <input
                                            id="is-private"
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                        />
                                    </label>

                                    <label className="toggle-row" htmlFor="chat-feature">
                                        <div className="toggle-row__left">
                                            <MessageSquare size={16} className="toggle-row__icon" />
                                            <div>
                                                <div className="toggle-row__title">Enable Chat</div>
                                                <div className="toggle-row__sub">Ask questions via chat</div>
                                            </div>
                                        </div>
                                        <input
                                            id="chat-feature"
                                            type="checkbox"
                                            checked={chatFeature}
                                            onChange={(e) => setChatFeature(e.target.checked)}
                                        />
                                    </label>
                                </div>

                                <div className="panel-right__cta">
                                    <button
                                        className="btn btn--primary btn--large btn--full"
                                        onClick={handleCreateLobby}
                                        disabled={!selectedSet}
                                        aria-disabled={!selectedSet}
                                    >
                                        Create Lobby
                                    </button>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </>
    );
}