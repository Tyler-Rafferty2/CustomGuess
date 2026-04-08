"use client";

import { useState, useContext, useEffect, useRef } from "react";
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

const fontLink = typeof document !== 'undefined' && (() => {
    if (!document.getElementById('gw-fonts')) {
        const l = document.createElement('link');
        l.id = 'gw-fonts';
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600&display=swap';
        document.head.appendChild(l);
    }
})();

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
        if (!document.getElementById('gw-fonts')) {
            const l = document.createElement('link');
            l.id = 'gw-fonts';
            l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600&display=swap';
            document.head.appendChild(l);
        }
    }, []);
    return null;
}

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
    const [isMinimized, setIsMinimized] = useState(false);
    const isMinimizedRef = useRef(isMinimized);
    const playerIdRef = useRef(playerId);
    const [isGuessMode, setIsGuessMode] = useState(false);
    const [lobbyStatus, setLobbyStatus] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [conflictLobbyId, setConflictLobbyId] = useState(null);
    const conflictLobbyIdRef = useRef(null);

    // Rematch state
    const [rematchModalOpen, setRematchModalOpen] = useState(false);
    const [rematchWaiting, setRematchWaiting] = useState(false);
    const [incomingRematch, setIncomingRematch] = useState(null); // { characterSetName }
    const [selectedRematchSet, setSelectedRematchSet] = useState(null);
    const [rematchPublicSets, setRematchPublicSets] = useState([]);
    const [rematchMySets, setRematchMySets] = useState([]);
    const [rematchSetView, setRematchSetView] = useState("public");
    const [rematchDeclinedToast, setRematchDeclinedToast] = useState(false);
    const [sentRematchSetName, setSentRematchSetName] = useState(null);

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
            await fetch(`http://localhost:8080/lobby/forfeit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ lobbyId: conflictLobbyId }),
            });
            clearConflict();
            if (lobby?.code && lobby?.id) {
                joinLobby(lobby.code, lobby.id);
            }
        } catch (err) {
            console.error("Forfeit error:", err);
            setError("Network error");
        }
    };

    const sendRematchRequest = async () => {
        if (!selectedRematchSet) return;
        try {
            await fetch(`http://localhost:8080/lobby/${lobbyID}/rematch`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ characterSetId: selectedRematchSet.id }),
            });
            setRematchModalOpen(false);
            setRematchWaiting(true);
            setSentRematchSetName(selectedRematchSet?.name ?? null);
        } catch (err) {
            console.error("Rematch request error:", err);
        }
    };

    const acceptRematch = async () => {
        try {
            await fetch(`http://localhost:8080/lobby/${lobbyID}/rematch/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            setIncomingRematch(null);
        } catch (err) {
            console.error("Accept rematch error:", err);
        }
    };

    const declineRematch = async () => {
        try {
            await fetch(`http://localhost:8080/lobby/${lobbyID}/rematch/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            setIncomingRematch(null);
        } catch (err) {
            console.error("Decline rematch error:", err);
        }
    };

    const cancelRematch = async () => {
        try {
            await fetch(`http://localhost:8080/lobby/${lobbyID}/rematch/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            setRematchWaiting(false);
            setSentRematchSetName(null);
        } catch (err) {
            console.error("Cancel rematch error:", err);
        }
    };

    const joinLobby = async (lobbyCode) => {
        setError(null);
        try {
            const res = await fetch(`http://localhost:8080/lobby/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                body: JSON.stringify({ code: lobbyCode }),
            });

            if (res.status === 409) {
                const data = await res.json();
                handleConflict(data.lobbyId);
                console.log("found conflict with lobby", data.lobbyId);
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
            const res = await fetch(`http://localhost:8080/lobby/${lobbyID}/status`, {
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
            const res = await fetch(`http://localhost:8080/lobby/${lobbyID}`, {
                method: "GET",
                headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            console.log("Fetched gamestate:", data);
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

        const connect = () => {
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

            const websocket = new WebSocket(
                `ws://localhost:8080/ws?username=${encodeURIComponent(username)}&lobbyId=${encodeURIComponent(lobbyID)}&playerId=${encodeURIComponent(playerId || '')}`
            );

            websocket.onopen = () => {
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
                console.log('Connected to WebSocket');
            };

            websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.channel === "game") {
                    setMessagesGame(prev => {
                        const isDuplicate = prev.some(m => m.content === message.content && m.username === message.username && m.time === message.time);
                        if (isDuplicate) return prev;
                        return [...prev, { ...message, time: message.time || new Date().toLocaleTimeString() }];
                    });
                    if (message.SenderId === playerId) {
                        setQuestionLog(prev => [...prev, { ...message, question: message.content, content: message.content, answer: null, time: message.time || new Date().toLocaleTimeString() }]);
                    } else {
                        setReceivedMessage(message.content);
                    }
                    if (message.lobbyTurn === playerId) { setTurn(true); } else { setTurn(false); }
                } else if (message.channel === "lobby_update") {
                    setLobby(message.lobby);
                } else if (message.channel === "rematch_request") {
                    if (message.SenderId !== playerIdRef.current) {
                        setIncomingRematch({ characterSetName: message.content });
                    }
                } else if (message.channel === "rematch_ready") {
                    router.push(`/lobby/${message.content}`);
                } else if (message.channel === "rematch_declined") {
                    if (message.SenderId !== playerIdRef.current) {
                        setRematchWaiting(false);
                        setRematchDeclinedToast(true);
                        setTimeout(() => setRematchDeclinedToast(false), 3000);
                    }
                } else if (message.channel === "response") {
                    if (message.lobbyTurn === playerId) { setTurn(true); } else { setTurn(false); }
                    if (message.SenderId != playerId) {
                        setQuestionLog(prev => {
                            if (prev.length === 0) return prev;
                            const updated = [...prev];
                            const lastIndex = updated.length - 1;
                            updated[lastIndex] = { ...updated[lastIndex], content: `${updated[lastIndex].content} - ${message.content}`, answer: message.content };
                            return updated;
                        });
                        setReceivedMessage("");
                        setWaitingReponse(false);
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

            websocket.onerror = (error) => { console.error('WebSocket error:', error); };

            websocket.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                if (!shouldReconnectRef.current) return;
                const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
                reconnectAttemptsRef.current++;
                console.log(`WebSocket closed. Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            wsRef.current = websocket;
        };

        connect();

        return () => {
            shouldReconnectRef.current = false;
            clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [lobbyID, username, playerId]);

    useEffect(() => {
        if (lobby?.players) { console.log(`Player count changed: ${lobby.players.length}`); }
    }, [lobby]);

    useEffect(() => { checkLobbyStatus(); }, [lobbyID]);

    useEffect(() => {
        if (!lobbyID || !playerId) return;
        fetch(`http://localhost:8080/lobby/${lobbyID}/messages`)
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
            .catch(() => {});
    }, [lobbyID, playerId]);


    useEffect(() => {
        if (
            lobby &&
            lobby.players?.length < 2 &&
            !lobby.players.some(player => player.userId === user?.id) &&
            lobby.code &&
            lobby.id &&
            !conflictLobbyIdRef.current  // use ref — synchronous check
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

    // Fetch character sets for rematch when game ends
    useEffect(() => {
        if (!lobby?.gameOver) return;
        fetch("http://localhost:8080/player/set/public")
            .then(r => r.json())
            .then(data => setRematchPublicSets(Array.isArray(data) ? data : []))
            .catch(() => {});
        if (user && !user.isGuest) {
            fetch("http://localhost:8080/player/set/player", {
                headers: { "X-User-ID": user.id }
            })
                .then(r => r.json())
                .then(data => setRematchMySets(Array.isArray(data) ? data : []))
                .catch(() => {});
        }
    }, [lobby?.gameOver]);

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
                    <div className="conflict-modal__title">You're already in a game</div>
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
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
                            <div style={{ width: 48, height: 4, background: isWinner ? 'var(--state-live)' : 'var(--state-out)', borderRadius: 2, margin: '0 auto var(--s5)' }} />
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 42, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s2)', lineHeight: 1 }}>
                                {isWinner ? "Victory!" : "Defeat"}
                            </h1>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14 }}>
                                {isWinner ? "You guessed your opponent's character." : "Your opponent guessed your character."}
                            </p>
                        </div>

                        {/* Character Reveal */}
                        <div className="gw-card" style={{ padding: 'var(--s6)', marginBottom: 'var(--s4)' }}>
                            <span className="gw-label" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--s5)' }}>Character Reveal</span>
                            <div style={{ display: 'flex', gap: 'var(--s6)', justifyContent: 'center' }}>
                                {/* Your character */}
                                <div style={{ flex: 1, textAlign: 'center', maxWidth: 200 }}>
                                    <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)', color: 'var(--accent)' }}>You</span>
                                    {myChar ? (
                                        <>
                                            <img
                                                src={`http://localhost:8080` + myChar.image}
                                                alt={myChar.name}
                                                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--r)', border: '2px solid var(--border)' }}
                                            />
                                            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: 'var(--text-900)', marginTop: 'var(--s2)' }}>
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
                                    <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)', color: 'var(--text-600)' }}>Opponent</span>
                                    {opponentChar ? (
                                        <motion.div
                                            initial={{ rotateY: 90, opacity: 0 }}
                                            animate={{ rotateY: 0, opacity: 1 }}
                                            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                                            style={{ transformStyle: 'preserve-3d' }}
                                        >
                                            <img
                                                src={`http://localhost:8080` + opponentChar.image}
                                                alt={opponentChar.name}
                                                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--r)', border: `2px solid ${isWinner ? 'var(--state-live)' : 'var(--state-out)'}` }}
                                            />
                                            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: 'var(--text-900)', marginTop: 'var(--s2)' }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s6)' }}>
                            <div className="gw-card" style={{ padding: 'var(--s4)', textAlign: 'center' }}>
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: 'var(--text-900)', margin: 0, letterSpacing: '-0.02em' }}>
                                    {questionLog.length}
                                </p>
                                <span className="gw-label" style={{ marginTop: 'var(--s1)', display: 'block' }}>Questions Asked</span>
                            </div>
                            <div className="gw-card" style={{ padding: 'var(--s4)', textAlign: 'center' }}>
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: 'var(--text-900)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    {timePlayed ?? '—'}
                                </p>
                                <span className="gw-label" style={{ marginTop: 'var(--s1)', display: 'block' }}>Time Played</span>
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
                                <button className="gw-btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setRematchModalOpen(true)}>
                                    Rematch
                                </button>
                            )}
                            <button className="gw-btn-primary" style={{ flex: 1, height: 44 }} onClick={() => router.push('/')}>
                                Back to Home
                            </button>
                        </div>

                        {/* Rematch set picker modal */}
                        {rematchModalOpen && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                                <div className="gw-card" style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 'var(--s6)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)' }}>
                                        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: 'var(--text-900)', margin: 0 }}>Choose Character Set</h2>
                                        <button onClick={() => setRematchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-400)', fontSize: 20, lineHeight: 1, padding: 'var(--s1)' }}>✕</button>
                                    </div>
                                    {/* Tabs */}
                                    <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s4)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
                                        {['public', 'mine'].map(tab => (
                                            <button key={tab} onClick={() => setRematchSetView(tab)} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, padding: 'var(--s1) var(--s3)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', background: rematchSetView === tab ? 'var(--accent)' : 'transparent', color: rematchSetView === tab ? '#fff' : 'var(--text-600)' }}>
                                                {tab === 'public' ? 'Public' : 'My Sets'}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Set grid */}
                                    <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
                                        {(rematchSetView === 'public' ? rematchPublicSets : rematchMySets).map(set => (
                                            <div key={set.id} onClick={() => setSelectedRematchSet(set)} style={{ background: 'var(--surface-0)', border: `2px solid ${selectedRematchSet?.id === set.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: 'var(--s3)', cursor: 'pointer', transition: 'border-color 150ms' }}>
                                                <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 80, borderRadius: 4, marginBottom: 'var(--s2)' }} />
                                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 13, color: 'var(--text-900)', margin: 0 }}>{set.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="gw-btn-primary" style={{ marginTop: 'var(--s5)', height: 44 }} disabled={!selectedRematchSet} onClick={sendRematchRequest}>
                                        Send Rematch Request
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Incoming rematch modal */}
                        {incomingRematch && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,16,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                                <div className="gw-card" style={{ width: '100%', maxWidth: 380, padding: 'var(--s8)', textAlign: 'center' }}>
                                    <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: 'var(--text-900)', marginBottom: 'var(--s3)' }}>Rematch?</h2>
                                    <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s6)' }}>
                                        Your opponent wants a rematch with <strong>{incomingRematch.characterSetName}</strong>.
                                    </p>
                                    <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                                        <button className="gw-btn-ghost" style={{ flex: 1, height: 44 }} onClick={declineRematch}>Decline</button>
                                        <button className="gw-btn-primary" style={{ flex: 1, height: 44 }} onClick={acceptRematch}>Accept</button>
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
                        <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14, marginBottom: 'var(--s8)' }}>This lobby doesn't exist or has expired.</p>
                        <button className="gw-btn-primary" style={{ height: 44, padding: '0 var(--s8)' }} onClick={() => router.push('/')}>Create New Game</button>
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
                                    await fetch(`http://localhost:8080/lobby/forfeit`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                                        body: JSON.stringify({ lobbyId: lobbyID }),
                                    });
                                } catch (err) {
                                    console.error(err);
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

    /* ── CHARACTER SELECTION ── */
    if (gameState?.secretCharacter === undefined) {
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

        const selectSecretCharacter = async (charid) => {
            setError(null);
            try {
                const res = await fetch(`http://localhost:8080/lobby/setSecretChar`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                    body: JSON.stringify({ lobbyCode: lobby?.id, secretCharacter: charid }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || "Something went wrong"); return; }
                setGameState(data);
            } catch (err) {
                console.error(err);
                setError("Network error");
            }
        };

        const characters = gameState?.lobby.lobbyCharacters || [];
        return (
            <>
                <StyleInjector />
                {conflictModal}
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
                        <Grid container spacing={2} justifyContent="center">
                            {characters.map((char) => (
                                <Grid item xs={6} sm={4} md={3} lg={2} key={char.id}>
                                    <Item onClick={() => selectSecretCharacter(char.id)} className="h-full">
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <img src={`http://localhost:8080` + char.image} alt={char.name} style={{ imageRendering: 'auto' }} />
                                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, color: 'var(--text-600)', marginTop: 8 }}>
                                                {char.name}
                                            </span>
                                        </div>
                                    </Item>
                                </Grid>
                            ))}
                        </Grid>
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

        const setReady = async () => {
            try {
                await fetch(`http://localhost:8080/lobby/ready`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-User-ID": user?.id },
                    body: JSON.stringify({ lobbyId: lobbyID }),
                });
            } catch (err) {
                console.error("Ready error:", err);
            }
        };

        return (
            <>
                <StyleInjector />
                {conflictModal}
                <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s6)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                        style={{ maxWidth: 480, width: '100%' }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Ready Up</span>
                            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 36, color: 'var(--text-900)', letterSpacing: '-0.03em', marginBottom: 'var(--s2)' }}>
                                Your secret character
                            </h1>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-600)', fontSize: 14 }}>
                                Remember this face. Your opponent will try to guess who you are.
                            </p>
                        </div>

                        {/* Secret character preview */}
                        {gameState?.secretCharacter && (
                            <div className="gw-card" style={{ padding: 'var(--s6)', marginBottom: 'var(--s4)', textAlign: 'center' }}>
                                <motion.img
                                    initial={{ scale: 0.92, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                                    src={`http://localhost:8080` + gameState.secretCharacter.image}
                                    alt={gameState.secretCharacter.name}
                                    style={{ width: 160, height: 200, objectFit: 'cover', borderRadius: 'var(--r)', border: '2px solid var(--accent-light)', display: 'block', margin: '0 auto var(--s3)' }}
                                />
                                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: 'var(--text-900)', margin: 0 }}>
                                    {gameState.secretCharacter.name}
                                </p>
                            </div>
                        )}

                        {/* Player ready status */}
                        <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                            <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s1)' }}>Players</span>
                            {[{ label: 'You', player: me }, { label: 'Opponent', player: opponent }].map(({ label, player }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s3) var(--s4)', background: 'var(--surface-1)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
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

                        <button
                            className="gw-btn-primary"
                            style={{ width: '100%', height: 44, justifyContent: 'center', opacity: iAmReady ? 0.38 : 1, cursor: iAmReady ? 'not-allowed' : 'pointer' }}
                            onClick={setReady}
                            disabled={iAmReady}
                        >
                            {iAmReady ? 'Waiting for opponent…' : 'Ready Up'}
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
            {!isConnected && (
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
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: 'var(--bg)' }}>
                {lobby.chatFeature && (
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
                                <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Your Character</span>
                                <img
                                    src={`http://localhost:8080` + gameState.secretCharacter.image}
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

                <div style={{ flex: 1, padding: 'var(--s6)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {!lobby.chatFeature && (
                        <div style={{ display: 'flex', gap: 'var(--s6)', width: '100%', marginBottom: 'var(--s6)', alignItems: 'flex-start' }}>
                            <div style={{ width: 200, flexShrink: 0 }}>
                                {gameState && gameState.secretCharacter && (
                                    <div className="gw-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s3)' }}>
                                        <span className="gw-label" style={{ display: 'block', marginBottom: 'var(--s3)' }}>Your Character</span>
                                        <img
                                            src={`http://localhost:8080` + gameState.secretCharacter.image}
                                            alt={gameState.secretCharacter.name}
                                            style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'calc(var(--r) - 2px)', imageRendering: 'auto' }}
                                        />
                                        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: 'var(--text-900)', marginTop: 'var(--s2)', textAlign: 'center' }}>
                                            {gameState.secretCharacter.name}
                                        </p>
                                    </div>
                                )}
                                <button
                                    className={isGuessMode ? 'gw-btn-danger' : 'gw-btn-primary'}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={() => setIsGuessMode(!isGuessMode)}
                                >
                                    {isGuessMode ? 'Stop Guessing' : 'Make a Guess'}
                                </button>
                            </div>
                            <div style={{ flex: 1 }}>
                                <GameState
                                    user={user} setError={setError} lobby={lobby} setLobby={setLobby}
                                    gameState={gameState} setGameState={setGameState}
                                    isGuessMode={isGuessMode} getGameState={getGameState}
                                />
                            </div>
                        </div>
                    )}

                    {lobby.chatFeature && (
                        <>
                            <div style={{ marginBottom: 'var(--s4)' }}>
                                {user && user.email && lobbyID && (
                                    <GameSend
                                        lobbyId={lobbyID} username={user.email} wsRef={wsRef}
                                        setIsConnected={setIsConnected} messages={messagesGame}
                                        setMessages={setMessagesGame} turn={turn}
                                        setSentMessage={setSentMessage} receivedMessage={receivedMessage}
                                        waitingReponse={waitingReponse} setWaitingReponse={setWaitingReponse}
                                        setIsGuessMode={setIsGuessMode} isGuessMode={isGuessMode}
                                    />
                                )}
                            </div>
                            <GameState
                                user={user} setError={setError} lobby={lobby} setLobby={setLobby}
                                gameState={gameState} setGameState={setGameState}
                                isGuessMode={isGuessMode} getGameState={getGameState}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}