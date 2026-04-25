import { useRouter } from "next/navigation";

export default function GoToPageButton({ page, text }) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(page)}
            style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--r)", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, transition: "background 150ms ease" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
        >
            {text}
        </button>
    );
}