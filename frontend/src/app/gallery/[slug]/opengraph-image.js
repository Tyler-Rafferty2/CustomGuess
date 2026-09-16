import { ImageResponse } from "next/og";
import { SERVER_API_URL } from "@/lib/api";
import { parseSetIdFromSlug } from "@/lib/slug";
import { imgUrl } from "@/lib/imgUrl";

export const runtime = "edge";
export const alt = "CustomGuess – Multiplayer Deduction Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchSet(id) {
    const res = await fetch(`${SERVER_API_URL}/player/set/public/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
}

function genericImage(fraunces) {
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
            </div>
        ),
        { ...size, fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 900 }] }
    );
}

export default async function Image({ params }) {
    const { slug } = await params;

    const fraunces = await fetch(
        "https://fonts.gstatic.com/s/fraunces/v31/6NUu8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnDSg.woff2"
    ).then((r) => r.arrayBuffer());

    const id = parseSetIdFromSlug(slug);
    const set = id ? await fetchSet(id) : null;
    if (!set) return genericImage(fraunces);

    const thumbUrls = (set.characters || []).slice(0, 4).map((c) => imgUrl(c.image)).filter(Boolean);
    let thumbs;
    try {
        thumbs = await Promise.all(
            thumbUrls.map(async (url) => {
                const buf = await fetch(url).then((r) => r.arrayBuffer());
                const base64 = Buffer.from(buf).toString("base64");
                return `data:image/jpeg;base64,${base64}`;
            })
        );
    } catch {
        thumbs = [];
    }

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
                <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    <div
                        style={{
                            display: "inline-flex",
                            background: "#D9572B",
                            color: "#F7F3EE",
                            borderRadius: 8,
                            padding: "10px 20px",
                            fontSize: 20,
                            fontWeight: 600,
                            fontFamily: "sans-serif",
                            width: "fit-content",
                        }}
                    >
                        {set.characterCount} characters · Free online
                    </div>
                    <span
                        style={{
                            fontSize: 56,
                            fontWeight: 900,
                            color: "#1A1510",
                            fontFamily: "Fraunces, serif",
                            letterSpacing: "-1px",
                            maxWidth: 620,
                            lineHeight: 1.1,
                        }}
                    >
                        {set.name}
                    </span>
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
                        Play free on CustomGuess — no account needed
                    </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, width: 380, justifyContent: "flex-end" }}>
                    {thumbs.map((src, i) => (
                        <div
                            key={i}
                            style={{
                                width: 176,
                                height: 176,
                                borderRadius: 10,
                                background: "#FFFFFF",
                                border: "2px solid #E8E0D8",
                                display: "flex",
                                overflow: "hidden",
                            }}
                        >
                            <img src={src} width={176} height={176} style={{ objectFit: "cover" }} alt="" />
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size, fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 900 }] }
    );
}
