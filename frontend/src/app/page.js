"use client";

import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import { useContext } from "react";
import { UserContext } from "@/context/UserContext";

export function GoToPageButton({ page, text }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(page)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      {text}
    </button>
  );
}

export default function Home() {
  const { user, logout } = useContext(UserContext);
  return (
    <div>
      <Navbar />
      <GoToPageButton page="/signup" text="Signup" />
      <GoToPageButton page="/signin" text="Signin" />
      <GoToPageButton page="/lobby" text="Create a Lobby" />
    </div>
  );
}
