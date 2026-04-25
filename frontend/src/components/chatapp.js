import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';

export default function ChatApp({ lobbyId, username, wsRef, setIsConnected, messages, setMessages, isMinimizedRef, isMinimized, setIsMinimized }) {
    const [inputMessage, setInputMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        isMinimizedRef.current = isMinimized;
    }, [isMinimized]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isMinimized) {
            const newMessages = messages.filter(m => !m.read);
            setUnreadCount(newMessages.length);
        } else {
            setUnreadCount(0);
            if (messages.some(m => !m.read)) {
                setMessages(prev => prev.map(m => ({ ...m, read: true })));
            }
        }
    }, [isMinimized]);

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
            lobbyId: lobbyId,
            channel: "normal",
            swap: "no"
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

    if (isMinimized) {
        return (
            <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50 }}>
                <button
                    onClick={() => setIsMinimized(false)}
                    style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: 'var(--r)',
                        padding: 16,
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MessageCircle size={24} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            background: 'var(--state-out, #C0392B)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 'var(--r)',
                            minWidth: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            fontFamily: "'DM Sans', sans-serif",
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 50,
            width: 360,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-0)',
            borderRadius: 'var(--r)',
            border: '1px solid var(--border)',
            fontFamily: "'DM Sans', sans-serif",
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageCircle size={18} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Chat Room</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{username}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                        onClick={() => setIsMinimized(true)}
                        title="Minimize"
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, borderRadius: 'var(--r)', display: 'flex' }}
                    >
                        <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={disconnect}
                        title="Disconnect"
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, borderRadius: 'var(--r)', display: 'flex' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--surface-1, #EDE8E2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map((msg, idx) => (
                        <div key={idx}>
                            {msg.type === 'join' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        fontSize: 11,
                                        color: 'var(--text-400)',
                                        background: 'var(--surface-0)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--r)',
                                        border: '1px solid var(--border)',
                                    }}>
                                        {msg.username} {msg.content}
                                    </span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: msg.username === username ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ maxWidth: '75%' }}>
                                        {msg.username !== username && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-900)' }}>{msg.username}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-400)' }}>{msg.time}</span>
                                            </div>
                                        )}
                                        <div style={{
                                            padding: '6px 10px',
                                            borderRadius: 'var(--r)',
                                            fontSize: 13,
                                            background: msg.username === username ? 'var(--accent)' : 'var(--surface-0)',
                                            color: msg.username === username ? '#fff' : 'var(--text-900)',
                                            border: msg.username === username ? 'none' : '1px solid var(--border)',
                                        }}>
                                            {msg.content}
                                        </div>
                                        {msg.username === username && (
                                            <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 2, textAlign: 'right' }}>{msg.time}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div style={{
                padding: 10,
                background: 'var(--surface-0)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
                flexShrink: 0,
            }}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r)',
                        outline: 'none',
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        background: 'var(--surface-0)',
                        color: 'var(--text-900)',
                    }}
                />
                <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                    style={{
                        padding: '6px 12px',
                        background: inputMessage.trim() ? 'var(--accent)' : 'var(--border)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--r)',
                        cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'background 150ms ease',
                    }}
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
