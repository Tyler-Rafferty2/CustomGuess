import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';

export default function GameSend({ lobbyId, username, wsRef, setIsConnected, messages, setMessages, turn, setSentMessage, receivedMessage, waitingReponse, setWaitingReponse, setIsGuessMode, isGuessMode }) {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    // ... (Your existing functions: disconnect, sendMessage, handleResponse, handleKeyPress) ...
    // (No changes to the logic)

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
            channel: "game",
            swap: "no"
        };

        setSentMessage(inputMessage);
        setWaitingReponse(true);

        wsRef.current.send(JSON.stringify(message));
        setInputMessage('');
    };

    const handleResponse = (ans) => {

        const message = {
            type: 'message',
            content: ans,
            time: new Date().toLocaleTimeString(),
            lobbyId: lobbyId,
            channel: "response",
            swap: "yes"
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

    return (
        // Use a dark, semi-transparent background consistent with LobbyPage
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            {turn ? (
                // When it's your turn
                <div className="flex flex-col gap-3"> {/* Increased gap for better spacing */}
                    {!waitingReponse ? (
                        <>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your question..."
                                    // Style matching the input in LobbyPage's "Waiting" screen
                                    className="flex-1 px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!inputMessage.trim()}
                                    // Style matching the "Copy Link" button in LobbyPage
                                    className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setIsGuessMode(!isGuessMode)}
                                // Use emerald for "positive" action and red for "negative/cancel"
                                className={`w-full sm:w-1/3 px-4 py-2 rounded-xl font-bold transition-colors ${isGuessMode
                                        ? 'bg-red-600 hover:bg-red-500 text-white'     // Stop Making Guess
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-white' // Make a Guess
                                    }`}
                            >
                                {isGuessMode ? 'Stop Guessing' : 'Make a Guess'}
                            </button>
                        </>
                    ) : (
                        // Use the theme's secondary text color
                        <p className="text-sm text-gray-400">Waiting for opponent's response...</p>
                    )}
                </div>
            ) : (
                // When it's NOT your turn
                // Use a nested dark card, similar to the Question Log items
                <div className="p-3 bg-slate-700/50 rounded-lg">
                    {receivedMessage !== "" ? (
                        <div>
                            <p className="text-md text-white mb-3 font-medium">
                                {receivedMessage}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleResponse('yes')}
                                    // Use emerald for "Yes"
                                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors text-sm font-bold"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleResponse('no')}
                                    // Use red for "No"
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors text-sm font-bold"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Use the theme's secondary text color
                        <p className="text-sm text-gray-400">Waiting for opponent to ask...</p>
                    )}
                </div>
            )}
        </div>
    );
}