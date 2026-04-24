"use client";
import { apiFetch, WS_URL } from '@/lib/api';

import { useState, useContext, useEffect, useRef } from "react";
import { imgUrl } from "@/lib/imgUrl";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import GameState from "./GameState";
import ChatApp from '@/components/chatapp';
import Navbar from "@/components/navbar";
import GameSend from '@/components/gameSend';
import SetCover from '@/components/SetCover';
import { Link as LinkIcon, Copy, Check, Loader2, Lock, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';


const GLOBAL_CSS = `
  :root {
    --bg:            #F7F3EE;
    --surface-0:     #FFFFFF;
    --surface-1:     #F2EDE7;
    --surface-2:     #E8E0D8;
    --accent:        #D9572B;
    --accent-light:  #F2C5B4;
    --accent-dim:    #B84422;
    --text-900:      #1A1510;
    --text-600:      #5C5047;
    --text-400:      #A0937F;
    --border:        #DDD5CA;
    --border-strong: #C4B8A8;
    --state-out:     #C0392B;
    --state-live:    #2A7A56;
    --r: 6px;
    --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px;
    --s6:24px; --s8:32px; --s10:40px; --s12:48px; --s16:64px;
  }
  body { background: var(--bg); }
  .gw-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-400);
  }
  .gw-btn-primary {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    height: 40px;
    padding: 0 var(--s6);
    border-radius: var(--r);
    border: none;
    cursor: pointer;
    background: var(--accent);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s2);
    transition: background 150ms;
  }
  .gw-btn-primary:hover { background: var(--accent-dim); }
  .gw-btn-primary:disabled { opacity: 0.38; cursor: not-allowed; }
  .gw-btn-ghost {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    height: 40px;
    padding: 0 var(--s6);
    border-radius: var(--r);
    border: 1px solid var(--border);
    cursor: pointer;
    background: transparent;
    color: var(--text-900);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s2);
    transition: border-color 150ms, background 150ms;
  }
  .gw-btn-ghost:hover { border-color: var(--border-strong); background: var(--surface-1); }
  .gw-btn-danger {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    height: 40px;
    padding: 0 var(--s6);
    border-radius: var(--r);
    border: 1px solid var(--accent-light);
    cursor: pointer;
    background: transparent;
    color: var(--state-out);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s2);
    transition: background 150ms;
  }
  .gw-btn-danger:hover { background: #fef2ef; }
  .gw-card {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: var(--s8);
  }
  .gw-input {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--text-900);
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 0 var(--s4);
    height: 36px;
    outline: none;
    transition: border-color 150ms;
    width: 100%;
  }
  .gw-input:focus { border-color: var(--accent); }
  .gw-char-card {
    background: var(--surface-0);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: var(--s3);
    cursor: pointer;
    transition: border-color 150ms, background 150ms, transform 150ms;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .gw-char-card:hover {
    border-color: var(--accent);
    background: var(--surface-1);
    transform: translateY(-2px);
  }
  @keyframes gw-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

function Confetti() {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const colors = ['#D9572B', '#F2C5B4', '#2A7A56', '#F7C948', '#5C5047', '#B84422'];
        const particles = Array.from({ length: 100 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            w: Math.random() * 10 + 4,
            h: Math.random() * 5 + 2,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.12,
        }));
        let animId;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            particles.forEach(p => {
                if (p.y < canvas.height + 20) {
                    alive = true;
                    p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed; p.vy += 0.04;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            });
            if (alive) animId = requestAnimationFrame(draw);
        }
        draw();
        return () => { if (animId) cancelAnimationFrame(animId); };
    }, []);
    return (
        <canvas ref={canvasRef} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 10,
        }} />
    );
}

function StyleInjector() {
    useEffect(() => {
        if (document.getElementById('gw-tokens')) return;
        const s = document.createElement('style');
        s.id = 'gw-tokens';
        s.textContent = GLOBAL_CSS;
        document.head.appendChild(s);

    }, []);
    return null;
}

// Module-level cache: stores lobby data from rematch_ready so the new page
// can populate lobby state immediately on mount without waiting for WS.
const _rematchLobbyCache = {};

export default function LobbyPage() {

    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messagesGame, setMessagesGame] = useState([]);
    const [messagesChat, setMessagesChat] = useState([]);
    const [sentMessage, setSentMessage] = useState("");
    const [waitingReponse, setWaitingReponse] = useState(false);
    const [receivedMessage, setReceivedMessage] = useState("");
    const [questionLog, setQuestionLog] = useState([]);
    const [turn, setTurn] = useState(false);
    const wsRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const shouldReconnectRef = useRef(true);
    const hasEverConnectedRef = useRef(false);

    const [isMinimized, setIsMinimized] = useState(false);
    const isMinimizedRef = useRef(isMinimized);
    const playerIdRef = useRef(playerId);
    const [isGuessMode, setIsGuessMode] = useState(false);
    const [lobbyStatus, setLobbyStatus] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [conflictLobbyId, setConflictLobbyId] = useState(null);
    const conflictLobbyIdRef = useRef(null);
    const leavingRef = useRef(false);

    // Rematch state
    const [rematchModalOpen, setRematchModalOpen] = useState(false);
    const [rematchWaiting, setRematchWaiting] = useState(false);
    const [incomingRematch, setIncomingRematch] = useState(null); // { characterSetName }
    const [selectedRematchSet, setSelectedRematchSet] = useState(null);
    const REMATCH_PAGE_SIZE = 12;
    const [rematchPublicSets, setRematchPublicSets] = useState([]);
    const [rematchMySets, setRematchMySets] = useState([]);
    const [rematchPublicTotal, setRematchPublicTotal] = useState(0);
    const [rematchMyTotal, setRematchMyTotal] = useState(0);
    const [rematchPublicPage, setRematchPublicPage] = useState(1);
    const [rematchMyPage, setRematchMyPage] = useState(1);
    const [rematchSetView, setRematchSetView] = useState("public");
    const [rematchDeclinedToast, setRematchDeclinedToast] = useState(false);
    const [sentRematchSetName, setSentRematchSetName] = useState(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isReadying, setIsReadying] = useState(false);
    const [isSelectingSecret, setIsSelectingSecret] = useState(false);
    const [isSendingRematch, setIsSendingRematch] = useState(false);
    const [rematchResponse, setRematchResponse] = useState(null); // 'accepting' | 'declining' | null
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const opponentDisconnectedRef = useRef(false);
    const [disconnectCountdown, setDisconnectCountdown] = useState(120);
    const disconnectIntervalRef = useRef(null);
    const [opponentLeftAfterGame, setOpponentLeftAfterGame] = useState(false);
    const [isLeavingGame, setIsLeavingGame] = useState(false);
    const [answerToast, setAnswerToast] = useState(null);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [preGameDisconnected, setPreGameDisconnected] = useState(false);
    const [preGameCountdown, setPreGameCountdown] = useState(30);
    const [preGameDisconnectedIsHost, setPreGameDisconnectedIsHost] = useState(false);
    const [lobbyCancelled, setLobbyCancelled] = useState(false);
    const preGameIntervalRef = useRef(null);
    const lobbyRef = useRef(null);

    // Turn timer
    const [turnTimeLeft, setTurnTimeLeft] = useState(null); // ms remaining, null = off
    const turnTimerIntervalRef = useRef(null);

    const params = useParams();
    const lobbyID = params.lobbyId;
    let username = user ? user.email : null;

    const router = useRouter();

    const handleConflict = (lobbyId) => {
        conflictLobbyIdRef.current = lobbyId;
        setConflictLobbyId(lobbyId);
    };

    const clearConflict = () => {
        conflictLobbyIdRef.current = null;
        setConflictLobbyId(null);
    };

    const forfeitAndRejoin = async () => {
        try {
            await apiFetch(`/lobby/forfeit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lobbyId: conflictLobbyId }),
            });
            clearConflict();
            if (lobby?.code && lobby?.id) {
                joinLobby(lobby.code, lobby.id);
            }
        } catch (err) {
            // console.error("Forfeit error:", err);
            setError("Network error");
        }
    };

    const sendRematchRequest = async () => {
        if (!selectedRematchSet) return;
        setIsSendingRematch(true);
        try {
            await apiFetch(`/lobby/${lobbyID}/rematch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ characterSetId: selectedRematchSet.id }),
            });
            setRematchModalOpen(false);
            setRematchWaiting(true);
            setSentRematchSetName(selectedRematchSet?.name ?? null);
        } catch (err) {
            // console.error("Rematch request error:", err);
        } finally {
            setIsSendingRematch(false);
        }
    };

    const acceptRematch = async () => {
        setRematchResponse('accepting');
        try {
            await apiFetch(`/lobby/${lobbyID}/rematch/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            setIncomingRematch(null);
        } catch (err) {
            // console.error("Accept rematch error:", err);
        } finally {
            setRematchResponse(null);
        }
    };

    const declineRematch = async () => {
        setRematchResponse('declining');
        try {
            await apiFetch(`/lobby/${lobbyID}/rematch/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            setIncomingRematch(null);
        } catch (err) {
            // console.error("Decline rematch error:", err);
        } finally {
            setRematchResponse(null);
        }
    };

    const cancelRematch = async () => {
        try {
            await apiFetch(`/lobby/${lobbyID}/rematch/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            setRematchWaiting(false);
            setSentRematchSetName(null);
        } catch (err) {
            // console.error("Cancel rematch error:", err);
        }
    };

    const joinLobby = async (lobbyCode) => {
        setError(null);
        try {
            const res = await apiFetch(`/lobby/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: lobbyCode }),
            });

            if (res.status === 409) {
                const data = await res.json();
                handleConflict(data.lobbyId);
                // console.log("found conflict with lobby", data.lobbyId);
                return;
            }

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                setError(text || "Invalid response from server");
                return;
            }
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            getGameState();
            checkLobbyStatus();
        } catch (err) {
            setError(err.message || "Network error");
        }
    };

    const checkLobbyStatus = async () => {
        if (!lobbyID) return;
        try {
            const res = await apiFetch(`/lobby/${lobbyID}/status`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) { setLobbyStatus({ exists: false, error: data.error }); return; }
            setLobbyStatus({ exists: true, playerCount: data.playerCount, gameStarted: data.gameStarted, isFull: data.playerCount >= 2 });
        } catch (err) {
            setLobbyStatus({ exists: false, error: "Network error" });
        }
    };

    const getGameState = async () => {
        setError(null);
        try {
            const res = await apiFetch(`/lobby/${lobbyID}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            // console.log("Fetched gamestate:", data);
            setGameState(data);
        } catch (err) {
            setError("Network error");
        }
    };

    const handleCopyClick = () => {
        if (isCopied) return;
        navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        if (lobby?.players && user) {
            const id = lobby.players.find(p => p.userId === user.id || p.guestId === user.id)?.id;
            setPlayerId(id);
            playerIdRef.current = id;
        }
    }, [lobby, user]);

    useEffect(() => {
        if (lobby && playerId != null) {
            setTurn(playerId === lobby.turn);
        }
    }, [lobby, playerId]);

    useEffect(() => {
        if (!lobbyID || !username) return;
        shouldReconnectRef.current = true;
        let plannedClose = false;

        const connect = () => {
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

            const websocket = new WebSocket(
                `${WS_URL}/ws?username=${encodeURIComponent(username)}&lobbyId=${encodeURIComponent(lobbyID)}&playerId=${encodeURIComponent(playerId || '')}`
            );

            websocket.onopen = () => {
                setIsConnected(true);
                hasEverConnectedRef.current = true;
                reconnectAttemptsRef.current = 0;
                // console.log('Connected to WebSocket');
            };

            websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.channel === "game") {
                    setMessagesGame(prev => {
                        const isDuplicate = prev.some(m => m.content === message.content && m.username === message.username && m.time === message.time);
                        if (isDuplicate) return prev;
                        return [...prev, { ...message, time: message.time || new Date().toLocaleTimeString() }];
                    });
                    if (message.SenderId === playerIdRef.current) {
                        setQuestionLog(prev => {
                            const isDuplicate = prev.some(m => m.content === message.content && m.time === message.time);
                            if (isDuplicate) return prev;
                            return [...prev, { ...message, question: message.content, content: message.content, answer: null, time: message.time || new Date().toLocaleTimeString() }];
                        });
                    } else {
                        setReceivedMessage(message.content);
                    }
                    if (message.lobbyTurn === playerIdRef.current) { setTurn(true); } else { setTurn(false); }
                } else if (message.channel === "lobby_update") {
                    setLobby(message.lobby);
                    if (message.lobby?.gameOver) {
                        if (opponentDisconnectedRef.current) {
                            setOpponentLeftAfterGame(true);
                            setRematchModalOpen(false);
                            setIncomingRematch(null);
                        }
                        opponentDisconnectedRef.current = false;
                        setOpponentDisconnected(false);
                        if (disconnectIntervalRef.current) {
                            clearInterval(disconnectIntervalRef.current);
                            disconnectIntervalRef.current = null;
                        }
                    }
                    // If the joiner was removed (lobby back to 1 player, game not over),
                    // clear any pre-game disconnect countdown — they're officially gone.
                    if (!message.lobby?.gameOver && !message.lobby?.gameStartedAt) {
                        const playerCount = message.lobby?.players?.length ?? 0;
                        if (playerCount < 2) {
                            setPreGameDisconnected(false);
                            setPreGameCountdown(30);
                            setPreGameDisconnectedIsHost(false);
                            if (preGameIntervalRef.current) {
                                clearInterval(preGameIntervalRef.current);
                                preGameIntervalRef.current = null;
                            }
                        }
                    }
                } else if (message.channel === "lobby_cancelled") {
                    setLobbyCancelled(true);
                    setTimeout(() => router.push('/'), 2500);
                } else if (message.channel === "rematch_request") {
                    if (message.SenderId !== playerIdRef.current) {
                        setIncomingRematch({ characterSetName: message.content });
                    }
                } else if (message.channel === "rematch_ready") {
                    if (message.lobby) {
                        _rematchLobbyCache[message.content] = message.lobby;
                    }
                    router.push(`/lobby/${message.content}`);
                } else if (message.channel === "rematch_declined") {
                    if (message.SenderId !== playerIdRef.current) {
                        setRematchWaiting(false);
                        setRematchDeclinedToast(true);
                        setTimeout(() => setRematchDeclinedToast(false), 3000);
                    }
                } else if (message.channel === "opponent_disconnected") {
                    if (message.SenderId !== playerIdRef.current) {
                        if (lobbyRef.current?.gameOver) {
                            setOpponentLeftAfterGame(true);
                            setRematchModalOpen(false);
                            setIncomingRematch(null);
                        } else if (!lobbyRef.current?.gameStartedAt) {
                            // Pre-game phase (character pick / ready-up) — 30s countdown
                            // Determine if the disconnected player is the host so we can show accurate text.
                            const disconnectedPlayer = lobbyRef.current?.players?.find(p => p.id === message.SenderId);
                            const isHostDisconnect =
                                (disconnectedPlayer?.userId && disconnectedPlayer.userId === lobbyRef.current?.userId)
                                || (disconnectedPlayer?.guestId && disconnectedPlayer.guestId === lobbyRef.current?.guestId);
                            setPreGameDisconnectedIsHost(!!isHostDisconnect);
                            setPreGameDisconnected(true);
                            setPreGameCountdown(30);
                            if (preGameIntervalRef.current) clearInterval(preGameIntervalRef.current);
                            preGameIntervalRef.current = setInterval(() => {
                                setPreGameCountdown(prev => {
                                    if (prev <= 1) {
                                        clearInterval(preGameIntervalRef.current);
                                        preGameIntervalRef.current = null;
                                        return 0;
                                    }
                                    return prev - 1;
                                });
                            }, 1000);
                        } else {
                            opponentDisconnectedRef.current = true;
                            setOpponentDisconnected(true);
                            setDisconnectCountdown(120);
                            if (disconnectIntervalRef.current) clearInterval(disconnectIntervalRef.current);
                            disconnectIntervalRef.current = setInterval(() => {
                                setDisconnectCountdown(prev => {
                                    if (prev <= 1) {
                                        clearInterval(disconnectIntervalRef.current);
                                        disconnectIntervalRef.current = null;
                                        return 0;
                                    }
                                    return prev - 1;
                                });
                            }, 1000);
                        }
                    }
                } else if (message.channel === "player_reconnected") {
                    if (message.SenderId !== playerIdRef.current) {
                        opponentDisconnectedRef.current = false;
                        setOpponentDisconnected(false);
                        setDisconnectCountdown(120);
                        setPreGameDisconnected(false);
                        setPreGameCountdown(30);
                        setPreGameDisconnectedIsHost(false);
                        if (preGameIntervalRef.current) {
                            clearInterval(preGameIntervalRef.current);
                            preGameIntervalRef.current = null;
                        }
                        if (disconnectIntervalRef.current) {
                            clearInterval(disconnectIntervalRef.current);
                            disconnectIntervalRef.current = null;
                        }
                    }
                } else if (message.channel === "response") {
                    if (message.lobbyTurn === playerIdRef.current) { setTurn(true); } else { setTurn(false); }
                    if (message.SenderId != playerIdRef.current) {
                        setQuestionLog(prev => {
                            if (prev.length === 0) return prev;
                            const updated = [...prev];
                            const lastIndex = updated.length - 1;
                            updated[lastIndex] = { ...updated[lastIndex], content: `${updated[lastIndex].content} - ${message.content}`, answer: message.content };
                            return updated;
                        });
                        setReceivedMessage("");
                        setWaitingReponse(false);
                        setAnswerToast({ answer: message.content, question: sentMessage });
                    }
                } else if (message.channel === "pending_question") {
                    setReceivedMessage(message.content);
                } else if (message.channel === "pending_waiting") {
                    setWaitingReponse(true);
                } else {
                    setMessagesChat(prev => {
                        const isDuplicate = prev.some(m => m.content === message.content && m.username === message.username && m.time === message.time);
                        if (isDuplicate) return prev;
                        return [...prev, { ...message, time: message.time || new Date().toLocaleTimeString(), read: !isMinimizedRef.current }];
                    });
                }
            };

            websocket.onerror = (error) => { /* console.error('WebSocket error:', error); */ };

            websocket.onclose = () => {
                if (wsRef.current === websocket) wsRef.current = null;
                if (plannedClose) return; // planned close — leave isConnected alone
                setIsConnected(false);
                if (!shouldReconnectRef.current) return;
                const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
                reconnectAttemptsRef.current++;
                // console.log(`WebSocket closed. Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            wsRef.current = websocket;
        };

        connect();

        return () => {
            plannedClose = true;
            shouldReconnectRef.current = false;
            clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (disconnectIntervalRef.current) {
                clearInterval(disconnectIntervalRef.current);
                disconnectIntervalRef.current = null;
            }
            if (turnTimerIntervalRef.current) {
                clearInterval(turnTimerIntervalRef.current);
                turnTimerIntervalRef.current = null;
            }
        };
    }, [lobbyID, username, playerId]);

    // Debounce the reconnecting banner so brief reconnects (e.g. playerId resolving) don't flash it

    useEffect(() => {
        // if (lobby?.players) { console.log(`Player count changed: ${lobby.players.length}`); }
    }, [lobby]);

    // Drive the turn countdown from lobby state
    useEffect(() => {
        if (turnTimerIntervalRef.current) {
            clearInterval(turnTimerIntervalRef.current);
            turnTimerIntervalRef.current = null;
        }
        if (!lobby || !lobby.turnTimerSeconds || lobby.gameOver) {
            setTurnTimeLeft(null);
            return;
        }
        if (lobby.turnTimerPaused) {
            setTurnTimeLeft(lobby.turnRemainingMs);
            return;
        }
        if (!lobby.turnStartedAt) {
            setTurnTimeLeft(lobby.turnTimerSeconds * 1000);
            return;
        }
        const tick = () => {
            const elapsed = Date.now() - new Date(lobby.turnStartedAt).getTime();
            const remaining = lobby.turnTimerSeconds * 1000 - elapsed;
            setTurnTimeLeft(Math.max(0, remaining));
        };
        tick();
        turnTimerIntervalRef.current = setInterval(tick, 250);
        return () => {
            if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
        };
    }, [lobby?.turnStartedAt, lobby?.turnTimerPaused, lobby?.turnRemainingMs, lobby?.turnTimerSeconds, lobby?.gameOver]);

    const confirmLeave = async () => {
        leavingRef.current = true;
        setShowLeaveConfirm(false);
        try {
            await apiFetch(`/lobby/forfeit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lobbyId: lobbyID }),
            });
        } catch (err) {
            // console.error("Leave error:", err);
        }
        router.push('/');
    };

    useEffect(() => { checkLobbyStatus(); }, [lobbyID]);
    // Consume pre-loaded lobby data from a rematch_ready message (skips CONNECTING screen)
    useEffect(() => {
        const cached = _rematchLobbyCache[lobbyID];
        if (cached) {
            setLobby(cached);
            delete _rematchLobbyCache[lobbyID];
        }
    }, [lobbyID]);
    useEffect(() => { lobbyRef.current = lobby; }, [lobby]);
    useEffect(() => { if (waitingReponse) setAnswerToast(null); }, [waitingReponse]);
    useEffect(() => {
        if (preGameCountdown === 0 && preGameDisconnected) {
            const t = setTimeout(() => router.push('/'), 1500);
            return () => clearTimeout(t);
        }
    }, [preGameCountdown, preGameDisconnected]);

    useEffect(() => {
        if (!lobbyID || !playerId) return;
        apiFetch(`/lobby/${lobbyID}/messages`)
            .then(r => r.json())
            .then(msgs => {
                if (!Array.isArray(msgs) || msgs.length === 0) return;
                const log = [];
                msgs.forEach(msg => {
                    if (msg.Channel === 'game' && msg.SenderID === playerId) {
                        log.push({ question: msg.Content, content: msg.Content, answer: null, username: msg.Username, time: new Date(msg.CreatedAt).toLocaleTimeString() });
                    } else if (msg.Channel === 'response') {
                        if (log.length > 0) {
                            const last = log[log.length - 1];
                            log[log.length - 1] = { ...last, content: `${last.content} - ${msg.Content}`, answer: msg.Content };
                        }
                    }
                });
                setQuestionLog(log);
            })
            .catch(() => { });
    }, [lobbyID, playerId]);


    useEffect(() => {
        if (
            lobby &&
            lobby.players?.length < 2 &&
            !lobby.players.some(player => player.userId === user?.id) &&
            lobby.code &&
            lobby.id &&
            !conflictLobbyIdRef.current &&  // use ref — synchronous check
            !leavingRef.current             // don't rejoin if we're intentionally leaving
        ) {
            joinLobby(lobby.code);
        }
    }, [lobby?.id, lobby?.players?.length]);

    useEffect(() => {
        if (lobbyID && user?.id && lobby?.players?.length && !gameState) {
            const alreadyInLobby = lobby.players.some(p => p.userId === user.id || p.guestId === user.id);
            if (alreadyInLobby) { getGameState(); }
        }
    }, [lobbyID, user?.id, lobby?.players?.length, gameState]);

    // Fetch game state when game ends so we get the opponent's revealed character
    useEffect(() => {
        if (lobby?.gameOver) { getGameState(); }
    }, [lobby?.gameOver]);

    const loadRematchPublic = (page) => {
        const params = new URLSearchParams({ page, pageSize: REMATCH_PAGE_SIZE, sort: "most-popular" });
        const headers = { "Content-Type": "application/json" };
        apiFetch(`/player/set/public?${params}`, { headers })
            .then(r => r.json())
            .then(data => { setRematchPublicSets(data.sets ?? []); setRematchPublicTotal(data.total ?? 0); })
            .catch(() => { });
    };

    const loadRematchMy = (page) => {
        if (!user || user.isGuest) return;
        const params = new URLSearchParams({ page, pageSize: REMATCH_PAGE_SIZE });
        apiFetch(`/player/set/player?${params}`, {
            headers: {  }
        })
            .then(r => r.json())
            .then(data => { setRematchMySets(data.sets ?? []); setRematchMyTotal(data.total ?? 0); })
            .catch(() => { });
    };

    // Fetch character sets for rematch when game ends
    useEffect(() => {
        if (!lobby?.gameOver) return;
        loadRematchPublic(1);
        loadRematchMy(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobby?.gameOver]);

    // Rematch page navigation
    useEffect(() => {
        if (lobby?.gameOver) loadRematchPublic(rematchPublicPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rematchPublicPage]);

    useEffect(() => {
        if (lobby?.gameOver) loadRematchMy(rematchMyPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rematchMyPage]);

    const conflictModal = conflictLobbyId && (
        <>
            <style>{`
                .conflict-overlay {
                    position: fixed; inset: 0; z-index: 200;
                    background: rgba(26, 21, 16, 0.5);
                    display: flex; align-items: center; justify-content: center;
                    animation: fadeIn 150ms ease-out;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .conflict-modal {
                    background: var(--surface-0);
                    border: 1px solid var(--border);
                    border-radius: var(--r);
                    padding: 32px;
                    width: 100%;
                    max-width: 400px;
                    margin: 16px;
                    animation: slideUp 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
                .conflict-modal__icon {
                    width: 48px; height: 48px;
                    background: #FEF7ED; border: 1px solid #F5D28A;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 20px; color: #C98C1A;
                }
                .conflict-modal__title {
                    font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700;
                    color: var(--text-900); letter-spacing: -0.02em;
                    text-align: center; margin-bottom: 8px;
                }
                .conflict-modal__sub {
                    font-size: 14px; color: var(--text-600);
                    text-align: center; line-height: 1.6; margin-bottom: 24px;
                }
                .conflict-modal__actions { display: flex; flex-direction: column; gap: 10px; }
                .conflict-modal__btn {
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; height: 44px; border-radius: 6px;
                    font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
                    cursor: pointer; border: none; width: 100%;
                    transition: background 150ms ease-out;
                }
                .conflict-modal__btn--rejoin { background: var(--accent); color: #fff; }
                .conflict-modal__btn--rejoin:hover { background: var(--accent-dim); }
                .conflict-modal__btn--forfeit {
                    background: var(--surface-1); color: var(--state-out);
                    border: 1px solid var(--border);
                }
                .conflict-modal__btn--forfeit:hover { background: var(--surface-2); }
                .conflict-modal__cancel {
                    background: none; border: none;
                    font-family: 'DM Sans', sans-serif; font-size: 13px;
                    color: var(--text-400); cursor: pointer; text-align: center;
                    margin-top: 4px; padding: 4px; transition: color 150ms;
                }
                .conflict-modal__cancel:hover { color: var(--text-600); }
            `}</style>
            <div className="conflict-overlay">
                <div className="conflict-modal">
                    <div className="conflict-modal__icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <div className="conflict-modal__title">You&apos;re already in a game</div>
                    <div className="conflict-modal__sub">
                        You have an active game in progress. Forfeit it to join this one, or go back to your existing game.
                    </div>
                    <div className="conflict-modal__actions">
                        <button className="conflict-modal__btn conflict-modal__btn--rejoin"
                            onClick={() => router.push(`/lobby/${conflictLobbyId}`)}>
                            Back to My Game
                        </button>
                        <button className="conflict-modal__btn conflict-modal__btn--forfeit"
                            onClick={forfeitAndRejoin}>
                            Forfeit & Join This Game
                        </button>
                        <button className="conflict-modal__cancel"
                            onClick={clearConflict}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    /* ── GAME OVER ── */
    if (lobby?.gameOver) {
        const currentPlayer = lobby.players.find(p => p.userId === user?.id || p.guestId === user?.id);
        const isWinner = currentPlayer?.id === lobby.winner;
        const myChar = gameState?.secretCharacter;
        const opponentChar = gameState?.opponentCharacter;

        let timePlayed = null;
        if (lobby.createdAt && lobby.gameOverAt) {
            const ms = new Date(lobby.gameOverAt) - new Date(lobby.createdAt);
            const totalSec = Math.floor(ms / 1000);
            const mins = Math.floor(totalSec / 60);
            const secs = totalSec % 60;
            timePlayed = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        }

        return (
            <>
                <StyleInjector />
                {isWinner && <Confetti />}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)', position: 'relative' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                        style={{ maxWidth: 560, width: '100%', position: 'relative', zIndex: 20 }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s4)' }}>
                            <div style={{ width: 48, height: 4, background: isWinner ? 'var(--state-live)' : 'var(--state-out)', borderRadius: 2, margin: '0 auto var(--s3)' }} />
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 36, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s1)', lineHeight: 1 }}>
                                {isWinner ? "Victory!" : "Defeat"}
                            </h1>
                        </div>

                        {/* Character Reveal */}
                        <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s3)' }}>
                            <span className="gw-label" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--s3)' }}>Character Reveal</span>
                            <div style={{ display: 'flex', gap: 'var(--s4)', justifyContent: 'center' }}>
                                {/* Your character */}
                                <div style={{ flex: 1, textAlign: 'center', maxWidth: 200 }}>
                                    <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s2)', color: 'var(--accent)' }}>You</span>
                                    {myChar ? (
                                        <>
                                            <img
                                                src={imgUrl(myChar.image)}
                                                alt={myChar.name}
                                                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--r)', border: '2px solid var(--border)' }}
                                            />
                                            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', marginTop: 'var(--s1)', marginBottom: 0 }}>
                                                {myChar.name}
                                            </p>
                                        </>
                                    ) : (
                                        <div style={{ width: '100%', height: 180, background: 'var(--surface-1)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Loader2 size={20} color="var(--text-400)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s2)' }}>
                                    <div style={{ width: 1, flex: 1, background: 'var(--border)' }} />
                                    <span className="gw-label">vs</span>
                                    <div style={{ width: 1, flex: 1, background: 'var(--border)' }} />
                                </div>

                                {/* Opponent character */}
                                <div style={{ flex: 1, textAlign: 'center', maxWidth: 200 }}>
                                    <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s2)', color: 'var(--text-600)' }}>Opponent</span>
                                    {opponentChar ? (
                                        <motion.div
                                            initial={{ rotateY: 90, opacity: 0 }}
                                            animate={{ rotateY: 0, opacity: 1 }}
                                            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                                            style={{ transformStyle: 'preserve-3d' }}
                                        >
                                            <img
                                                src={imgUrl(opponentChar.image)}
                                                alt={opponentChar.name}
                                                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--r)', border: `2px solid ${isWinner ? 'var(--state-live)' : 'var(--state-out)'}` }}
                                            />
                                            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', marginTop: 'var(--s1)', marginBottom: 0 }}>
                                                {opponentChar.name}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <div style={{ width: '100%', height: 180, background: 'var(--surface-1)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Loader2 size={20} color="var(--text-400)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
                            <div className="gw-card" style={{ padding: 'var(--s3)', textAlign: 'center' }}>
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 24, color: 'var(--text-900)', margin: 0, letterSpacing: '-0.02em' }}>
                                    {questionLog.length}
                                </p>
                                <span className="gw-label" style={{ marginTop: 2, display: 'block' }}>Questions Asked</span>
                            </div>
                            <div className="gw-card" style={{ padding: 'var(--s3)', textAlign: 'center' }}>
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 24, color: 'var(--text-900)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    {timePlayed ?? '—'}
                                </p>
                                <span className="gw-label" style={{ marginTop: 2, display: 'block' }}>Time Played</span>
                            </div>
                        </div>

                        {/* Actions */}
                        {rematchDeclinedToast && (
                            <div style={{ borderLeft: '3px solid var(--state-out)', background: 'var(--surface-1)', borderRadius: 'var(--r)', padding: 'var(--s3) var(--s4)', marginBottom: 'var(--s3)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-600)' }}>
                                Opponent declined the rematch.
                            </div>
                        )}

                        {rematchWaiting && (
                            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', padding: 'var(--s4) var(--s5)', marginBottom: 'var(--s4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s4)' }}>
                                    <div>
                                        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: 'var(--text-900)', margin: 0, marginBottom: 'var(--s1)' }}>
                                            Rematch request sent
                                        </p>
                                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-600)', margin: 0 }}>
                                            {sentRematchSetName ? <>Playing <strong>{sentRematchSetName}</strong> — </> : ''}Waiting for opponent to accept…
                                        </p>
                                    </div>
                                    <button className="gw-btn-ghost" style={{ height: 36, padding: '0 var(--s4)', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13 }} onClick={cancelRematch}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                            {!rematchWaiting && (
                                <button
                                    className="gw-btn-ghost"
                                    style={{ flex: 1, height: 44, opacity: opponentLeftAfterGame ? 0.45 : 1, cursor: opponentLeftAfterGame ? 'not-allowed' : 'pointer' }}
                                    onClick={() => { if (!opponentLeftAfterGame) { setSelectedRematchSet(lobby.characterSet ?? null); setRematchModalOpen(true); } }}
                                    disabled={opponentLeftAfterGame}
                                >
                                    {opponentLeftAfterGame ? "Opponent Left" : "Rematch"}
                                </button>
                            )}
                            <button className="gw-btn-primary" style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s2)' }} onClick={() => { setIsLeavingGame(true); router.push('/'); }} disabled={isLeavingGame}>
                                {isLeavingGame && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                {isLeavingGame ? 'Leaving…' : 'Back to Home'}
                            </button>
                        </div>

                        {/* Rematch set picker modal */}
                        {rematchModalOpen && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                                <div className="gw-card" style={{ width: '100%', maxWidth: 'min(520px, calc(100vw - 32px))', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 'var(--s6)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)' }}>
                                        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: 'var(--text-900)', margin: 0 }}>Choose Character Set</h2>
                                        <button onClick={() => setRematchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-400)', fontSize: 20, lineHeight: 1, padding: 'var(--s1)' }}>✕</button>
                                    </div>
                                    {/* Last used set */}
                                    {lobby.characterSet && (
                                        <div
                                            onClick={() => setSelectedRematchSet(lobby.characterSet)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', background: 'var(--surface-1)', border: `2px solid ${selectedRematchSet?.id === lobby.characterSet.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: 'var(--s3)', marginBottom: 'var(--s4)', cursor: 'pointer', transition: 'border-color 150ms' }}
                                        >
                                            <SetCover coverImageName={lobby.characterSet.coverImageName} alt={lobby.characterSet.name} style={{ width: 48, height: 48, borderRadius: 4, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-400)', margin: '0 0 2px' }}>Last used</p>
                                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lobby.characterSet.name}</p>
                                            </div>
                                            {selectedRematchSet?.id === lobby.characterSet.id && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                    )}
                                    {/* Tabs */}
                                    <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s4)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
                                        {['public', 'mine'].map(tab => (
                                            <button key={tab} onClick={() => setRematchSetView(tab)} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: 'var(--s1) var(--s3)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', background: rematchSetView === tab ? 'var(--accent)' : 'transparent', color: rematchSetView === tab ? '#fff' : 'var(--text-600)' }}>
                                                {tab === 'public' ? 'Public' : 'My Sets'}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Set grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s3)', overflowY: 'auto', flex: 1 }}>
                                        {(rematchSetView === 'public' ? rematchPublicSets : rematchMySets).map(set => (
                                            <div key={set.id} onClick={() => setSelectedRematchSet(set)} style={{ background: 'var(--surface-0)', border: `2px solid ${selectedRematchSet?.id === set.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: 'var(--s3)', cursor: 'pointer', transition: 'border-color 150ms' }}>
                                                <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 80, borderRadius: 4, marginBottom: 'var(--s2)' }} />
                                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 13, color: 'var(--text-900)', margin: 0 }}>{set.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Rematch pagination */}
                                    {(() => {
                                        const total = rematchSetView === 'public' ? rematchPublicTotal : rematchMyTotal;
                                        const page = rematchSetView === 'public' ? rematchPublicPage : rematchMyPage;
                                        const setPage = rematchSetView === 'public' ? setRematchPublicPage : setRematchMyPage;
                                        const pages = Math.ceil(total / REMATCH_PAGE_SIZE);
                                        if (pages <= 1) return null;
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 'var(--s3)', flexWrap: 'wrap' }}>
                                                <button onClick={() => setPage(page - 1)} disabled={page === 1} style={{ padding: '4px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
                                                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                                                    <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 8px', minWidth: 28, borderRadius: 'var(--r)', border: '1px solid', borderColor: p === page ? 'var(--accent)' : 'var(--border)', background: p === page ? 'var(--accent)' : 'var(--bg)', color: p === page ? '#fff' : 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: p === page ? 600 : 400, cursor: p === page ? 'default' : 'pointer' }}>{p}</button>
                                                ))}
                                                <button onClick={() => setPage(page + 1)} disabled={page === pages} style={{ padding: '4px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1 }}>→</button>
                                            </div>
                                        );
                                    })()}
                                    <button className="gw-btn-primary" style={{ marginTop: 'var(--s5)', height: 44 }} disabled={!selectedRematchSet || isSendingRematch} onClick={sendRematchRequest}>
                                        {isSendingRematch && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                        {isSendingRematch ? 'Sending…' : 'Send Rematch Request'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Incoming rematch modal */}
                        {incomingRematch && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                                <div className="gw-card" style={{ width: '100%', maxWidth: 'min(380px, calc(100vw - 32px))', padding: 'var(--s8)', textAlign: 'center' }}>
                                    <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: 'var(--text-900)', marginBottom: 'var(--s3)' }}>Rematch?</h2>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s6)' }}>
                                        Your opponent wants a rematch with <strong>{incomingRematch.characterSetName}</strong>.
                                    </p>
                                    <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                                        <button className="gw-btn-ghost" style={{ flex: 1, height: 44 }} disabled={rematchResponse !== null} onClick={declineRematch}>
                                            {rematchResponse === 'declining' && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                            {rematchResponse === 'declining' ? 'Declining…' : 'Decline'}
                                        </button>
                                        <button className="gw-btn-primary" style={{ flex: 1, height: 44 }} disabled={rematchResponse !== null} onClick={acceptRematch}>
                                            {rematchResponse === 'accepting' && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                            {rematchResponse === 'accepting' ? 'Accepting…' : 'Accept'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </>
        );
    }

    /* ── LOADING ── */
    if (lobbyStatus === null) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s4)' }}>
                    <Loader2 size={32} color="var(--accent)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-600)' }}>Checking lobby…</p>
                </div>
            </>
        );
    }

    /* ── LOBBY NOT FOUND ── */
    if (!lobbyStatus.exists) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                    <div className="gw-card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
                        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 32, color: 'var(--text-900)', letterSpacing: '-0.02em', marginBottom: 'var(--s3)' }}>Lobby not found</h1>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s8)' }}>This lobby doesn&apos;t exist or has expired.</p>
                        <button className="gw-btn-primary" style={{ height: 44, padding: '0 var(--s8)' }} onClick={() => router.push('/')}>Home</button>
                    </div>
                </div>
            </>
        );
    }

    /* ── CONNECTING ── */
    if (!lobby && lobbyStatus?.exists) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s4)' }}>
                    <Loader2 size={32} color="var(--accent)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-600)' }}>Connecting to game…</p>
                </div>
            </>
        );
    }

    /* ── GAME FULL (spectator) ── */
    if (lobby && !lobby.players.some(player => player.userId === user?.id || player.guestId === user?.id) && lobby.players.length >= 2) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                    <div className="gw-card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
                        <Lock size={32} color="var(--text-400)" style={{ marginBottom: 'var(--s4)' }} />
                        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 32, color: 'var(--text-900)', letterSpacing: '-0.02em', marginBottom: 'var(--s3)' }}>Game is full</h1>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s8)' }}>This game already has 2 players.</p>
                        <button className="gw-btn-primary" style={{ height: 44, padding: '0 var(--s8)' }} onClick={() => router.push('/')}>Browse Games</button>
                    </div>
                </div>
            </>
        );
    }

    /* ── WAITING FOR PLAYER 2 ── */
    if (lobby?.players?.length < 2 && (lobby?.players.some(player => player.userId === user?.id))) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                    <div style={{ maxWidth: 480, width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Lobby</span>
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 36, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s2)' }}>
                                Waiting for a second player
                            </h1>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14 }}>Share this game to get started.</p>
                        </div>
                        <div className="gw-card" style={{ marginBottom: 'var(--s3)', padding: 'var(--s6)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Share Link</span>
                            <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                                <input
                                    type="text"
                                    value={typeof window !== 'undefined' ? window.location.href : ''}
                                    readOnly
                                    className="gw-input"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className={isCopied ? 'gw-btn-ghost' : 'gw-btn-primary'}
                                    style={{ height: 36, minWidth: 96, flexShrink: 0 }}
                                    onClick={handleCopyClick}
                                    disabled={isCopied}
                                >
                                    {isCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', margin: 'var(--s6) 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span className="gw-label">or join with code</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                        <div className="gw-card" style={{ textAlign: 'center', padding: 'var(--s8)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s4)' }}>Room Code</span>
                            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 56, letterSpacing: '0.12em', color: 'var(--text-900)', lineHeight: 1 }}>
                                {lobby?.code}
                            </p>
                        </div>
                        <button
                            className="gw-btn-danger"
                            style={{ width: '100%', marginTop: 'var(--s3)', justifyContent: 'center' }}
                            onClick={async () => {
                                try {
                                    await apiFetch(`/lobby/forfeit`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ lobbyId: lobbyID }),
                                    });
                                } catch (err) {
                                    // console.error(err);
                                }
                                router.push('/');
                            }}
                        >
                            Cancel & Exit
                        </button>
                    </div>
                </div>
            </>
        );
    } else if (lobby.players.length >= 2 && !(lobby.players.some(player => player.userId === user?.id || player.guestId === user?.id))) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                    <div className="gw-card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
                        <Lock size={32} color="var(--text-400)" style={{ marginBottom: 'var(--s4)' }} />
                        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 32, color: 'var(--text-900)', letterSpacing: '-0.02em', marginBottom: 'var(--s3)' }}>Game is full</h1>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s8)' }}>This game already has 2 players.</p>
                        <button className="gw-btn-primary" style={{ height: 44, padding: '0 var(--s8)' }} onClick={() => router.push('/lobby')}>Browse Games</button>
                    </div>
                </div>
            </>
        );
    }

    /* ── GAME STATE LOADING ── */
    if (!gameState) {
        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s4)' }}>
                    <Loader2 size={32} color="var(--accent)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-600)' }}>Loading game…</p>
                </div>
            </>
        );
    }

    /* ── CHARACTER SELECTION ── */
    if (gameState.secretCharacter === undefined) {
        if (conflictLobbyId) {
            return (
                <>
                    <StyleInjector />
                    {conflictModal}
                    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s4)' }}>
                        <Loader2 size={32} color="var(--accent)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-600)' }}>Waiting to join…</p>
                    </div>
                </>
            );
        }

        const IMAGE_SIZE = '160px';

        const Item = styled(Paper)(({ theme, isSelected }) => ({
            ...theme.typography.body2,
            padding: theme.spacing(1),
            textAlign: 'center',
            backgroundColor: 'var(--surface-0)',
            color: 'var(--text-900)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            position: 'relative',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            boxShadow: 'none',
            '&:hover': {
                transform: 'translateY(-2px)',
                backgroundColor: 'var(--surface-1)',
                borderColor: 'var(--accent)',
            },
            '& img': {
                width: '100%',
                height: IMAGE_SIZE,
                objectFit: 'cover',
                borderRadius: 'calc(var(--r) - 2px)',
                imageRendering: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
            },
            ...(isSelected && {
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: theme.spacing(1),
                    left: theme.spacing(1),
                    right: theme.spacing(1),
                    height: IMAGE_SIZE,
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                    borderRadius: 'calc(var(--r) - 2px)',
                }
            }),
        }));

        const leaveLobbyFromPicker = () => setShowLeaveConfirm(true);

        const selectSecretCharacter = async (charid) => {
            if (isSelectingSecret) return;
            setError(null);
            setIsSelectingSecret(true);
            try {
                const res = await apiFetch(`/lobby/setSecretChar`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lobbyCode: lobby?.id, secretCharacter: charid }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || "Something went wrong"); return; }
                setGameState(data);
            } catch (err) {
                // console.error(err);
                setError("Network error");
            } finally {
                setIsSelectingSecret(false);
            }
        };

        const meInPicker = lobby?.players?.find(p => p.userId === user?.id || p.guestId === user?.id);
        const iAmHostInPicker = (meInPicker?.userId && meInPicker.userId === lobby?.userId)
            || (meInPicker?.guestId && meInPicker.guestId === lobby?.guestId);
        const leaveConfirmModal = showLeaveConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                <div className="gw-card" style={{ width: '100%', maxWidth: 360, padding: 'var(--s6)' }}>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: 'var(--text-900)', marginBottom: 'var(--s2)' }}>Leave Lobby?</h2>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s6)' }}>
                        {iAmHostInPicker
                            ? 'Leaving will cancel the lobby and remove your opponent.'
                            : 'Leaving will remove you from the lobby.'}
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                        <button className="gw-btn-ghost" style={{ flex: 1, height: 40 }} onClick={() => setShowLeaveConfirm(false)}>
                            Cancel
                        </button>
                        <button className="gw-btn-primary" style={{ flex: 1, height: 40, background: 'var(--state-out)', borderColor: 'var(--state-out)' }} onClick={confirmLeave}>
                            Leave
                        </button>
                    </div>
                </div>
            </div>
        );

        const characters = gameState?.lobby.lobbyCharacters || [];
        return (
            <>
                <StyleInjector />
                {conflictModal}
                {leaveConfirmModal}
                {preGameDisconnected && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: preGameCountdown === 0 ? 'var(--state-out)' : '#7A5C1E', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px var(--s4)', letterSpacing: '0.02em' }}>
                        {preGameDisconnectedIsHost
                            ? preGameCountdown > 0
                                ? `Host disconnected — lobby will be cancelled in ${preGameCountdown}s`
                                : 'Host left. Returning to home…'
                            : preGameCountdown > 0
                                ? `Opponent disconnected — they'll be removed in ${preGameCountdown}s`
                                : 'Opponent removed. Lobby is reopening…'}
                    </div>
                )}
                {lobbyCancelled && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--state-out)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px var(--s4)', letterSpacing: '0.02em' }}>
                        The lobby was cancelled — redirecting…
                    </div>
                )}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'var(--s12) var(--s6)' }}>
                    <div style={{ maxWidth: 960, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s10)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Character Selection</span>
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 40, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s3)' }}>
                                Choose your secret character
                            </h1>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14 }}>
                                Your opponent will try to guess who you picked.
                            </p>
                        </div>
                        <div style={{ position: 'relative' }}>
                            {isSelectingSecret && (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(247,243,238,0.6)', borderRadius: 'var(--r)' }}>
                                    <Loader2 size={32} color="var(--accent)" style={{ animation: 'gw-spin 1s linear infinite' }} />
                                </div>
                            )}
                            <Grid container spacing={2} justifyContent="center" style={{ opacity: isSelectingSecret ? 0.5 : 1, pointerEvents: isSelectingSecret ? 'none' : undefined }}>
                                {characters.map((char) => (
                                    <Grid item xs={6} sm={4} md={3} lg={2} key={char.id}>
                                        <Item onClick={() => selectSecretCharacter(char.id)} className="h-full">
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <img src={imgUrl(char.image)} alt={char.name} style={{ imageRendering: 'auto' }} />
                                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: 'var(--text-600)', marginTop: 8 }}>
                                                    {char.name}
                                                </span>
                                            </div>
                                        </Item>
                                    </Grid>
                                ))}
                            </Grid>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 'var(--s8)' }}>
                            <button
                                className="gw-btn-ghost"
                                style={{ height: 40, padding: '0 var(--s8)' }}
                                onClick={leaveLobbyFromPicker}
                            >
                                Leave Lobby
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /* ── READY SCREEN ── */
    if (!lobby?.players?.every(p => p.ready)) {
        const me = lobby?.players?.find(p => p.userId === user?.id || p.guestId === user?.id);
        const opponent = lobby?.players?.find(p => p.userId !== user?.id && p.guestId !== user?.id);
        const iAmReady = me?.ready ?? false;

        const leaveLobby = () => setShowLeaveConfirm(true);

        const setReady = async () => {
            setIsReadying(true);
            try {
                await apiFetch(`/lobby/ready`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lobbyId: lobbyID }),
                });
            } catch (err) {
                // console.error("Ready error:", err);
            } finally {
                setIsReadying(false);
            }
        };

        const setUnready = async () => {
            setIsReadying(true);
            try {
                await apiFetch(`/lobby/unready`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lobbyId: lobbyID }),
                });
            } catch (err) {
                // console.error("Unready error:", err);
            } finally {
                setIsReadying(false);
            }
        };

        const iAmHost = (me?.userId && me.userId === lobby?.userId)
            || (me?.guestId && me.guestId === lobby?.guestId);
        const leaveConfirmModal = showLeaveConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                <div className="gw-card" style={{ width: '100%', maxWidth: 360, padding: 'var(--s6)' }}>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: 'var(--text-900)', marginBottom: 'var(--s2)' }}>Leave Lobby?</h2>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s6)' }}>
                        {iAmHost
                            ? 'Leaving will cancel the lobby and remove your opponent.'
                            : 'Leaving will remove you from the lobby.'}
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                        <button className="gw-btn-ghost" style={{ flex: 1, height: 40 }} onClick={() => setShowLeaveConfirm(false)}>
                            Cancel
                        </button>
                        <button className="gw-btn-primary" style={{ flex: 1, height: 40, background: 'var(--state-out)', borderColor: 'var(--state-out)' }} onClick={confirmLeave}>
                            Leave
                        </button>
                    </div>
                </div>
            </div>
        );

        return (
            <>
                <StyleInjector />
                {conflictModal}
                {leaveConfirmModal}
                {preGameDisconnected && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: preGameCountdown === 0 ? 'var(--state-out)' : '#7A5C1E', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px var(--s4)', letterSpacing: '0.02em' }}>
                        {preGameDisconnectedIsHost
                            ? preGameCountdown > 0
                                ? `Host disconnected — lobby will be cancelled in ${preGameCountdown}s`
                                : 'Host left. Returning to home…'
                            : preGameCountdown > 0
                                ? `Opponent disconnected — they'll be removed in ${preGameCountdown}s`
                                : 'Opponent removed. Lobby is reopening…'}
                    </div>
                )}
                {lobbyCancelled && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--state-out)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px var(--s4)', letterSpacing: '0.02em' }}>
                        The lobby was cancelled — redirecting…
                    </div>
                )}
                <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'var(--s6)', paddingTop: '8vh', overflowY: 'auto' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                        style={{ maxWidth: 420, width: '100%' }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s4)' }}>
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 28, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s1)' }}>
                                Your secret character
                            </h1>
                        </div>

                        {/* Secret character preview */}
                        {gameState?.secretCharacter && (
                            <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s3)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <motion.img
                                    initial={{ scale: 0.92, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                                    src={imgUrl(gameState.secretCharacter.image)}
                                    alt={gameState.secretCharacter.name}
                                    style={{ width: 150, height: 190, objectFit: 'cover', borderRadius: 'var(--r)', border: '2px solid var(--accent-light)', marginBottom: 'var(--s3)' }}
                                />
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: 'var(--text-900)', margin: 0, textAlign: 'center' }}>
                                    {gameState.secretCharacter.name}
                                </p>
                            </div>
                        )}

                        {/* Player ready status */}
                        <div className="gw-card" style={{ padding: 'var(--s3)', marginBottom: 'var(--s3)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 2 }}>Players</span>
                            {[{ label: 'You', player: me }, { label: 'Opponent', player: opponent }].map(({ label, player }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s2) var(--s3)', background: 'var(--surface-1)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--text-900)' }}>
                                        {label}
                                    </span>
                                    <span style={{
                                        fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 11,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                        color: player?.ready ? 'var(--state-live)' : 'var(--text-400)',
                                        background: player?.ready ? '#EAF6EF' : 'var(--surface-2)',
                                        border: `1px solid ${player?.ready ? '#2A7A5640' : 'var(--border)'}`,
                                        borderRadius: 4, padding: '2px 10px',
                                    }}>
                                        {player?.ready ? 'Ready' : 'Waiting…'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {iAmReady ? (
                            <button
                                style={{ width: '100%', height: 44, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, background: '#FDF0EA', border: '1px solid #F2C5B4', borderRadius: 'var(--r)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#B84422', cursor: isReadying ? 'not-allowed' : 'pointer', transition: 'background 75ms', opacity: isReadying ? 0.6 : 1 }}
                                onClick={setUnready}
                                disabled={isReadying}
                            >
                                {isReadying && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                Unready
                            </button>
                        ) : (
                            <button
                                className="gw-btn-primary"
                                style={{ width: '100%', height: 44, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, opacity: isReadying ? 0.6 : 1 }}
                                onClick={setReady}
                                disabled={isReadying}
                            >
                                {isReadying && <Loader2 size={15} style={{ animation: 'gw-spin 1s linear infinite' }} />}
                                {isReadying ? 'Readying…' : 'Ready Up'}
                            </button>
                        )}
                        <button
                            className="gw-btn-ghost"
                            style={{ width: '100%', height: 40, justifyContent: 'center', marginTop: 'var(--s2)' }}
                            onClick={leaveLobby}
                        >
                            Leave Lobby
                        </button>
                    </motion.div>
                </div>
            </>
        );
    }

    /* ── MAIN GAME SCREEN ── */
    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: 'var(--surface-1)',
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        color: 'var(--text-900)',
        boxShadow: 'none',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
    }));

    return (
        <>
            <StyleInjector />
            {conflictModal}
            <Navbar />
            {!isConnected && hasEverConnectedRef.current && (
                <div style={{
                    background: '#7A5C1E',
                    color: '#fff',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '6px var(--s4)',
                    letterSpacing: '0.02em',
                }}>
                    Reconnecting…
                </div>
            )}
            {opponentDisconnected && (
                <div style={{
                    background: 'var(--state-out)',
                    color: '#fff',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '6px var(--s4)',
                    letterSpacing: '0.02em',
                }}>
                    Opponent disconnected — forfeiting in {Math.floor(disconnectCountdown / 60)}:{String(disconnectCountdown % 60).padStart(2, '0')}
                </div>
            )}
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: 'var(--bg)' }}>
                {lobby.chatFeature && !isMobile && (
                    <div style={{
                        width: 256,
                        flexShrink: 0,
                        background: 'var(--surface-0)',
                        borderRight: '1px solid var(--border)',
                        padding: 'var(--s4)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        height: 'calc(100vh - 56px)',
                        position: 'sticky',
                        top: 0,
                    }}>
                        {gameState && gameState.secretCharacter && (
                            <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                                <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Your secret character</span>
                                <img
                                    src={imgUrl(gameState.secretCharacter.image)}
                                    alt={gameState.secretCharacter.name}
                                    style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'calc(var(--r) - 2px)', imageRendering: 'auto' }}
                                />
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', marginTop: 'var(--s2)', textAlign: 'center' }}>
                                    {gameState.secretCharacter.name}
                                </p>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                            <MessageSquare size={13} color="var(--text-400)" />
                            <span className="gw-label">Question Log</span>
                            {questionLog.length > 0 && (
                                <span style={{ marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--text-400)' }}>
                                    {questionLog.length}
                                </span>
                            )}
                        </div>
                        <div style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--s2)',
                            paddingRight: 2,
                        }}>
                            {questionLog.length === 0 ? (
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-400)', textAlign: 'center', paddingTop: 'var(--s8)', margin: 0 }}>
                                    No questions yet
                                </p>
                            ) : (
                                [...questionLog].reverse().map((msg, index) => {
                                    const isAnswered = msg.answer !== null && msg.answer !== undefined;
                                    const answerText = isAnswered ? msg.answer.trim().toLowerCase() : null;
                                    const isYes = answerText === 'yes';
                                    const answerColor = isYes ? 'var(--state-live)' : 'var(--state-out)';
                                    const answerBg = isYes ? '#EAF6EF' : '#FEF0EE';
                                    return (
                                        <div key={index} style={{
                                            background: 'var(--surface-0)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--r)',
                                            padding: 'var(--s3)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--s2)',
                                        }}>
                                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-900)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                                                {msg.question || msg.content}
                                            </p>
                                            {isAnswered ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                                                    <span style={{
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontSize: 11, fontWeight: 700,
                                                        letterSpacing: '0.06em',
                                                        textTransform: 'uppercase',
                                                        color: answerColor,
                                                        background: answerBg,
                                                        border: `1px solid ${answerColor}44`,
                                                        borderRadius: 4,
                                                        padding: '2px 8px',
                                                    }}>
                                                        {msg.answer}
                                                    </span>
                                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-400)' }}>{msg.time}</span>
                                                </div>
                                            ) : (
                                                <span style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 11, fontWeight: 600,
                                                    color: 'var(--text-400)',
                                                    letterSpacing: '0.04em',
                                                }}>
                                                    Waiting for answer…
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                {lobby.chatFeature && isMobile && (
                    <>
                        <button
                            onClick={() => setMobilePanelOpen(true)}
                            aria-label="Open question log"
                            style={{
                                position: 'fixed',
                                bottom: 24,
                                right: 24,
                                zIndex: 200,
                                width: 52,
                                height: 52,
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                            }}
                        >
                            <MessageSquare size={22} />
                        </button>
                        <Drawer
                            anchor="bottom"
                            open={mobilePanelOpen}
                            onClose={() => setMobilePanelOpen(false)}
                            PaperProps={{
                                style: {
                                    background: 'var(--surface-0)',
                                    borderRadius: '12px 12px 0 0',
                                    maxHeight: '70vh',
                                    padding: 'var(--s4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                },
                            }}
                        >
                            <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto var(--s4)' }} />
                            {gameState && gameState.secretCharacter && (
                                <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                                    <img
                                        src={imgUrl(gameState.secretCharacter.image)}
                                        alt={gameState.secretCharacter.name}
                                        style={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 'calc(var(--r) - 2px)', imageRendering: 'auto', flexShrink: 0 }}
                                    />
                                    <div>
                                        <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s1)' }}>Your secret character</span>
                                        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', margin: 0 }}>
                                            {gameState.secretCharacter.name}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                                <MessageSquare size={13} color="var(--text-400)" />
                                <span className="gw-label">Question Log</span>
                                {questionLog.length > 0 && (
                                    <span style={{ marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--text-400)' }}>
                                        {questionLog.length}
                                    </span>
                                )}
                            </div>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--s2)', paddingRight: 2 }}>
                                {questionLog.length === 0 ? (
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-400)', textAlign: 'center', paddingTop: 'var(--s8)', margin: 0 }}>
                                        No questions yet
                                    </p>
                                ) : (
                                    [...questionLog].reverse().map((msg, index) => {
                                        const isAnswered = msg.answer !== null && msg.answer !== undefined;
                                        const answerText = isAnswered ? msg.answer.trim().toLowerCase() : null;
                                        const isYes = answerText === 'yes';
                                        const answerColor = isYes ? 'var(--state-live)' : 'var(--state-out)';
                                        const answerBg = isYes ? '#EAF6EF' : '#FEF0EE';
                                        return (
                                            <div key={index} style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 'var(--s3)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-900)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                                                    {msg.question || msg.content}
                                                </p>
                                                {isAnswered ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                                                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: answerColor, background: answerBg, border: `1px solid ${answerColor}44`, borderRadius: 4, padding: '2px 8px' }}>
                                                            {msg.answer}
                                                        </span>
                                                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-400)' }}>{msg.time}</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--text-400)', letterSpacing: '0.04em' }}>
                                                        Waiting for answer…
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Drawer>
                    </>
                )}

                <div style={{ flex: 1, padding: isMobile ? 'var(--s4)' : 'var(--s6)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {!lobby.chatFeature && (
                        <>
                            {/* Top bar: secret character + guess toggle (no-chat has no turns) */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--s5)',
                                marginBottom: 'var(--s5)',
                                padding: 'var(--s4)',
                                background: isGuessMode ? 'var(--surface-1)' : 'var(--surface-0)',
                                border: isGuessMode ? '2px solid var(--border-strong)' : '1px solid var(--border)',
                                borderLeft: isGuessMode ? '2px solid var(--border-strong)' : '1px solid var(--border)',
                                borderRadius: 'var(--r)',
                                transition: 'background 200ms, border-color 200ms',
                            }}>
                                {gameState?.secretCharacter && (
                                    <>
                                        <img
                                            src={imgUrl(gameState.secretCharacter.image)}
                                            alt={gameState.secretCharacter.name}
                                            style={{ width: 100, height: 125, objectFit: 'cover', borderRadius: 'calc(var(--r) - 2px)', flexShrink: 0, border: '1px solid var(--border)' }}
                                        />
                                        <div>
                                            <span style={{
                                                display: 'block',
                                                fontFamily: "'DM Sans', sans-serif",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                color: 'var(--text-400)',
                                                marginBottom: 'var(--s1)',
                                            }}>
                                                Your secret character
                                            </span>
                                            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: 'var(--text-900)' }}>
                                                {gameState.secretCharacter.name}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <button
                                    className={isGuessMode ? 'gw-btn-ghost' : 'gw-btn-primary'}
                                    style={{
                                        marginLeft: 'auto', height: 40, padding: '0 var(--s6)', justifyContent: 'center',
                                        ...(isGuessMode && {
                                            background: 'var(--surface-2)',
                                            border: '1px solid var(--border-strong)',
                                            color: 'var(--text-600)',
                                        }),
                                    }}
                                    onClick={() => setIsGuessMode(!isGuessMode)}
                                >
                                    {isGuessMode ? 'Stop Guessing' : 'Make a Guess'}
                                </button>
                            </div>
                            <GameState
                                user={user} setError={setError} lobby={lobby} setLobby={setLobby}
                                gameState={gameState} setGameState={setGameState}
                                isGuessMode={isGuessMode} setIsGuessMode={setIsGuessMode} getGameState={getGameState}
                            />
                        </>
                    )}

                    {lobby.chatFeature && (
                        <>
                            {/* Answer strip — shows question on send, flips to yes/no when answer arrives */}
                            <div style={{ height: 44, marginBottom: 'var(--s3)' }}>
                                {(answerToast || (waitingReponse && sentMessage)) && (() => {
                                    const question = answerToast?.question || sentMessage;
                                    const hasAnswer = !!answerToast;
                                    const isYes = answerToast?.answer?.trim().toLowerCase() === 'yes';
                                    return (
                                        <div style={{
                                            height: '100%',
                                            padding: '0 var(--s4)',
                                            borderRadius: 'var(--r)',
                                            background: hasAnswer ? (isYes ? '#EAF6EF' : '#FEF0EE') : 'var(--surface-1)',
                                            border: `1px solid ${hasAnswer ? (isYes ? '#2A7A5640' : '#C0392B40') : 'var(--border)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--s3)',
                                        }}>
                                            {hasAnswer && (
                                                <span style={{
                                                    fontFamily: "'Fraunces', serif",
                                                    fontWeight: 900,
                                                    fontSize: 18,
                                                    lineHeight: 1,
                                                    color: isYes ? '#2A7A56' : '#C0392B',
                                                    flexShrink: 0,
                                                }}>
                                                    {isYes ? 'Yes' : 'No'}
                                                </span>
                                            )}
                                            <span style={{
                                                fontFamily: "'DM Sans', sans-serif",
                                                fontSize: 13,
                                                color: hasAnswer ? 'var(--text-600)' : 'var(--text-900)',
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {question}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{ marginBottom: 'var(--s4)' }}>
                                {user && user.email && lobbyID && (
                                    <GameSend
                                        lobbyId={lobbyID} username={user.email} wsRef={wsRef}
                                        setIsConnected={setIsConnected} messages={messagesGame}
                                        setMessages={setMessagesGame} turn={turn}
                                        setSentMessage={setSentMessage} sentMessage={sentMessage}
                                        receivedMessage={receivedMessage} setReceivedMessage={setReceivedMessage}
                                        waitingReponse={waitingReponse} setWaitingReponse={setWaitingReponse}
                                        setIsGuessMode={setIsGuessMode} isGuessMode={isGuessMode}
                                        turnTimeLeft={turnTimeLeft} lobby={lobby} playerId={playerId}
                                        setTurn={setTurn}
                                    />
                                )}
                            </div>
                            <GameState
                                user={user} setError={setError} lobby={lobby} setLobby={setLobby}
                                gameState={gameState} setGameState={setGameState}
                                isGuessMode={isGuessMode} setIsGuessMode={setIsGuessMode} getGameState={getGameState}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

