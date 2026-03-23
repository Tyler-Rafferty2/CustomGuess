import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

export default function GameSend({
    lobbyId, username, wsRef, setIsConnected,
    messages, setMessages, turn, setSentMessage,
    receivedMessage, waitingReponse, setWaitingReponse,
    setIsGuessMode, isGuessMode
}) {
    const [inputMessage, setInputMessage] = useState('');

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            setMessages([]);
            setIsConnected(false);
        }
    };

    const sendMessage = () => {
        if (!inputMessage.trim() || !wsRef.current) return;
        const message = {
            type: 'message',
            content: inputMessage,
            time: new Date().toLocaleTimeString(),
            lobbyId,
            channel: 'game',
            swap: 'no',
        };
        setSentMessage(inputMessage);
        setWaitingReponse(true);
        setIsGuessMode(false);
        wsRef.current.send(JSON.stringify(message));
        setInputMessage('');
    };

    const handleResponse = (ans) => {
        const message = {
            type: 'message',
            content: ans,
            time: new Date().toLocaleTimeString(),
            lobbyId,
            channel: 'response',
            swap: 'yes',
        };
        wsRef.current.send(JSON.stringify(message));
        setInputMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    /* ── shared style primitives ── */
    const panel = {
        background: 'var(--surface-0)',
        border: '1px solid var(--border)',
        borderLeft: turn ? '3px solid var(--accent)' : '3px solid var(--border-strong)',
        borderRadius: 'var(--r)',
        padding: 'var(--s4)',
        fontFamily: "'DM Sans', sans-serif",
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
        height: 40,
        outline: 'none',
        transition: 'border-color 150ms',
    };

    const btnBase = {
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        height: 40,
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
    };

    console.log("GameSend props:", { turn, waitingReponse, inputMessage });

    /* ── YOUR TURN ── */
    if (turn) {
        return (
            <div style={panel}>
                <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    display: 'block',
                    marginBottom: 'var(--s3)',
                }}>
                    Your Turn — Ask a Question
                </span>

                {!waitingReponse ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                        {/* Input row */}
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
                                    width: 40,
                                    padding: 0,
                                }}
                                onMouseEnter={e => { if (inputMessage.trim()) e.currentTarget.style.background = 'var(--accent-dim)'; }}
                                onMouseLeave={e => { if (inputMessage.trim()) e.currentTarget.style.background = 'var(--accent)'; }}
                            >
                                <Send size={15} />
                            </button>
                        </div>

                        {/* Guess toggle */}
                        <button
                            onClick={() => setIsGuessMode(!isGuessMode)}
                            style={{
                                ...btnBase,
                                alignSelf: 'flex-start',
                                background: isGuessMode ? 'transparent' : 'var(--surface-1)',
                                color: isGuessMode ? 'var(--state-out)' : 'var(--text-600)',
                                border: isGuessMode ? '1px solid var(--accent-light)' : '1px solid var(--border)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = isGuessMode ? 'var(--state-out)' : 'var(--border-strong)';
                                e.currentTarget.style.background = isGuessMode ? '#fef2ef' : 'var(--surface-2)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = isGuessMode ? 'var(--accent-light)' : 'var(--border)';
                                e.currentTarget.style.background = isGuessMode ? 'transparent' : 'var(--surface-1)';
                            }}
                        >
                            {isGuessMode ? 'Stop Guessing' : 'Make a Guess'}
                        </button>
                    </div>
                ) : (
                    <p style={metaText}>Waiting for opponent's response…</p>
                )}
            </div>
        );
    }

    /* ── OPPONENT'S TURN ── */
    return (
        <div style={panel}>
            <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-400)',
                display: 'block',
                marginBottom: 'var(--s3)',
            }}>
                Opponent's Turn
            </span>

            {receivedMessage !== '' ? (
                <div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: 'var(--text-900)',
                        marginBottom: 'var(--s4)',
                        lineHeight: 1.5,
                    }}>
                        {receivedMessage}
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <button
                            onClick={() => handleResponse('yes')}
                            style={{ ...btnBase, flex: 1, background: 'var(--state-live)', color: '#fff' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => handleResponse('no')}
                            style={{ ...btnBase, flex: 1, background: 'var(--state-out)', color: '#fff' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            No
                        </button>
                    </div>
                </div>
            ) : (
                <p style={metaText}>Waiting for opponent to ask…</p>
            )}
        </div>
    );
}