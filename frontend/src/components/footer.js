import Link from "next/link";

export default function Footer() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .site-footer { margin-bottom: 56px; padding: 12px 12px !important; }
          .site-footer .footer-links { gap: 12px !important; flex-wrap: nowrap !important; }
          .site-footer .footer-link { font-size: 10px !important; }
          .site-footer .footer-copy { font-size: 10px !important; white-space: nowrap; }
          .footer-support { display: none !important; }
        }
      `}</style>
      <footer className="site-footer" style={{
        borderTop: "1px solid #DDD5CA",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "nowrap",
        gap: 8,
        fontFamily: "'DM Sans', sans-serif",
      }}>
      <div className="footer-links" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <Link href="/terms" className="footer-link" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Terms
        </Link>
        <Link href="/privacy" className="footer-link" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Privacy
        </Link>
        <Link href="/contact" className="footer-link" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Contact
        </Link>
        <a href="mailto:support@customguess.com" className="footer-link footer-support" style={{ fontSize: 12, color: "#A0937F", textDecoration: "none" }}>
          Support — support@customguess.com
        </a>
      </div>
      <p className="footer-copy" style={{ fontSize: 11, color: "#A0937F", margin: 0, lineHeight: 1.5, whiteSpace: "nowrap" }}>
        Not affiliated with Hasbro, Inc. or Guess Who®
      </p>
      </footer>
    </>
  );
}
