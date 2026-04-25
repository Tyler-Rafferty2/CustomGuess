import Link from "next/link";

export default function Footer() {
  return (
    <>
      <style>{`@media (max-width: 768px) { .site-footer { display: none !important; } }`}</style>
      <footer className="site-footer" style={{
        borderTop: "1px solid #DDD5CA",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        fontFamily: "'DM Sans', sans-serif",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <Link href="/terms" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Terms
        </Link>
        <Link href="/privacy" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Privacy
        </Link>
        <a href="mailto:support@customguess.com" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Support — support@customguess.com
        </a>
      </div>
      <p style={{ fontSize: 11, color: "#A0937F", margin: 0, lineHeight: 1.5 }}>
        Not affiliated with Hasbro, Inc. or Guess Who®
      </p>
      </footer>
    </>
  );
}
