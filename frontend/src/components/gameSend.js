import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';

export default function GameSend({ lobbyId, username, wsRef, setIsConnected, messages, setMessages, turn, setSentMessage, receivedMessage, waitingReponse, setWaitingReponse }) {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);


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

    //console.log(messages)

    return (
        <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
            {turn ? (
                // When it's your turn - show input
                <div className="flex gap-2">
                    {!waitingReponse ? (
                        <>
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
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">Waiting for opponent's response...</p>
                    )}
                </div>
            ) : (
                // When it's NOT your turn - show received message with Yes/No buttons
                <div className="px-3 py-2 bg-gray-50 rounded-lg">
                    {receivedMessage !== "" ? (
                        <div>
                            <p className="text-sm text-gray-700 mb-3">
                                {receivedMessage}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResponse('yes')}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleResponse('no')}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No messages yet...</p>
                    )}
                </div>
            )}
        </div>
    );
}