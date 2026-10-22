"use client";
import Link from "next/link";
import { userProfilePath } from "@/lib/slug";
import { STATUS_LABEL, initials } from "./socialStyles";

// One person in a friends/requests list: avatar, linked name, optional status, actions on the right.
export default function FriendRow({ person, status, actions, compact = false, onNavigate }) {
    const muted = status === "offline";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: compact ? "6px 0" : "var(--s2) 0", minHeight: 44 }}>
            <span className="sb-avatar" style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, fontSize: compact ? 11 : 13, opacity: muted ? 0.6 : 1 }}>
                {initials(person.username)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={userProfilePath(person.id, person.username)} onClick={onNavigate}
                    style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "var(--text-base)",
                        color: muted ? "var(--text-400)" : "var(--text-900)", textDecoration: "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {person.username}
                </Link>
                {status && (
                    <span className="sb-status">
                        <span className={`sb-dot sb-dot--${status}`} aria-hidden="true" />
                        {STATUS_LABEL[status]}
                    </span>
                )}
            </div>
            {actions && <div style={{ display: "flex", gap: "var(--s2)", flexShrink: 0 }}>{actions}</div>}
        </div>
    );
}
