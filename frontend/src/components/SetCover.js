const DEFAULT_STYLE = { width: "100%", height: 120, display: "block" };

function DefaultCover({ style }) {
    const { width, height, borderRadius, ...rest } = style;
    return (
        <svg
            viewBox="0 0 240 120"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width, height, borderRadius, display: "block", ...rest }}
            preserveAspectRatio="xMidYMid slice"
        >
            <rect width="240" height="120" fill="#F2EDE7" />

            {/* Grid of person silhouettes */}
            {[
                { cx: 40,  cy: 48 },
                { cx: 90,  cy: 44 },
                { cx: 140, cy: 50 },
                { cx: 190, cy: 46 },
                { cx: 65,  cy: 90 },
                { cx: 115, cy: 86 },
                { cx: 165, cy: 92 },
            ].map(({ cx, cy }, i) => (
                <g key={i} opacity={0.55 - i * 0.03}>
                    {/* Head */}
                    <circle cx={cx} cy={cy - 12} r={7} fill="#D9572B" opacity="0.35" />
                    {/* Body */}
                    <path
                        d={`M${cx - 9} ${cy + 16} Q${cx - 10} ${cy} ${cx} ${cy} Q${cx + 10} ${cy} ${cx + 9} ${cy + 16}`}
                        fill="#D9572B"
                        opacity="0.25"
                    />
                </g>
            ))}

            {/* Subtle grid lines */}
            <line x1="0" y1="60" x2="240" y2="60" stroke="#DDD5CA" strokeWidth="0.5" />
            <line x1="120" y1="0" x2="120" y2="120" stroke="#DDD5CA" strokeWidth="0.5" />
        </svg>
    );
}

/**
 * Renders a set's cover image, falling back to a branded default if none is set.
 *
 * Props:
 *   coverImageName  — path from the server e.g. "/uploads/abc.jpg", or null/undefined
 *   alt             — img alt text
 *   style           — passed to both the img and the fallback (width, height, borderRadius, etc.)
 */
export default function SetCover({ coverImageName, alt = "", style = {} }) {
    const merged = { ...DEFAULT_STYLE, ...style };

    if (coverImageName) {
        return (
            <img
                src={`http://localhost:8080${coverImageName}`}
                alt={alt}
                style={{ ...merged, objectFit: "cover" }}
            />
        );
    }

    return <DefaultCover style={merged} />;
}
