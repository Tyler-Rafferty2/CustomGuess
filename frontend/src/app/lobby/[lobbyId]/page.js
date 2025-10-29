"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import GameState from "./GameState";
import ChatApp from '@/components/chatapp';
import GameSend from '@/components/gameSend';


export default function LobbyPage() {

    const { user } = useContext(UserContext);
    const [error, setError] = useState(null);
    const [lobby, setLobby] = useState(null);
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
    const [isMinimized, setIsMinimized] = useState(false);
    const isMinimizedRef = useRef(isMinimized);

    const params = useParams();
    const lobbyID = params.lobbyId;
    let username = user ? user.email : null;


    console.log(playerId, lobby ? lobby.lobby.turn : null)
    useEffect(() => {
        if (lobby && user) {
            const id = lobby.lobby.players.find(p => p.userId === user.id)?.id;
            setPlayerId(id);
        }
    }, [lobby, user]);

    useEffect(() => {
        if (lobby && playerId != null) {
            setTurn(playerId === lobby.lobby.turn);
        }
    }, [lobby, playerId]);

    if (lobby && lobby.lobby.players.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold">Waiting for players to join...</h1>
            </div>
        );
    }




    useEffect(() => {
        if (!lobbyID || !username) return;

        // Prevent duplicate connections
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        console.log('Creating new WebSocket connection', { username, lobbyID, playerId });
        const websocket = new WebSocket(
            `ws://localhost:8080/ws?username=${encodeURIComponent(username)}&lobbyId=${encodeURIComponent(lobbyID)}&playerId=${encodeURIComponent(playerId || '')}`
        );

        websocket.onopen = () => {
            setIsConnected(true);
            console.log('Connected to chat server');
        };

        websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.channel === "game") {
                console.log("adding game message");

                // Add to messagesGame for display
                setMessagesGame(prev => {
                    const isDuplicate = prev.some(m =>
                        m.content === message.content &&
                        m.username === message.username &&
                        m.time === message.time
                    );

                    if (isDuplicate) {
                        console.log('Duplicate message detected, skipping');
                        return prev;
                    }

                    return [...prev, {
                        ...message,
                        time: message.time || new Date().toLocaleTimeString(),
                    }];
                });

                // ALSO add to question log immediately (without answer yet)
                if (message.username === username) {
                    setQuestionLog(prev => [...prev, {
                        ...message,
                        content: message.content,  // Just the question for now
                        answer: null,  // No answer yet
                        time: message.time || new Date().toLocaleTimeString(),
                    }]);
                } else {
                    setReceivedMessage(message.content);
                }

                if (message.lobbyTurn === playerId) {
                    setTurn(true);
                } else {
                    setTurn(false);
                }
            }
            else if (message.channel === "response") {
                console.log("thi plac", message.username, username);
                if (message.lobbyTurn === playerId) {
                    setTurn(true);
                } else {
                    setTurn(false);
                }
                if (message.username === username) {
                    return;
                }

                console.log("Handling response message");

                // Update the LAST question in the log with the answer
                setQuestionLog(prev => {
                    if (prev.length === 0) return prev;

                    const updated = [...prev];
                    const lastIndex = updated.length - 1;

                    // Append the answer to the last question
                    updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: `${updated[lastIndex].content} - ${message.content}`,
                        answer: message.content
                    };

                    return updated;
                });
                console.log("after setQuestionLog");
                console.log("message.lobbyTurn:", message.lobbyTurn, "playerId:", playerId);
                setReceivedMessage("");
                setWaitingReponse(false);
            }
            else {
                // Chat messages
                setMessagesChat(prev => {
                    const isDuplicate = prev.some(m =>
                        m.content === message.content &&
                        m.username === message.username &&
                        m.time === message.time
                    );

                    if (isDuplicate) {
                        console.log('Duplicate message detected, skipping');
                        return prev;
                    }

                    return [...prev, {
                        ...message,
                        time: message.time || new Date().toLocaleTimeString(),
                        read: !isMinimizedRef.current
                    }];
                });
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        websocket.onclose = () => {
            setIsConnected(false);
            console.log('Disconnected from chat server');
        };

        wsRef.current = websocket;

        return () => {
            console.log('Cleaning up WebSocket');
            if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
                websocket.close();
            }
            wsRef.current = null;
        };
    }, [lobbyID, username, playerId]);

    return (
        <div className="flex min-h-screen">
            {/* Question Log Sidebar */}
            <div className="w-64 bg-gray-100 border-r border-gray-300 p-4 overflow-y-auto">
                <h2 className="text-lg font-bold mb-4">Question Log</h2>
                {questionLog.length > 0 ? (
                    <div className="space-y-2">
                        {questionLog.map((msg, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">{msg.username}</p>
                                <p className="text-sm text-gray-800">{msg.content}</p>
                                <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No questions yet...</p>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Game State</h1>

                {turn ? (
                    <div className="text-green-700 font-medium">
                        It's your turn! 🎉
                    </div>
                ) : (
                    <div className="text-gray-500 font-medium">
                        Waiting for the other player...
                    </div>
                )}
                {user && user.email && lobbyID && (
                    <GameSend
                        lobbyId={lobbyID}
                        username={user.email}
                        wsRef={wsRef}
                        setIsConnected={setIsConnected}
                        messages={messagesGame}
                        setMessages={setMessagesGame}
                        turn={turn}
                        setSentMessage={setSentMessage}
                        receivedMessage={receivedMessage}
                        waitingReponse={waitingReponse}
                        setWaitingReponse={setWaitingReponse}
                    />
                )}

                <GameState
                    user={user}
                    setError={setError}
                    lobby={lobby}
                    setLobby={setLobby}
                />
                {/* {user && user.email && lobbyID && (
                    <ChatApp
                        lobbyId={lobbyID}
                        username={user.email}
                        wsRef={wsRef}
                        setIsConnected={setIsConnected}
                        messages={messagesChat}
                        setMessages={setMessagesChat}
                        isMinimizedRef={isMinimizedRef}
                        isMinimized={isMinimized}
                        setIsMinimized={setIsMinimized}
                    />
                )} */}
            </div>
        </div>
    );
}
