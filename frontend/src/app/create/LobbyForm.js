"use client";
import { API_URL } from '@/lib/api';

import { useState, useEffect } from "react";
import { imgUrl } from "@/lib/imgUrl";
import { useRouter } from "next/navigation";
import SetCover from '@/components/SetCover';
import { UserCircle, Search, Plus, Check, Star, Lock, Unlock, Eye, MessageSquare, Shuffle, Timer, Pencil, Heart, Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

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

  /* ── Layout ── */
  .lobby-body {
    display: flex;
    height: calc(100vh - 53px);
    overflow: hidden;
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

  /* ── Skeleton loading ── */
  @keyframes shimmer {
    from { background-position: -600px 0; }
    to   { background-position:  600px 0; }
  }
  .skeleton-block {
    background: linear-gradient(90deg, var(--surface-1) 25%, #EDE8E2 50%, var(--surface-1) 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: var(--r);
  }

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

  /* ── Set card preview button ── */
  .set-card__img-wrap:hover .set-card__preview-btn { opacity: 1; }
  .set-card__preview-btn {
    position: absolute;
    bottom: var(--s2);
    right: var(--s2);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px var(--s3);
    background: rgba(26,21,16,0.72);
    border: none;
    border-radius: var(--r);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-xs);
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-out);
    z-index: 2;
  }
  .set-card__preview-btn:hover { background: rgba(26,21,16,0.9); }

  /* ── Preview Modal ── */
  .preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26,21,16,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: var(--s6);
    animation: fadeIn var(--dur-default) var(--ease-out);
  }
  .preview-modal {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    width: 100%;
    max-width: 680px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp var(--dur-default) var(--ease-out);
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .preview-modal__header {
    display: flex;
    align-items: center;
    gap: var(--s4);
    padding: var(--s5) var(--s6);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .preview-modal__cover {
    width: 56px;
    height: 56px;
    border-radius: var(--r);
    overflow: hidden;
    flex-shrink: 0;
  }
  .preview-modal__title {
    font-family: 'Fraunces', serif;
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-900);
    letter-spacing: -0.02em;
  }
  .preview-modal__count {
    font-size: var(--text-sm);
    color: var(--text-400);
    margin-top: 2px;
  }
  .preview-modal__close {
    margin-left: auto;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--r);
    cursor: pointer;
    color: var(--text-600);
    transition: background var(--dur-fast) var(--ease-out);
    flex-shrink: 0;
  }
  .preview-modal__close:hover { background: var(--surface-1); }
  .preview-modal__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: var(--s3);
    padding: var(--s5) var(--s6);
    overflow-y: auto;
    flex: 1;
  }
  .preview-char {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s2);
  }
  .preview-char__img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--r);
    border: 1px solid var(--border);
    background: var(--surface-1);
  }
  .preview-char__name {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-600);
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }
  .preview-modal__footer {
    padding: var(--s4) var(--s6);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: var(--s3);
    flex-shrink: 0;
  }

  /* ── Sort buttons ── */
  .sort-bar {
    display: flex;
    align-items: center;
    gap: var(--s2);
    margin-bottom: var(--s4);
  }
  .sort-select {
    height: 32px;
    padding: 0 var(--s3);
    border: 1px solid var(--border);
    border-radius: var(--r);
    background: var(--surface-0);
    color: var(--text-900);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-sm);
    cursor: pointer;
    outline: none;
  }
  .sort-select:hover { border-color: var(--border-strong); }
  .sort-select:focus { border-color: var(--accent); }

  /* ── Like button ── */
  .set-card__like-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: none;
    padding: 4px;
    border-radius: var(--r);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-400);
    transition: color var(--dur-fast), transform var(--dur-fast);
    line-height: 1;
  }
  .set-card__like-btn:hover:not(:disabled) {
    color: var(--state-out);
    transform: scale(1.1);
  }
  .set-card__like-btn--active { color: var(--state-out); }
  .set-card__like-btn:disabled { cursor: default; opacity: 0.6; }

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

  /* ── Character selection ── */
  .char-mode-bar {
    display: flex;
    gap: 3px;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 3px;
  }
  .char-mode-pill {
    flex: 1;
    height: 30px;
    border-radius: calc(var(--r) - 1px);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--text-600);
    transition: background 0.12s, color 0.12s;
  }
  .char-mode-pill:hover:not(.char-mode-pill--active) { background: var(--surface-2); }
  .char-mode-pill--active { background: var(--surface-0); color: var(--text-900); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .char-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: var(--s2);
    max-height: 240px;
    overflow-y: auto;
    padding: var(--s1);
  }
  .char-picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    position: relative;
    border-radius: var(--r);
  }
  .char-picker-item__img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--r);
    border: 2px solid transparent;
    background: var(--surface-1);
    transition: opacity 0.12s, border-color 0.12s;
  }
  .char-picker-item--off .char-picker-item__img { opacity: 0.28; border-color: transparent; }
  .char-picker-item--on  .char-picker-item__img { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-light); }
  .char-picker-item__check {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 16px;
    height: 16px;
    background: var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .char-picker-item__name {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-600);
    text-align: center;
    line-height: 1.2;
    word-break: break-word;
  }

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

  .no-spinner::-webkit-outer-spin-button,
  .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .no-spinner { -moz-appearance: textfield; }
`;

export default function CreateLobbyPage({ user, setError, setLobby, getPlayers, onConflict }) {
    const router = useRouter();
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectSecret, setSelectSecret] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    const [charSelectMode, setCharSelectMode] = useState('all'); // 'all' | 'random' | 'manual'
    const [randomCount, setRandomCount] = useState(null);
    const [randomCountDraft, setRandomCountDraft] = useState('');
    const [randomPreview, setRandomPreview] = useState([]);
    const [manualSelected, setManualSelected] = useState(new Set());

    const PAGE_SIZE = 12;

    const [setView, setSetView] = useState("public");
    const [searchDraft, setSearchDraft] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("most-popular");
    const [publicSets, setPublicSets] = useState([]);
    const [mySets, setMySets] = useState([]);
    const [publicPage, setPublicPage] = useState(1);
    const [myPage, setMyPage] = useState(1);
    const [publicTotal, setPublicTotal] = useState(0);
    const [myTotal, setMyTotal] = useState(0);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [loadingMy, setLoadingMy] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [chatFeature, setChatFeature] = useState(true);
    const [turnTimerSeconds, setTurnTimerSeconds] = useState(0);
    const [previewSet, setPreviewSet] = useState(null);

    // Debounce searchDraft → searchQuery
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchDraft), 300);
        return () => clearTimeout(timer);
    }, [searchDraft]);

    // Public sets: initial load + user identity change
    useEffect(() => {
        if (user === undefined) return;
        setPublicPage(1);
        loadSetsPublic(1, sortOrder, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Public sets: sort change → reset to page 1
    useEffect(() => {
        if (user === undefined) return;
        setPublicPage(1);
        loadSetsPublic(1, sortOrder, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder]);

    // Both tabs: debounced search change → reset to page 1
    useEffect(() => {
        if (user === undefined) return;
        setPublicPage(1);
        loadSetsPublic(1, sortOrder, searchQuery);
        if (user?.isGuest === false) {
            setMyPage(1);
            loadSets(1, searchQuery);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // Public sets: page navigation (skip 1 to avoid double-fetch with above)
    useEffect(() => {
        if (user === undefined || publicPage === 1) return;
        loadSetsPublic(publicPage, sortOrder, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicPage]);

    // My sets: initial load + user change
    useEffect(() => {
        if (user?.isGuest === false) {
            setMyPage(1);
            loadSets(1, searchQuery);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.isGuest]);

    // My sets: page navigation
    useEffect(() => {
        if (user?.isGuest === false && myPage > 1) {
            loadSets(myPage, searchQuery);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myPage]);

    useEffect(() => {
        if (!selectedSet) return;
        setCharSelectMode('all');
        const total = selectedSet.characters?.length ?? 0;
        const min = Math.max(selectedSet.minCharacters ?? 6, 6);
        const count = Math.max(min, total);
        setRandomCount(count);
        setRandomCountDraft(String(count));
        setManualSelected(new Set((selectedSet.characters || []).map(c => c.id)));
        setRandomPreview([]);
    }, [selectedSet?.id]);

    useEffect(() => {
        if (charSelectMode !== 'random' || !selectedSet?.characters) return;
        const shuffled = [...selectedSet.characters].sort(() => Math.random() - 0.5);
        setRandomPreview(shuffled.slice(0, randomCount));
    }, [charSelectMode]);

    const getCharacterIds = () => {
        if (charSelectMode === 'all') return [];
        if (charSelectMode === 'random') return randomPreview.map(c => c.id);
        return Array.from(manualSelected);
    };

    const loadSets = async (page, search) => {
        setLoadingMy(true); setError(null);
        try {
            const params = new URLSearchParams({ page, pageSize: PAGE_SIZE, search: search || "" });
            const res = await fetch(`${API_URL}/player/set/player?${params}`, {
                method: "GET",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setMySets(data.sets ?? []);
            setMyTotal(data.total ?? 0);
        } catch { setError("Network error"); } finally { setLoadingMy(false); }
    };

    const loadSetsPublic = async (page, sort, search) => {
        setLoadingPublic(true); setError(null);
        try {
            const headers = { "Content-Type": "application/json" };
            if (user?.id && !user?.isGuest) headers["X-User-ID"] = user.id;
            const params = new URLSearchParams({ page, pageSize: PAGE_SIZE, sort: sort || "most-popular", search: search || "" });
            const res = await fetch(`${API_URL}/player/set/public?${params}`, {
                method: "GET", headers,
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setPublicSets(data.sets ?? []);
            setPublicTotal(data.total ?? 0);
        } catch { setError("Network error"); } finally { setLoadingPublic(false); }
    };

    const handleCreateLobby = async () => {
        if (!selectedSet) { setError("Please select a set"); return; }
        setError(null);
        setIsCreating(true);
        const randomizeSecret = !selectSecret;
        try {
            const res = await fetch(`${API_URL}/lobby/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ setId: selectedSet.id, isPrivate, randomizeSecret, chatFeature, turnTimerSeconds, characterIds: getCharacterIds() }),
            });
            const data = await res.json();
            if (res.status === 409) {
                onConflict(data.lobbyId);
                setIsCreating(false);
                return;
            }
            if (!res.ok) { setError(data.error || "Something went wrong"); setIsCreating(false); return; }
            setLobby(data);
            router.push(`/lobby/${data.id}`);
        } catch { setError("Network error"); setIsCreating(false); }
    };

    const currentSets = () => setView === "public" ? publicSets : mySets;
    const currentTotal = () => setView === "public" ? publicTotal : myTotal;
    const currentPage = () => setView === "public" ? publicPage : myPage;
    const setCurrentPage = (p) => setView === "public" ? setPublicPage(p) : setMyPage(p);
    const totalPages = () => Math.ceil(currentTotal() / PAGE_SIZE);

    const getPageNumbers = () => {
        const total = totalPages();
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const cur = currentPage();
        const pages = new Set([1, total]);
        for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) pages.add(i);
        const sorted = [...pages].sort((a, b) => a - b);
        const result = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
            result.push(sorted[i]);
        }
        return result;
    };

    const handleToggleLike = async (setId) => {
        if (!user?.id || user?.isGuest) return;
        const updateSets = (prev) => prev.map(s => {
            if (s.id !== setId) return s;
            const wasLiked = s.likedByMe;
            return { ...s, likedByMe: !wasLiked, likeCount: (s.likeCount ?? 0) + (wasLiked ? -1 : 1) };
        });
        if (setView === "public") setPublicSets(updateSets);
        else setMySets(updateSets);
        try {
            const res = await fetch(`${API_URL}/player/set/${setId}/like`, {
                method: "POST",
                headers: { "X-User-ID": user.id },
            });
            if (res.ok) {
                const data = await res.json();
                const reconcile = (prev) => prev.map(s =>
                    s.id === setId ? { ...s, likedByMe: data.likedByMe, likeCount: data.likeCount } : s
                );
                if (setView === "public") setPublicSets(reconcile);
                else setMySets(reconcile);
            }
        } catch {
            // revert optimistic update
            const revert = (prev) => prev.map(s => {
                if (s.id !== setId) return s;
                const cur = s.likedByMe;
                return { ...s, likedByMe: !cur, likeCount: (s.likeCount ?? 0) + (cur ? -1 : 1) };
            });
            if (setView === "public") setPublicSets(revert);
            else setMySets(revert);
        }
    };

    return (
        <>
            <style>{DESIGN_TOKENS}</style>
            <div className="lobby-root">
                <Navbar />

                <div className="lobby-body">
                    {/* Left Panel */}
                    <div className="panel-left">
                        {/* Tabs */}
                        <div className="tab-bar" role="tablist">
                            <button
                                role="tab"
                                aria-selected={setView === "public"}
                                className={`tab-btn${setView === "public" ? " tab-btn--active" : ""}`}
                                onClick={() => { setSetView("public"); setSortOrder("most-popular"); }}
                            >
                                <Search size={15} />
                                <span>Public Sets</span>
                            </button>
                            <button
                                role="tab"
                                aria-selected={setView === "my-sets"}
                                className={`tab-btn${setView === "my-sets" ? " tab-btn--active" : ""}`}
                                onClick={() => { setSetView("my-sets"); }}
                            >
                                <UserCircle size={15} />
                                <span>My Sets</span>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="search-wrap">
                            <Search size={16} className="search-icon" aria-hidden="true" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search character sets…"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                aria-label="Search character sets"
                            />
                        </div>

                        {/* Sort/filter bar — public tab only */}
                        {setView === "public" && (
                            <div className="sort-bar">
                                <select
                                    className="sort-select"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    aria-label="Sort or filter sets"
                                >
                                    <option value="most-popular">Most Played</option>
                                    <option value="most-liked">Most Liked</option>
                                    <option value="newest">Newest</option>
                                    {!user?.isGuest && user?.id && (
                                        <option value="liked">My Liked Sets</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* New Set link (My Sets only, non-guest) */}
                        {setView === "my-sets" && !user?.isGuest && (
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--s4)" }}>
                                <button
                                    className="btn btn--secondary"
                                    onClick={() => router.push("/set/new?from=create")}
                                    style={{ gap: "var(--s2)" }}
                                >
                                    <Plus size={15} />
                                    New Set
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="sets-grid" role="list">
                            {(setView === "public" ? loadingPublic : loadingMy) ? (
                                <>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="set-card" aria-hidden="true" style={{ pointerEvents: "none" }}>
                                            <div className="set-card__img-wrap skeleton-block" />
                                            <div className="set-card__body">
                                                <div className="skeleton-block" style={{ height: 18, width: "65%", marginBottom: "var(--s2)" }} />
                                                <div className="skeleton-block" style={{ height: 13, width: "90%", marginBottom: "var(--s1)" }} />
                                                <div className="skeleton-block" style={{ height: 13, width: "55%", marginBottom: "var(--s3)" }} />
                                                <div style={{ display: "flex", gap: "var(--s2)" }}>
                                                    <div className="skeleton-block" style={{ height: 20, width: 52 }} />
                                                    <div className="skeleton-block" style={{ height: 20, width: 36 }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : currentSets().length === 0 ? (
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
                                currentSets().map((set) => (
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
                                            <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: "100%", borderRadius: 0 }} />
                                            {selectedSet?.id === set.id && (
                                                <div className="set-card__check" aria-hidden="true">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                            {setView === "my-sets" && (
                                                <button
                                                    className="set-card__preview-btn"
                                                    style={{ bottom: "auto", top: "var(--s2)", right: "auto", left: "var(--s2)" }}
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/edit/${set.id}?from=create`); }}
                                                    aria-label={`Edit ${set.name}`}
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                className="set-card__preview-btn"
                                                onClick={(e) => { e.stopPropagation(); setPreviewSet(set); }}
                                                aria-label={`Preview ${set.name}`}
                                            >
                                                <Eye size={12} />
                                                Preview
                                            </button>
                                        </div>
                                        <div className="set-card__body">
                                            <h3 className="set-card__name">{set.name}</h3>
                                            <p className="set-card__desc">{set.description}</p>
                                            <div className="set-card__meta">
                                                {set.creator && (
                                                    <span className="set-card__creator">by {set.creator}</span>
                                                )}
                                                {set.isPublic !== undefined && (
                                                    <span className={`set-card__badge${set.isPublic ? " set-card__badge--public" : ""}`}>
                                                        {set.isPublic ? "Public" : "Private"}
                                                    </span>
                                                )}
                                                <button
                                                    className={`set-card__like-btn${set.likedByMe ? " set-card__like-btn--active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); handleToggleLike(set.id); }}
                                                    disabled={!user?.id || user?.isGuest}
                                                    title={user?.isGuest || !user?.id ? "Sign in to like sets" : (set.likedByMe ? "Unlike" : "Like")}
                                                    aria-label={`${set.likedByMe ? "Unlike" : "Like"} ${set.name}`}
                                                >
                                                    <Heart size={13} fill={set.likedByMe ? "currentColor" : "none"} strokeWidth={2} />
                                                    {set.likeCount ?? 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages() > 1 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--s1)", marginTop: "var(--s4)", flexWrap: "wrap" }}>
                                <button
                                    onClick={() => setCurrentPage(currentPage() - 1)}
                                    disabled={currentPage() === 1}
                                    style={{
                                        padding: "var(--s1) var(--s3)",
                                        borderRadius: "var(--r)",
                                        border: "1px solid var(--border)",
                                        background: "var(--bg)",
                                        color: "var(--text)",
                                        fontFamily: "var(--font-ui)",
                                        fontSize: "var(--text-sm)",
                                        cursor: currentPage() === 1 ? "not-allowed" : "pointer",
                                        opacity: currentPage() === 1 ? 0.4 : 1,
                                    }}
                                    aria-label="Previous page"
                                >
                                    ←
                                </button>
                                {getPageNumbers().map((p, i) =>
                                    p === "..." ? (
                                        <span key={`ellipsis-${i}`} style={{ color: "var(--text-400)", fontSize: "var(--text-sm)", padding: "0 2px" }}>…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            style={{
                                                padding: "var(--s1) var(--s2)",
                                                minWidth: 32,
                                                borderRadius: "var(--r)",
                                                border: "1px solid",
                                                borderColor: p === currentPage() ? "var(--accent)" : "var(--border)",
                                                background: p === currentPage() ? "var(--accent)" : "var(--bg)",
                                                color: p === currentPage() ? "#fff" : "var(--text)",
                                                fontFamily: "var(--font-ui)",
                                                fontSize: "var(--text-sm)",
                                                fontWeight: p === currentPage() ? 600 : 400,
                                                cursor: p === currentPage() ? "default" : "pointer",
                                            }}
                                            aria-label={`Page ${p}`}
                                            aria-current={p === currentPage() ? "page" : undefined}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => setCurrentPage(currentPage() + 1)}
                                    disabled={currentPage() === totalPages()}
                                    style={{
                                        padding: "var(--s1) var(--s3)",
                                        borderRadius: "var(--r)",
                                        border: "1px solid var(--border)",
                                        background: "var(--bg)",
                                        color: "var(--text)",
                                        fontFamily: "var(--font-ui)",
                                        fontSize: "var(--text-sm)",
                                        cursor: currentPage() === totalPages() ? "not-allowed" : "pointer",
                                        opacity: currentPage() === totalPages() ? 0.4 : 1,
                                    }}
                                    aria-label="Next page"
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Panel — Game Settings */}
                    <aside className="panel-right" aria-label="Game settings">
                        <div className="panel-right__inner">
                            <h2 className="panel-right__heading">Game Settings</h2>

                            {selectedSet && (
                                <div className="selected-preview">
                                    <SetCover coverImageName={selectedSet.coverImageName} alt={selectedSet.name} className="selected-preview__img" style={{ height: 60, borderRadius: 4 }} />
                                    <div className="selected-preview__body">
                                        <div className="selected-preview__eyebrow">Selected Set</div>
                                        <div className="selected-preview__name">{selectedSet.name}</div>
                                    </div>
                                </div>
                            )}

                            {selectedSet && (
                                <div style={{ marginBottom: 'var(--s4)' }}>
                                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-400)', marginBottom: 'var(--s2)' }}>
                                        Characters
                                    </div>
                                    <div className="char-mode-bar" style={{ marginBottom: 'var(--s3)' }}>
                                        {[
                                            { key: 'all', label: `All (${selectedSet.characters?.length ?? 0})` },
                                            { key: 'random', label: 'Random' },
                                            { key: 'manual', label: 'Manual' },
                                        ].map(m => (
                                            <button
                                                key={m.key}
                                                className={`char-mode-pill${charSelectMode === m.key ? ' char-mode-pill--active' : ''}`}
                                                onClick={() => setCharSelectMode(m.key)}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    {charSelectMode === 'random' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                Include
                                                <input
                                                    type="text"
                                                    value={randomCountDraft}
                                                    onChange={e => setRandomCountDraft(e.target.value)}
                                                    onBlur={() => {
                                                        const min = Math.max(selectedSet.minCharacters ?? 6, 6);
                                                        const max = selectedSet.characters?.length ?? 6;
                                                        const n = Math.min(Math.max(parseInt(randomCountDraft, 10) || min, min), max);
                                                        setRandomCount(n);
                                                        setRandomCountDraft(String(n));
                                                        const shuffled = [...selectedSet.characters].sort(() => Math.random() - 0.5);
                                                        setRandomPreview(shuffled.slice(0, n));
                                                    }}
                                                    style={{ width: 44, padding: '2px 6px', fontSize: 'var(--text-sm)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-0)', color: 'var(--text-900)', textAlign: 'center' }}
                                                />
                                                of {selectedSet.characters?.length} characters
                                            </div>
                                            <input
                                                type="range"
                                                min={Math.max(selectedSet.minCharacters ?? 6, 6)}
                                                max={Math.max(selectedSet.minCharacters ?? 6, selectedSet.characters?.length ?? 6)}
                                                value={randomCount ?? selectedSet.characters?.length}
                                                onChange={e => {
                                                    const n = Number(e.target.value);
                                                    setRandomCount(n);
                                                    setRandomCountDraft(String(n));
                                                    const shuffled = [...selectedSet.characters].sort(() => Math.random() - 0.5);
                                                    setRandomPreview(shuffled.slice(0, n));
                                                }}
                                                style={{ accentColor: 'var(--accent)', width: '100%' }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const shuffled = [...selectedSet.characters].sort(() => Math.random() - 0.5);
                                                    setRandomPreview(shuffled.slice(0, randomCount));
                                                }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', color: 'var(--text-600)', width: 'fit-content' }}
                                            >
                                                <Shuffle size={12} /> Re-randomize
                                            </button>
                                            {randomPreview.length > 0 && (
                                                <div className="char-picker-grid">
                                                    {randomPreview.map(c => (
                                                        <div key={c.id} className="char-picker-item char-picker-item--on">
                                                            <img src={imgUrl(c.image)} alt={c.name} className="char-picker-item__img" />
                                                            <span className="char-picker-item__name">{c.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {charSelectMode === 'manual' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-600)' }}>
                                                {manualSelected.size} of {selectedSet.characters?.length} selected
                                            </div>
                                            <div className="char-picker-grid">
                                                {(selectedSet.characters || []).map(c => {
                                                    const on = manualSelected.has(c.id);
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            className={`char-picker-item ${on ? 'char-picker-item--on' : 'char-picker-item--off'}`}
                                                            onClick={() => setManualSelected(prev => {
                                                                const next = new Set(prev);
                                                                const min = Math.max(selectedSet.minCharacters ?? 6, 6);
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
                                        onChange={(e) => {
                                            setChatFeature(e.target.checked);
                                            if (!e.target.checked) setTurnTimerSeconds(0);
                                        }}
                                    />
                                </label>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0 4px', opacity: chatFeature ? 1 : 0.4, pointerEvents: chatFeature ? 'auto' : 'none', transition: 'opacity 150ms' }}>
                                    <div className="toggle-row__left" style={{ marginBottom: 4 }}>
                                        <Timer size={16} className="toggle-row__icon" />
                                        <div>
                                            <div className="toggle-row__title">Turn Timer</div>
                                            <div className="toggle-row__sub">{chatFeature ? 'Auto-forfeit if time runs out' : 'Requires chat mode'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {[
                                            { label: 'Off', value: 0 },
                                            { label: '30s', value: 30 },
                                            { label: '1 min', value: 60 },
                                            { label: '2 min', value: 120 },
                                        ].map(({ label, value }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setTurnTimerSeconds(value)}
                                                style={{
                                                    flex: 1,
                                                    height: 34,
                                                    border: `1px solid ${turnTimerSeconds === value ? 'var(--accent)' : 'var(--border)'}`,
                                                    borderRadius: 'var(--r)',
                                                    background: turnTimerSeconds === value ? 'var(--accent)' : 'var(--surface-0)',
                                                    color: turnTimerSeconds === value ? '#fff' : 'var(--text-600)',
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 150ms',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="panel-right__cta">
                                <button
                                    className="btn btn--primary btn--large btn--full"
                                    onClick={handleCreateLobby}
                                    disabled={
                                        isCreating ||
                                        !selectedSet ||
                                        (charSelectMode === 'all' && (selectedSet?.characters?.length ?? 0) < Math.max(selectedSet?.minCharacters ?? 6, 6)) ||
                                        (charSelectMode === 'random' && randomPreview.length < Math.max(selectedSet?.minCharacters ?? 6, 6)) ||
                                        (charSelectMode === 'manual' && manualSelected.size < Math.max(selectedSet?.minCharacters ?? 6, 6))
                                    }
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {isCreating && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                    {isCreating ? 'Creating…' : 'Create Lobby'}
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Character Set Preview Modal */}
            {previewSet && (
                <div className="preview-overlay" onClick={() => setPreviewSet(null)}>
                    <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-modal__header">
                            <div className="preview-modal__cover">
                                <SetCover coverImageName={previewSet.coverImageName} alt={previewSet.name} style={{ width: "100%", height: "100%", borderRadius: "var(--r)" }} />
                            </div>
                            <div>
                                <div className="preview-modal__title">{previewSet.name}</div>
                                <div className="preview-modal__count">
                                    {previewSet.characters?.length ?? 0} characters
                                </div>
                            </div>
                            <button className="preview-modal__close" onClick={() => setPreviewSet(null)} aria-label="Close preview">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="preview-modal__grid">
                            {(previewSet.characters || []).map((char) => (
                                <div key={char.id} className="preview-char">
                                    <img
                                        src={imgUrl(char.image)}
                                        alt={char.name}
                                        className="preview-char__img"
                                        loading="lazy"
                                    />
                                    <span className="preview-char__name">{char.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="preview-modal__footer">
                            <button className="btn btn--secondary" onClick={() => setPreviewSet(null)}>
                                Close
                            </button>
                            <button
                                className="btn btn--primary"
                                onClick={() => { setSelectedSet(previewSet); setPreviewSet(null); }}
                            >
                                <Check size={15} />
                                Select This Set
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}