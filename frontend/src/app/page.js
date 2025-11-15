"use client";

import Navbar from "../components/navbar";
import GoToPageButton from "../components/goToPageButton";
import { useContext, useState } from "react";
import { UserContext } from "@/context/UserContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user } = useContext(UserContext);
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    if (gameCode.trim()) {
      router.push(`/lobby/join/${gameCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGg3djdjMC0zLjktMy4xLTctNy03ek0zNiAxNDFoN3Y3YzAtMy45LTMuMS03LTctN3pNNDMgMTM0aDd2N2MwLTMuOS0zLjEtNy03LTd6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>

      <Navbar />

      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center text-white relative z-10 px-6">
        <motion.h1
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight drop-shadow-2xl mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Guess Who?
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl mb-8 text-gray-300 max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Challenge your friends in the ultimate guessing game
        </motion.p>

        <motion.div
          className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Create Game - Green */}
          <button
            onClick={() => router.push("/create")}
            className="group bg-emerald-500 hover:bg-emerald-400 p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/50 border-2 border-emerald-400/50"
          >
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🎮</div>
            <h2 className="text-2xl font-bold mb-2 text-white">Create Game</h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Start a new game and invite your friends to join
            </p>
          </button>

          {/* Search Public Games - Blue */}
          <button
            onClick={() => router.push("/lobby")}
            className="group bg-blue-500 hover:bg-blue-400 p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50 border-2 border-blue-400/50"
          >
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🔍</div>
            <h2 className="text-2xl font-bold mb-2 text-white">Public Games</h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Browse and join open games from players worldwide
            </p>
          </button>

          {/* Join with Code - Purple */}
          <div className="group bg-purple-500 hover:bg-purple-400 p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 border-2 border-purple-400/50">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🔑</div>
            <h2 className="text-2xl font-bold mb-2 text-white">Join with Code</h2>
            <p className="text-sm text-white/90 mb-3 leading-relaxed">
              Have a game code? Enter it below
            </p>
            <form onSubmit={handleJoinWithCode} className="mt-3">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={6}
                className="w-full px-4 py-2 rounded-lg text-center text-lg font-bold text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-4 focus:ring-purple-300 transition"
              />
              <button
                type="submit"
                className="w-full mt-2 px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition"
              >
                Join Game
              </button>
            </form>
          </div>
        </motion.div>

        {!user && (
          <motion.p
            className="mt-6 text-sm text-gray-400 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            💡 Sign in to save your stats and compete on the leaderboard
          </motion.p>
        )}
      </div>
    </div>
  );
}