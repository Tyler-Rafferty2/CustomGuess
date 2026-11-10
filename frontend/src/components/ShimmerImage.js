"use client";
import { useEffect, useRef, useState } from "react";

/**
 * An <img> that shows a shimmer placeholder at its final size until the image
 * has loaded, then fades the image in.
 *
 * Props:
 *   src, alt, loading — passed to the <img>
 *   style    — sizing/box styles for the wrapper (width, height, aspectRatio, borderRadius, border, …)
 *   imgStyle — extra styles for the <img> itself (e.g. objectFit)
 *   fallback — rendered in place of the image if it fails to load
 *   onLoad / onError — called once the image settles either way
 */
export default function ShimmerImage({ src, alt = "", loading, style, imgStyle, fallback, onLoad, onError }) {
    const [status, setStatus] = useState("loading"); // loading | loaded | error
    const imgRef = useRef(null);
    const callbacks = useRef({ onLoad, onError });
    callbacks.current = { onLoad, onError };

    const settle = (ok) => {
        setStatus(ok ? "loaded" : "error");
        (ok ? callbacks.current.onLoad : callbacks.current.onError)?.();
    };

    // Server-rendered or cached images can finish loading before React attaches
    // onLoad, so check the element directly whenever the source changes.
    useEffect(() => {
        setStatus("loading");
        const img = imgRef.current;
        if (img && img.complete) settle(img.naturalWidth > 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    if (!src) {
        return fallback ?? <div aria-hidden="true" style={{ background: "var(--surface-1)", ...style }} />;
    }

    if (status === "error" && fallback) return fallback;

    return (
        <div style={{ position: "relative", overflow: "hidden", display: "block", background: "var(--surface-1)", ...style }}>
            {status === "loading" && <div className="gw-shimmer" aria-hidden="true" style={{ position: "absolute", inset: 0 }} />}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                loading={loading}
                onLoad={() => settle(true)}
                onError={() => settle(false)}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: status === "loaded" ? 1 : 0,
                    transition: "opacity 250ms cubic-bezier(0.0, 0.0, 0.2, 1)",
                    ...imgStyle,
                }}
            />
        </div>
    );
}
