"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import GameState from "./GameState";
import ChatApp from '@/components/chatapp';
import GameSend from '@/components/gameSend';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';


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
    const [isMinimized, setIsMinimized] = useState(false);
    const isMinimizedRef = useRef(isMinimized);
    const [isGuessMode, setIsGuessMode] = useState(false);
    const [lobbyStatus, setLobbyStatus] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    const params = useParams();
    const lobbyID = params.lobbyId;
    let username = user ? user.email : null;

    const router = useRouter();

    const joinLobby = async (lobbyCode, lobbyID) => {
        setError(null);
        try {
            const res = await fetch(`http://localhost:8080/lobby/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
                body: JSON.stringify({ code: lobbyCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log("joined about to check")
            getGameState();
            checkLobbyStatus();
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };


    const checkLobbyStatus = async () => {
        if (!lobbyID) return;

        try {
            const res = await fetch(`http://localhost:8080/lobby/${lobbyID}/status`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setLobbyStatus({ exists: false, error: data.error });
                return;
            }

            setLobbyStatus({
                exists: true,
                playerCount: data.playerCount,
                gameStarted: data.gameStarted,
                isFull: data.playerCount >= 2
            });

        } catch (err) {
            console.error(err);
            setLobbyStatus({ exists: false, error: "Network error" });
        }
    };


    const getGameState = async () => {
        setError(null);

        try {
            const res = await fetch(`http://localhost:8080/lobby/${lobbyID}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log("Fetched gamestate:", data);
            setGameState(data);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const handleCopyClick = () => {
        // Only copy if not already in "copied" state
        if (isCopied) return;

        navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);

        // Reset the button after 2 seconds
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };


    //console.log(playerId, lobby ? lobby.lobby.turn : null)
    useEffect(() => {
        if (lobby?.players && user) {
            const id = lobby.players.find(p => p.userId === user.id)?.id;
            setPlayerId(id);
        }
    }, [lobby, user]);

    useEffect(() => {
        if (lobby && playerId != null) {
            setTurn(playerId === lobby.turn);
        }
    }, [lobby, playerId]);

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
            else if (message.channel === "lobby_update") {
                console.log("Received lobby update:", message.lobby);
                setLobby(message.lobby);
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

    useEffect(() => {
        if (lobby?.players) {
            console.log(`Player count changed: ${lobby.players.length}`);
        }
    }, [lobby]);

    useEffect(() => {
        checkLobbyStatus();
        console.log("lobbyStatus:", lobbyStatus);
    }, [lobbyID]);

    useEffect(() => {
        console.log("lobbyStatus updated:", lobbyStatus);
    }, [lobbyStatus]);

    useEffect(() => {
        console.log("gameState updated:", gameState);
        console.log("secretChat updated:", gameState?.secretCharacter);
    }, [gameState]);

    useEffect(() => {
        // Only auto-join if lobby exists, has less than 2 players, and user is not already in it
        if (lobby &&
            lobby.players?.length < 2 &&
            !lobby.players.some(player => player.userId === user?.id) &&
            lobby.code &&
            lobby.id) {
            joinLobby(lobby.code, lobby.id);
        }
    }, [lobby?.id, lobby?.players?.length]);

    useEffect(() => {
        if (lobbyID && user?.id && lobby?.players?.length && !gameState) {
            console.log("Fetching gameState...");
            getGameState();
        }
    }, [lobbyID, user?.id, lobby?.players?.length, gameState]);

    console.log("this is the lobby", lobby)
    console.log("length", lobby?.players?.length)
    //this needs to not look at user but instead look at players id save din storage
    if (lobby?.gameOver) {
        const currentPlayer = lobby.players.find(p => p.userId === user?.id);
        const isWinner = currentPlayer?.id === lobby.winner;
        console.log("user id", user?.id);
        console.log("looks here", currentPlayer?.id, lobby.winner);
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-6 text-white px-6">
                <div className="text-6xl mb-4">{isWinner ? "🎉" : "😢"}</div>
                <h1 className="text-4xl font-bold">{isWinner ? "Victory!" : "Game Over"}</h1>
                <h2 className="text-2xl text-gray-300">
                    {isWinner ? "You Won!" : "Better luck next time"}
                </h2>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // Handle lobby status checks
    if (lobbyStatus === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
                <h1 className="text-2xl font-bold">Checking lobby...</h1>
            </div>
        );
    }

    if (!lobbyStatus.exists) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 text-white px-6">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-3xl font-bold">Lobby Not Found</h1>
                <p className="text-gray-300 text-lg">This lobby doesn't exist or has expired.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                >
                    Create New Game
                </button>
            </div>
        );
    }

    // Wait for lobby data from WebSocket before making decisions
    if (!lobby && lobbyStatus?.exists) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <h1 className="text-2xl font-bold">Connecting to game...</h1>
            </div>
        );
    }

    // Now check if user is in the game (only after lobby is loaded)
    if (lobby && !lobby.players.some(player => player.userId === user?.id)) {
        // User tried to join but isn't in the player list = game is full
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 text-white px-6">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-3xl font-bold">Game is Full</h1>
                <p className="text-gray-300 text-lg">This game already has 2 players.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                >
                    Create New Game
                </button>
            </div>
        );
    }

    // Your existing waiting for players check
    if (lobby?.players?.length < 2 && (lobby?.players.some(player => player.userId === user?.id))) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-6 text-white px-6">
                <div className="text-6xl mb-4 animate-bounce">⏳</div>
                <h1 className="text-3xl font-bold">Waiting for players to join...</h1>

                {/* Share Link Section */}
                <p className="text-gray-300 text-lg">Share this link with a friend:</p>
                <div className="flex gap-3 w-full max-w-2xl">
                    <input
                        type="text"
                        value={typeof window !== 'undefined' ? window.location.href : ''}
                        readOnly
                        className="flex-1 px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                        onClick={handleCopyClick}
                        disabled={isCopied} // Briefly disable button to prevent spamming
                        className={`px-6 py-3 font-bold rounded-xl transition-all duration-300 shadow-lg ${isCopied
                            ? 'bg-green-600 text-white' // Success state
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-105 shadow-lg hover:shadow-emerald-500/50' // Default state
                            }`}
                    >
                        {isCopied ? 'Copied! ✓' : 'Copy Link'}
                    </button>
                </div>

                {/* Separator */}
                <div className="text-gray-400 text-lg mt-4">or</div>

                {/* Join Code Section */}
                <p className="text-gray-300 text-lg">Have your friend join with this code:</p>
                <div className="bg-slate-700/50 border-2 border-slate-600 rounded-xl px-12 py-4">
                    <p className="text-5xl font-bold tracking-widest text-emerald-400">
                        {lobby?.code} {/* Displays the lobby code */}
                    </p>
                </div>
            </div>
        );
    } else if (!(lobby?.players.some(player => player.userId === user?.id))) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-4 text-white px-6">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-3xl font-bold">Game is Full</h1>
                <p className="text-gray-300 text-lg">This game already has 2 players.</p>
                <button
                    onClick={() => router.push('/lobby')}
                    className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                >
                    Create New Game
                </button>
            </div>
        );
    }

    console.log("gameSTAte  ", gameState)
    if (gameState?.secretCharacter === undefined) {

        console.log("reloading")

        const IMAGE_SIZE = '120px';

        const Item = styled(Paper)(({ theme, isSelected, isGuessMode }) => ({
            ...theme.typography.body2,
            padding: theme.spacing(2),
            textAlign: 'center',
            backgroundColor: 'rgba(71, 85, 105, 0.5)',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s',
            position: 'relative',
            border: '2px solid rgba(100, 116, 139, 0.3)',
            borderRadius: '12px',

            '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: 'rgba(71, 85, 105, 0.7)',
                borderColor: '#10b981',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            },

            '& img': {
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                objectFit: 'cover',
                borderRadius: '8px',
            },

            ...(isSelected && {
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: theme.spacing(2),
                    left: theme.spacing(2),
                    width: IMAGE_SIZE,
                    height: IMAGE_SIZE,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    pointerEvents: 'none',
                    borderRadius: '8px',
                }
            }),

        }));

        const selectSecretCharacter = async (charid) => {
            setError(null);

            try {
                const res = await fetch(`http://localhost:8080/lobby/setSecretChar`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-ID": user?.id,
                    },
                    body: JSON.stringify({
                        lobbyCode: lobby?.id,
                        secretCharacter: charid
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Something went wrong");
                    return;
                }
                console.log("Fetched gamestate:", data);
                setGameState(data);
            } catch (err) {
                console.error(err);
                setError("Network error");
            }
        };

        const characters = gameState?.lobby.characterSet.characters || [];
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-6 text-white px-6 py-12">
                <div className="text-6xl mb-4">🎭</div>
                <h1 className="text-4xl font-bold">Choose Your Secret Character</h1>
                <p className="text-gray-300 text-lg mb-4">Select wisely - your opponent will try to guess!</p>
                <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: '1200px' }}>
                    {characters.map((char) => {
                        return (
                            <Grid item xs={6} sm={4} md={3} lg={2} key={char.id}>
                                <Item
                                    onClick={() => {
                                        selectSecretCharacter(char.id);
                                    }}
                                    className="h-full"
                                >
                                    <div className="flex flex-col items-center justify-between h-full">
                                        <img
                                            src={`http://localhost:8080` + char.image}
                                            alt={char.name}
                                        />
                                        <span className="text-sm font-semibold mt-2">{char.name}</span>
                                    </div>
                                </Item>
                            </Grid>
                        );
                    })}
                </Grid>
            </div>
        );
    }

    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: 'rgba(71, 85, 105, 0.5)',
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        color: '#fff',
    }));

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Question Log Sidebar */}
            {lobby.chatFeature && (
                <div className="w-64 bg-slate-800/50 border-r border-slate-700 p-4 overflow-y-auto backdrop-blur-sm">
                    <h2 className="text-lg font-bold mb-4 text-white">Question Log</h2>
                    {questionLog.length > 0 ? (
                        <div className="space-y-2">
                            {questionLog.map((msg, index) => (
                                <div key={index} className="bg-slate-700/50 p-3 rounded-lg shadow-sm border border-slate-600">
                                    <p className="text-xs text-gray-400 mb-1">{msg.username}</p>
                                    <p className="text-sm text-white">{msg.content}</p>
                                    <p className="text-xs text-gray-500 mt-1">{msg.time}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No questions yet...</p>
                    )}
                </div>)};

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 text-white">

                <div className="flex w-full mb-6">

                    {/* 1. GameSend Component (9/12 width) */}
                    <div className="w-9/12 pr-4">
                        {user && user.email && lobbyID && lobby.chatFeature && (
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
                                setIsGuessMode={setIsGuessMode}
                                isGuessMode={isGuessMode}
                            />
                        )}
                    </div>
                    {!lobby.chatFeature && (
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
                    )};

                    {/* 2. Secret Character Info (3/12 width) */}
                    <div className="w-3/12 pl-4 border-l border-slate-700">
                        {gameState && gameState.secretCharacter && (
                            <>
                                <h2 className="text-white text-base font-semibold mb-3">
                                    Your Secret Character:
                                </h2>
                                <div className="flex items-center justify-start">
                                    <div className="flex flex-col items-center border-2 border-emerald-500 bg-slate-700/50 p-3 rounded-xl w-full shadow-lg shadow-emerald-500/20">
                                        <img
                                            src={`http://localhost:8080` + gameState.secretCharacter.image}
                                            alt={gameState.secretCharacter.name}
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        <span className="font-bold text-sm mt-2 text-white">{gameState.secretCharacter.name}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <GameState
                    user={user}
                    setError={setError}
                    lobby={lobby}
                    setLobby={setLobby}
                    gameState={gameState}
                    setGameState={setGameState}
                    isGuessMode={isGuessMode}
                    getGameState={getGameState}
                />
            </div>
        </div>
    );
}