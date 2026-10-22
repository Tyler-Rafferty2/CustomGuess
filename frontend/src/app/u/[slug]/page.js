import { notFound, redirect } from "next/navigation";
import { SERVER_API_URL } from "@/lib/api";
import { parseIdFromSlug, userProfilePath } from "@/lib/slug";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ProfileClient from "./ProfileClient";

async function fetchProfile(id) {
  const res = await fetch(`${SERVER_API_URL}/profiles/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

async function loadOrRedirect(slug) {
  const id = parseIdFromSlug(slug);
  if (!id) notFound();

  const profile = await fetchProfile(id);
  if (!profile) notFound();

  // Usernames can change; the UUID is the source of truth and the prefix is regenerated.
  const canonical = userProfilePath(profile.id, profile.username);
  if (canonical !== `/u/${slug}`) {
    redirect(canonical);
  }
  return profile;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return {};
  const profile = await fetchProfile(id);
  if (!profile) return {};
  return {
    title: `${profile.username} · Custom Guess`,
    description: `${profile.username} has made ${profile.setCount} Custom Guess Who ${profile.setCount === 1 ? "set" : "sets"}. Play them free online.`,
    alternates: { canonical: `https://customguess.com${userProfilePath(profile.id, profile.username)}` },
  };
}

export default async function PublicProfilePage({ params }) {
  const { slug } = await params;
  const profile = await loadOrRedirect(slug);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "var(--s6) var(--s4)", width: "100%" }}>
        <ProfileClient initialProfile={profile} />
      </main>
      <Footer />
    </div>
  );
}
