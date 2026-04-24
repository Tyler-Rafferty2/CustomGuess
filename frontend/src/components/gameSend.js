import { useState } from 'react';
import { Send } from 'lucide-react';

export default function GameSend({
    lobbyId, username, wsRef, setIsConnected,
    messages, setMessages, turn, setSentMessage, sentMessage,
    receivedMessage, setReceivedMessage, waitingReponse, setWaitingReponse,
    setIsGuessMode, isGuessMode,
    turnTimeLeft, lobby, playerId, setTurn,
}) {
    const [inputMessage, setInputMessage] = useState('');
    const [pressedBtn, setPressedBtn] = useState(null);

    const sendMessage = () => {
        if (!inputMessage.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({
            type: 'message',
            content: inputMessage,
            time: new Date().toLocaleTimeString(),
            lobbyId,
            channel: 'game',
            swap: 'no',
        }));
        setSentMessage(inputMessage);
        setWaitingReponse(true);
        setIsGuessMode(false);
        setInputMessage('');
    };

    const handleResponse = (ans) => {
        try {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: ans,
                time: new Date().toLocaleTimeString(),
                lobbyId,
                channel: 'response',
                swap: 'yes',
            }));
            setTimeout(() => {
                setReceivedMessage('');
                setTurn(true);
                setInputMessage('');
            }, 50);
        } catch {
            // Send failed (connection dropped) — revert so the question stays visible
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Timer calculations
    const hasTimer = turnTimeLeft !== null && lobby?.turnTimerSeconds > 0 && !lobby?.gameOver;
    const totalMs = (lobby?.turnTimerSeconds || 1) * 1000;
    const pct = hasTimer ? Math.max(0, Math.min(1, turnTimeLeft / totalMs)) : 1;
    const secs = hasTimer ? Math.ceil(turnTimeLeft / 1000) : 0;
    const isLow = hasTimer && secs <= 10;

    // Pause/resume state
    const isPaused = lobby?.turnTimerPaused;
    const pauseRequestedByMe = lobby?.pauseRequestedBy && lobby.pauseRequestedBy === playerId;
    const pauseRequestedByOpponent = lobby?.pauseRequestedBy && lobby.pauseRequestedBy !== playerId;
    const resumeRequestedByMe = lobby?.resumeRequestedBy && lobby.resumeRequestedBy === playerId;
    const resumeRequestedByOpponent = lobby?.resumeRequestedBy && lobby.resumeRequestedBy !== playerId;

    const sendWs = (payload) => wsRef.current?.send(JSON.stringify(payload));

    // User needs to take action: ask a question or answer one
    const needsAction = (turn && !waitingReponse) || (!turn && receivedMessage !== '');

    /* ── style primitives ── */
    const panel = {
        background: needsAction ? '#FEF5F2' : 'var(--surface-0)',
        border: needsAction ? '1px solid var(--accent-light)' : '1px solid var(--border)',
        borderLeft: needsAction ? '3px solid var(--accent)' : '3px solid var(--border-strong)',
        borderRadius: 'var(--r)',
        padding: 'var(--s4)',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 200ms, border-color 200ms',
    };

    const turnLabel = {
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: needsAction ? 'var(--accent)' : 'var(--text-400)',
    };

    const inputStyle = {
        flex: 1,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        color: 'var(--text-900)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '0 var(--s4)',
        height: 44,
        outline: 'none',
        transition: 'border-color 150ms',
    };

    const btnBase = {
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        height: 44,
        borderRadius: 'var(--r)',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--s2)',
        padding: '0 var(--s4)',
        transition: 'background 150ms, opacity 150ms',
    };

    const metaText = {
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: 'var(--text-400)',
        margin: 0,
    };

    const smallBtn = {
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 12,
        borderRadius: 'var(--r)',
        padding: '3px 10px',
        cursor: 'pointer',
        flexShrink: 0,
    };

    /* ── pause control inline button ── */
    let pauseControl = null;
    if (hasTimer) {
        if (isPaused) {
            if (resumeRequestedByOpponent) {
                pauseControl = (
                    <button
                        onClick={() => sendWs({ channel: 'resume_accept' })}
                        style={{ ...smallBtn, color: 'var(--state-live)', background: '#EAF6EF', border: '1px solid #2A7A5640' }}
                    >
                        Accept Resume
                    </button>
                );
            } else if (resumeRequestedByMe) {
                pauseControl = (
                    <span style={{ ...metaText, fontSize: 11 }}>Resume requested…</span>
                );
            } else {
                pauseControl = (
                    <button
                        onClick={() => sendWs({ channel: 'resume_request' })}
                        style={{ ...smallBtn, color: 'var(--state-live)', background: '#EAF6EF', border: '1px solid #2A7A5640' }}
                    >
                        Resume
                    </button>
                );
            }
        } else if (pauseRequestedByOpponent) {
            pauseControl = (
                <button
                    onClick={() => sendWs({ channel: 'pause_accept' })}
                    style={{ ...smallBtn, color: 'var(--accent)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                >
                    Accept Pause
                </button>
            );
        } else if (pauseRequestedByMe) {
            pauseControl = (
                <span style={{ ...metaText, fontSize: 11 }}>Pause requested…</span>
            );
        } else {
            pauseControl = (
                <button
                    onClick={() => sendWs({ channel: 'pause_request' })}
                    style={{ ...smallBtn, color: 'var(--text-600)', background: 'transparent', border: '1px solid var(--border)' }}
                >
                    Pause
                </button>
            );
        }
    }

    /* ── body content (state-specific, fixed-height container) ── */
    let body;

    if (turn && !waitingReponse) {
        body = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        placeholder="Does your character have glasses?"
                        style={inputStyle}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        style={{
                            ...btnBase,
                            background: inputMessage.trim() ? 'var(--accent)' : 'var(--surface-2)',
                            color: inputMessage.trim() ? '#fff' : 'var(--text-400)',
                            cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                            width: 44,
                            padding: 0,
                        }}
                    >
                        <Send size={15} />
                    </button>
                </div>
                <button
                    onClick={() => setIsGuessMode(!isGuessMode)}
                    style={{
                        ...btnBase,
                        alignSelf: 'flex-start',
                        background: isGuessMode ? 'var(--surface-2)' : 'var(--surface-1)',
                        color: 'var(--text-600)',
                        border: isGuessMode ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                    }}
                >
                    {isGuessMode ? 'Stop Guessing' : 'Make a Guess'}
                </button>
            </div>
        );
    } else if (turn && waitingReponse) {
        body = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
                    <p style={metaText}>Waiting for opponent&apos;s response…</p>
                </div>
                {/* Placeholder to maintain height */}
                <div style={{ height: 44 }} />
            </div>
        );
    } else if (!turn && receivedMessage !== '') {
        body = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: 'var(--text-900)',
                    margin: 0,
                    lineHeight: 1.5,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                }}>
                    {receivedMessage}
                </p>
                <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                    <button
                        onClick={() => handleResponse('yes')}
                        onPointerDown={() => setPressedBtn('yes')}
                        onPointerUp={() => setPressedBtn(null)}
                        onPointerLeave={() => setPressedBtn(null)}
                        style={{
                            ...btnBase,
                            flex: 1,
                            background: pressedBtn === 'yes' ? '#1e6644' : 'var(--state-live)',
                            color: '#fff',
                            transform: pressedBtn === 'yes' ? 'scale(0.96)' : 'scale(1)',
                            boxShadow: pressedBtn === 'yes' ? 'inset 0 2px 6px rgba(0,0,0,0.25)' : 'none',
                            transition: 'background 80ms, transform 80ms, box-shadow 80ms',
                        }}
                    >
                        Yes
                    </button>
                    <button
                        onClick={() => handleResponse('no')}
                        onPointerDown={() => setPressedBtn('no')}
                        onPointerUp={() => setPressedBtn(null)}
                        onPointerLeave={() => setPressedBtn(null)}
                        style={{
                            ...btnBase,
                            flex: 1,
                            background: pressedBtn === 'no' ? '#922b21' : 'var(--state-out)',
                            color: '#fff',
                            transform: pressedBtn === 'no' ? 'scale(0.96)' : 'scale(1)',
                            boxShadow: pressedBtn === 'no' ? 'inset 0 2px 6px rgba(0,0,0,0.25)' : 'none',
                            transition: 'background 80ms, transform 80ms, box-shadow 80ms',
                        }}
                    >
                        No
                    </button>
                </div>
            </div>
        );
    } else {
        // opponent's turn, no question yet
        body = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
                    <p style={metaText}>Waiting for opponent to ask…</p>
                </div>
                <div style={{ height: 40 }} />
            </div>
        );
    }

    return (
        <div style={panel}>
            {/* ── Header: turn label + timer controls ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasTimer ? 'var(--s2)' : 'var(--s3)' }}>
                <span style={turnLabel}>
                    {turn && !waitingReponse && isGuessMode ? 'Your Turn — Selecting a Guess'
                        : turn && !waitingReponse ? 'Your Turn — Ask a Question'
                            : turn && waitingReponse ? 'Your Turn — Waiting for Response'
                                : !turn && receivedMessage !== '' ? 'Your Turn — Answer the Question'
                                    : "Opponent's Turn"}
                </span>
                {hasTimer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        {pauseControl}
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 700,
                            fontSize: 13,
                            color: isPaused ? 'var(--text-400)' : isLow ? 'var(--state-out)' : 'var(--text-600)',
                            minWidth: 32,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {isPaused ? '—' : `${secs}s`}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Timer bar ── */}
            {hasTimer && (
                <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, marginBottom: 'var(--s3)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: isPaused ? `${pct * 100}%` : `${pct * 100}%`,
                        background: isPaused || !needsAction ? 'var(--border-strong)' : isLow ? 'var(--state-out)' : 'var(--accent)',
                        borderRadius: 2,
                        transition: isPaused ? 'none' : 'width 0.25s linear, background 0.3s',
                    }} />
                </div>
            )}

            {/* ── Body ── */}
            {body}
        </div>
    );
}
