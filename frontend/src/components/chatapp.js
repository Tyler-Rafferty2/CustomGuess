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
            // Only mark as read if there are unread messages
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
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-all relative"
                >
                    <MessageCircle className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200">
            <div className="bg-indigo-600 text-white p-3 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    <div>
                        <h2 className="font-semibold text-sm">Chat Room</h2>
                        <p className="text-xs text-indigo-200">{username}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1 hover:bg-indigo-700 rounded transition-colors"
                        title="Minimize"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={disconnect}
                        className="p-1 hover:bg-indigo-700 rounded transition-colors"
                        title="Disconnect"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                <div className="space-y-2">
                    {messages.map((msg, idx) => (
                        <div key={idx}>
                            {msg.type === 'join' ? (
                                <div className="text-center">
                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                        {msg.username} {msg.content}
                                    </span>
                                </div>
                            ) : (
                                <div className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%]`}>
                                        {msg.username !== username && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className="text-xs font-semibold text-gray-700">{msg.username}</span>
                                                <span className="text-xs text-gray-400">{msg.time}</span>
                                            </div>
                                        )}
                                        <div className={`px-3 py-2 rounded-lg text-sm ${msg.username === username
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        {msg.username === username && (
                                            <div className="text-xs text-gray-400 mt-1 text-right">{msg.time}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}