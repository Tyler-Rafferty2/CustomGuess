import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CustomGuess – Multiplayer Deduction Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fraunces = await fetch(
    "https://fonts.gstatic.com/s/fraunces/v31/6NUu8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnDSg.woff2"
  ).then((r) => r.arrayBuffer());

  const cards = Array.from({ length: 6 });

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#F7F3EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          fontFamily: "Fraunces, serif",
        }}
      >
        {/* Left — wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          {/* Logo mark inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: "#D9572B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                color: "#F7F3EE",
                fontFamily: "Fraunces, serif",
                fontWeight: 900,
              }}
            >
              ?
            </div>
            <span
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: "#1A1510",
                fontFamily: "Fraunces, serif",
                letterSpacing: "-1px",
              }}
            >
              CustomGuess
            </span>
          </div>

          <p
            style={{
              fontSize: 26,
              color: "#5C5047",
              margin: 0,
              maxWidth: 460,
              lineHeight: 1.4,
              fontFamily: "sans-serif",
              fontWeight: 400,
            }}
          >
            Create custom characters. Ask yes/no questions. Find your friend&apos;s secret before they find yours.
          </p>

          <div
            style={{
              marginTop: 12,
              display: "inline-flex",
              background: "#D9572B",
              color: "#F7F3EE",
              borderRadius: 8,
              padding: "14px 32px",
              fontSize: 22,
              fontWeight: 600,
              fontFamily: "sans-serif",
              width: "fit-content",
            }}
          >
            Play free — no account needed
          </div>
        </div>

        {/* Right — character card grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            width: 380,
            justifyContent: "flex-end",
          }}
        >
          {cards.map((_, i) => {
            const hues = [28, 195, 340, 60, 150, 270];
            const eliminated = i === 1 || i === 4;
            const hue = hues[i];
            const faceColor = eliminated ? "#E8E0D8" : `hsl(${hue}, 38%, 82%)`;
            return (
              <div
                key={i}
                style={{
                  width: 106,
                  height: 136,
                  borderRadius: 10,
                  background: eliminated ? "#E8E0D8" : "#FFFFFF",
                  border: `2px solid ${eliminated ? "#DDD5CA" : "#E8E0D8"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: eliminated ? 0.45 : 1,
                  position: "relative",
                }}
              >
                {/* Face placeholder */}
                <svg width="60" height="72" viewBox="0 0 60 72">
                  <circle cx="30" cy="26" r="16" fill={faceColor} />
                  <path
                    d={`M 0 72 Q 2 50 14 46 Q 22 43 30 43 Q 38 43 46 46 Q 58 50 60 72 Z`}
                    fill={faceColor}
                  />
                </svg>
                {/* Name bar */}
                <div
                  style={{
                    width: 70,
                    height: 10,
                    borderRadius: 5,
                    background: eliminated ? "#DDD5CA" : "#E8E0D8",
                  }}
                />
                {/* Eliminated X */}
                {eliminated && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 48,
                      color: "#D9572B",
                      opacity: 0.6,
                      fontWeight: 900,
                      fontFamily: "Fraunces, serif",
                    }}
                  >
                    ×
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 900 }],
    }
  );
}
