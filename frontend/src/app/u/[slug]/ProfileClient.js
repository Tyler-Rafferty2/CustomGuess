"use client";
import { useContext, useEffect, useState } from "react";
import { Hash, Trophy, Play, Heart } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserContext } from "@/context/UserContext";
import { usePresence } from "@/context/PresenceContext";
import SetGrid from "@/components/social/SetGrid";
import RelationshipButtons from "@/components/social/RelationshipButtons";
import { SOCIAL_STYLES, STATUS_LABEL, initials } from "@/components/social/socialStyles";

const PROFILE_STYLES = `
  .pp-card { background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--r); padding: var(--s5); }
  .pp-header { display: flex; align-items: center; gap: var(--s4); flex-wrap: wrap; }
  .pp-actions { margin-left: auto; }
  .pp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s3); }
  @media (max-width: 768px) {
    .pp-stats { grid-template-columns: 1fr 1fr; }
    .pp-actions { margin-left: 0; width: 100%; }
  }
`;

function formatJoined(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfileClient({ initialProfile }) {
    const { user, isLoading } = useContext(UserContext);
    const [profile, setProfile] = useState(initialProfile);
    const { statusOf } = usePresence();

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

    // Live status for friends, falling back to the status in the profile response.
    const status = profile.relationship === "friends" ? (statusOf(profile.id) ?? profile.status) : undefined;

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
                        {status && (
                            <span className="sb-status">
                                <span className={`sb-dot sb-dot--${status}`} aria-hidden="true" />
                                {STATUS_LABEL[status]}
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
                        status={status}
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
                    <SetGrid sets={profile.sets} />
                )}
            </section>
        </div>
    );
}
