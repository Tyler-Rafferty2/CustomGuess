import { API_URL } from '@/lib/api';
const DEFAULT_STYLE = { width: "100%", height: 120, display: "block" };

// Question mark positions: [x, y, fontSize, opacity]
const QMARKS = [
    [20, 30, 28, 0.18],
    [70, 22, 22, 0.13],
    [118, 34, 32, 0.20],
    [168, 18, 20, 0.12],
    [210, 28, 26, 0.16],
    [44, 72, 24, 0.14],
    [92, 80, 30, 0.19],
    [145, 68, 22, 0.13],
    [192, 76, 28, 0.17],
    [10, 95, 18, 0.10],
    [230, 90, 20, 0.11],
    [60, 108, 26, 0.15],
    [120, 100, 20, 0.12],
    [175, 104, 24, 0.14],
];

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
            {QMARKS.map(([x, y, size, opacity], i) => (
                <text
                    key={i}
                    x={x}
                    y={y}
                    fontSize={size}
                    fontFamily="Fraunces, Georgia, serif"
                    fontWeight="700"
                    fill="#D9572B"
                    opacity={opacity}
                    userSelect="none"
                >
                    ?
                </text>
            ))}
            {/* Central large mark */}
            <text
                x="120"
                y="78"
                fontSize="52"
                fontFamily="Fraunces, Georgia, serif"
                fontWeight="700"
                fill="#D9572B"
                opacity="0.22"
                textAnchor="middle"
                userSelect="none"
            >
                ?
            </text>
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
        const src = coverImageName.startsWith("http")
            ? coverImageName
            : `${API_URL}${coverImageName}`;
        return (
            <img
                src={src}
                alt={alt}
                loading="lazy"
                style={{ ...merged, objectFit: "cover" }}
            />
        );
    }

    return <DefaultCover style={merged} />;
}
