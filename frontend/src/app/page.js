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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGg3djdjMC0zLjktMy4xLTctNy03ek0zNiAxNDFoN3Y3YzAtMy45LTMuMS03LTctN3pNNDMgMTM0aDd2N2MwLTMuOS0zLjEtNy03LTd6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

      <Navbar />

      <div className="container mx-auto px-6 py-16 flex flex-col items-center text-center text-white relative z-10">
        <motion.h1
          className="text-7xl font-extrabold tracking-tight drop-shadow-2xl mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Guess Who?
        </motion.h1>

        <motion.p
          className="text-xl mt-2 mb-16 opacity-80 max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Challenge your friends in the ultimate guessing game
        </motion.p>

        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Create Game */}
          <button
            onClick={() => router.push("/lobby/create")}
            className="group bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/50"
          >
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎮</div>
            <h2 className="text-3xl font-bold mb-3">Create Game</h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Start a new game and invite your friends to join
            </p>
          </button>

          {/* Search Public Games */}
          <button
            onClick={() => router.push("/lobby/public")}
            className="group bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50"
          >
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔍</div>
            <h2 className="text-3xl font-bold mb-3">Public Games</h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Browse and join open games from players worldwide
            </p>
          </button>

          {/* Join with Code */}
          <div className="group bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔑</div>
            <h2 className="text-3xl font-bold mb-3">Join with Code</h2>
            <p className="text-sm opacity-90 mb-4 leading-relaxed">
              Have a game code? Enter it below
            </p>
            <form onSubmit={handleJoinWithCode} className="mt-4">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg text-center text-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/50 transition"
              />
              <button
                type="submit"
                className="w-full mt-3 px-4 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                Join Game
              </button>
            </form>
          </div>
        </motion.div>

        {!user && (
          <motion.p
            className="mt-12 text-sm opacity-70 max-w-md"
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