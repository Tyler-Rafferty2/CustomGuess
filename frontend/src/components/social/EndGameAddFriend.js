"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import RelationshipButtons from "./RelationshipButtons";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

// "Add friend" strip on the end-of-game screen. Renders nothing for guests,
// guest opponents, or players who are already friends.
export default function EndGameAddFriend({ lobby, user }) {
    const opponent = lobby?.players?.find((p) => p.userId && p.userId !== NIL_UUID && p.userId !== user?.id);
    const opponentId = opponent?.userId;
    const enabled = !!user && !user.isGuest && !!opponentId;
    const [relationship, setRelationship] = useState(null);
    const [initialRelationship, setInitialRelationship] = useState(null);

    useEffect(() => {
        if (!enabled) return;
        apiFetch(`/friends/relationship/${opponentId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                setRelationship(data?.relationship ?? null);
                setInitialRelationship(data?.relationship ?? null);
            })
            .catch(() => setRelationship(null));
    }, [enabled, opponentId]);

    // Hide for people who were already friends; keep showing the confirmation if they just became friends.
    if (!enabled || relationship === null || relationship === "self" || initialRelationship === "friends") return null;

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s3)", flexWrap: "wrap",
            marginTop: "var(--s3)", padding: "var(--s3) var(--s4)",
            background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--r)",
        }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-600)" }}>
                {relationship === "friends" ? "You and your opponent are now friends." : "Enjoyed the game? Add your opponent as a friend."}
            </span>
            {relationship !== "friends" && (
                <RelationshipButtons userId={opponentId} relationship={relationship} showFollow={false} small
                    onChange={(next) => setRelationship(next.relationship)} />
            )}
        </div>
    );
}
