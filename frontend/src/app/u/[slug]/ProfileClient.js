"use client";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Hash, Trophy, Play, Heart } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { setGalleryPath } from "@/lib/slug";
import { UserContext } from "@/context/UserContext";
import SetCover from "@/components/SetCover";
import RelationshipButtons from "@/components/social/RelationshipButtons";
import { SOCIAL_STYLES, STATUS_LABEL, initials } from "@/components/social/socialStyles";

const PROFILE_STYLES = `
  .pp-card { background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--r); padding: var(--s5); }
  .pp-header { display: flex; align-items: center; gap: var(--s4); flex-wrap: wrap; }
  .pp-actions { margin-left: auto; }
  .pp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s3); }
  .pp-sets { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s3); }
  .pp-set { display: block; border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; background: var(--surface-0);
    text-decoration: none; color: inherit; transition: border-color 150ms cubic-bezier(0,0,0.2,1); }
  .pp-set:hover { border-color: var(--border-strong); }
  .pp-set:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (max-width: 768px) {
    .pp-stats { grid-template-columns: 1fr 1fr; }
    .pp-sets { grid-template-columns: 1fr 1fr; }
    .pp-actions { margin-left: 0; width: 100%; }
  }
  @media (max-width: 480px) { .pp-sets { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .pp-set { transition: none; } }
`;

function formatJoined(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfileClient({ initialProfile }) {
    const { user, isLoading } = useContext(UserContext);
    const [profile, setProfile] = useState(initialProfile);

    // The server render has no session, so fetch again with credentials to get
    // the viewer-specific fields (relationship, following, status).
    useEffect(() => {
        if (isLoading || !user || user.isGuest) return;
        apiFetch(`/profiles/${initialProfile.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data && setProfile(data))
            .catch(() => {});
    }, [isLoading, user, initialProfile.id]);

    const onRelationshipChange = ({ relationship, following }) => {
        setProfile((p) => {
            let friendCount = p.friendCount;
            if (p.relationship !== "friends" && relationship === "friends") friendCount++;
            if (p.relationship === "friends" && relationship !== "friends") friendCount--;
            let followerCount = p.followerCount;
            if (!p.following && following) followerCount++;
            if (p.following && !following) followerCount--;
            return { ...p, relationship, following, friendCount, followerCount };
        });
    };

    const stats = [
        { label: "Games", value: profile.gamesPlayed.toLocaleString(), Icon: Hash },
        { label: "Win rate", value: `${Math.round(profile.winRate * 100)}%`, Icon: Trophy },
        { label: "Set plays", value: profile.setPlays.toLocaleString(), Icon: Play },
        { label: "Set likes", value: profile.setLikes.toLocaleString(), Icon: Heart },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
            <style>{SOCIAL_STYLES}</style>
            <style>{PROFILE_STYLES}</style>

            <section className="pp-card pp-header">
                <div className="sb-avatar" style={{ width: 64, height: 64, fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22 }}>
                    {initials(profile.username)}
                </div>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-900)", margin: 0, overflowWrap: "anywhere" }}>
                        {profile.username}
                    </h1>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s3)", marginTop: "var(--s1)", alignItems: "center" }}>
                        {profile.status && (
                            <span className="sb-status">
                                <span className={`sb-dot sb-dot--${profile.status}`} aria-hidden="true" />
                                {STATUS_LABEL[profile.status]}
                            </span>
                        )}
                        <span className="sb-status">Joined {formatJoined(profile.joinedAt)}</span>
                    </div>
                    <div style={{ display: "flex", gap: "var(--s4)", marginTop: "var(--s2)", fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-600)", fontVariantNumeric: "tabular-nums" }}>
                        <span><strong style={{ color: "var(--text-900)" }}>{profile.friendCount}</strong> {profile.friendCount === 1 ? "friend" : "friends"}</span>
                        <span><strong style={{ color: "var(--text-900)" }}>{profile.followerCount}</strong> {profile.followerCount === 1 ? "follower" : "followers"}</span>
                        <span><strong style={{ color: "var(--text-900)" }}>{profile.setCount}</strong> {profile.setCount === 1 ? "set" : "sets"}</span>
                    </div>
                </div>
                <div className="pp-actions">
                    <RelationshipButtons
                        userId={profile.id}
                        relationship={user && !user.isGuest && user.id === profile.id ? "self" : profile.relationship}
                        following={profile.following}
                        status={profile.status}
                        onChange={onRelationshipChange}
                    />
                </div>
            </section>

            <section className="pp-stats" aria-label="Stats">
                {stats.map(({ label, value, Icon }) => (
                    <div key={label} className="pp-card" style={{ padding: "var(--s4)" }}>
                        <div className="sb-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Icon size={12} aria-hidden="true" /> {label}
                        </div>
                        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-900)", marginTop: "var(--s1)", fontVariantNumeric: "tabular-nums" }}>
                            {value}
                        </div>
                    </div>
                ))}
            </section>

            <section className="pp-card">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: "var(--text-900)", margin: "0 0 var(--s4)" }}>
                    Sets by {profile.username}
                </h2>
                {profile.sets.length === 0 ? (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-base)", color: "var(--text-400)", margin: 0 }}>
                        No public sets yet.
                    </p>
                ) : (
                    <div className="pp-sets">
                        {profile.sets.map((set) => (
                            <Link key={set.id} href={setGalleryPath(set.id, set.name)} className="pp-set">
                                <SetCover coverImageName={set.coverImageName} alt={set.name} style={{ height: 120 }} />
                                <div style={{ padding: "var(--s3)" }}>
                                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {set.name}
                                    </div>
                                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "var(--text-sm)", color: "var(--text-400)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                                        {set.playCount.toLocaleString()} plays · {set.likeCount} likes
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
