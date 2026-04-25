import { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, Crop, Pencil } from 'lucide-react';

const T = {
    bg: "#F7F3EE", surface0: "#FFFFFF", surface1: "#F2EDE7", surface2: "#E8E0D8",
    accent: "#D9572B", accentLight: "#F2C5B4", accentDim: "#B84422",
    text900: "#1A1510", text600: "#5C5047", text400: "#A0937F",
    border: "#DDD5CA", borderStrong: "#C4B8A8", stateOut: "#C0392B",
};

const CONTAINER_SIZE = 400;
const OUTPUT_SIZE = 280;
const HANDLE_SIZE = 12;
const MIN_CROP = 50;

// triggerEdit: when set to a number, opens the crop modal for that index.
// Parent should reset it to null after passing (use a counter so the same index re-triggers).
export default function ImageCropperIntegration({ images, setImages, triggerEdit = null }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 280, height: 280 });
    const [dragging, setDragging] = useState(null);
    const [dropHover, setDropHover] = useState(false);
    const fileInputRef = useRef(null);

    const processFile = (file, onDone) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = OUTPUT_SIZE;
                canvas.height = OUTPUT_SIZE;
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                canvas.toBlob((blob) => {
                    const croppedFile = new File([blob], file.name, { type: 'image/png' });
                    onDone({
                        id: Date.now() + Math.random(),
                        name: file.name.replace(/\.[^/.]+$/, '').slice(0, 28),
                        originalName: file.name,
                        file: croppedFile,
                        original: e.target.result,
                        cropped: canvas.toDataURL('image/png'),
                        croppedFile,
                    });
                }, 'image/png');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (files) => {
        Array.from(files).forEach(file => {
            processFile(file, (entry) => setImages(prev => [...prev, entry]));
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDropHover(false);
        const files = e.dataTransfer.files;
        if (files.length) handleFileSelect(files);
    };

    const startEdit = (index) => {
        setEditingIndex(index);
        setCropBox({ x: 50, y: 50, width: 280, height: 280 });
    };

    const handleMouseDown = (e, type) => {
        e.preventDefault();
        setDragging({ type, startX: e.clientX, startY: e.clientY, startBox: { ...cropBox } });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        let b = { ...cropBox };

        if (dragging.type === 'move') {
            b.x = Math.max(0, Math.min(CONTAINER_SIZE - b.width, dragging.startBox.x + dx));
            b.y = Math.max(0, Math.min(CONTAINER_SIZE - b.height, dragging.startBox.y + dy));
        } else {
            const sb = dragging.startBox;
            if (dragging.type === 'nw') {
                const size = Math.max(MIN_CROP, Math.min(sb.width - dx, sb.height - dy));
                b.width = size; b.height = size;
                b.x = sb.x + (sb.width - size); b.y = sb.y + (sb.height - size);
            } else if (dragging.type === 'ne') {
                const size = Math.max(MIN_CROP, Math.min(sb.width + dx, sb.height - dy));
                b.width = size; b.height = size;
                b.y = sb.y + (sb.height - size);
            } else if (dragging.type === 'sw') {
                const size = Math.max(MIN_CROP, Math.min(sb.width - dx, sb.height + dy));
                b.width = size; b.height = size;
                b.x = sb.x + (sb.width - size);
            } else if (dragging.type === 'se') {
                const size = Math.max(MIN_CROP, Math.min(sb.width + dx, sb.height + dy));
                b.width = size; b.height = size;
            }
            b.x = Math.max(0, Math.min(CONTAINER_SIZE - b.width, b.x));
            b.y = Math.max(0, Math.min(CONTAINER_SIZE - b.height, b.y));
        }
        setCropBox(b);
    };

    const handleMouseUp = () => setDragging(null);

    useEffect(() => {
        if (!dragging) return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, cropBox]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-open crop modal when parent signals a new image was added
    useEffect(() => {
        if (triggerEdit == null || images.length === 0) return;
        setEditingIndex(triggerEdit);
        setCropBox({ x: 50, y: 50, width: 280, height: 280 });
    }, [triggerEdit, images.length]);

    const applyCrop = () => {
        const img = images[editingIndex];
        const image = new Image();
        image.onload = () => {
            const aspect = image.width / image.height;
            let rw, rh, ox, oy;
            if (aspect > 1) {
                rw = CONTAINER_SIZE; rh = CONTAINER_SIZE / aspect;
                ox = 0; oy = (CONTAINER_SIZE - rh) / 2;
            } else {
                rh = CONTAINER_SIZE; rw = CONTAINER_SIZE * aspect;
                ox = (CONTAINER_SIZE - rw) / 2; oy = 0;
            }

            const sx = (cropBox.x - ox) * (image.width / rw);
            const sy = (cropBox.y - oy) * (image.height / rh);
            const sw = cropBox.width * (image.width / rw);
            const sh = cropBox.height * (image.height / rh);

            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE; canvas.height = OUTPUT_SIZE;
            canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            canvas.toBlob((blob) => {
                const croppedFile = new File([blob], img.originalName, { type: 'image/png' });
                setImages(prev => prev.map((item, idx) =>
                    idx === editingIndex
                        ? { ...item, cropped: canvas.toDataURL('image/png'), croppedFile }
                        : item
                ));
                setEditingIndex(null);
            }, 'image/png');
        };
        image.src = img.original;
    };

    const updateName = (id, name) =>
        setImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));

    const remove = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    return (
        <div>
            {/* Drop zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
                onDragLeave={() => setDropHover(false)}
                style={{
                    border: `2px dashed ${dropHover ? T.accent : T.border}`,
                    borderRadius: 6,
                    padding: "28px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dropHover ? T.accentLight : T.surface1,
                    transition: "all 150ms ease-out",
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
                />
                <Upload size={22} color={dropHover ? T.accent : T.text400} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: dropHover ? T.accent : T.text600, margin: "0 0 4px", fontWeight: 500 }}>
                    Drop images here or click to browse
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>
                    Each image will be auto-cropped to square — you can adjust after
                </p>
            </div>

            {/* Image grid */}
            {images.length > 0 && (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {images.map((img, index) => (
                        <div key={img.id} className="char-card" style={{ position: "relative", background: T.surface0, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={img.cropped || img.original}
                                alt={img.name}
                                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                            />

                            {/* Hover actions */}
                            <div className="char-overlay" style={{
                                position: "absolute", inset: 0,
                                background: "rgba(26,21,16,0.45)",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            }}>
                                <button
                                    onClick={() => startEdit(index)}
                                    title="Adjust crop"
                                    style={{ width: 28, height: 28, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <Crop size={14} color={T.text900} />
                                </button>
                                <button
                                    onClick={() => remove(index)}
                                    title="Remove"
                                    style={{ width: 28, height: 28, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <X size={14} color={T.stateOut} />
                                </button>
                            </div>

                            {/* Name */}
                            <div style={{ padding: "7px 8px 8px", borderTop: `1px solid ${T.border}` }}>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, color: T.text400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px", display: "flex", alignItems: "center", gap: 3 }}>
                                    Name <Pencil size={9} />
                                </p>
                                <input
                                    value={img.name}
                                    onChange={(e) => updateName(img.id, e.target.value)}
                                    maxLength={28}
                                    placeholder="Enter name…"
                                    onFocus={e => e.target.style.borderBottomColor = T.accent}
                                    onBlur={e => e.target.style.borderBottomColor = T.border}
                                    style={{
                                        width: "100%", border: "none", borderBottom: `1px solid ${T.border}`,
                                        background: "transparent",
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                                        color: T.text900, outline: "none", padding: "2px 0",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Crop modal */}
            {editingIndex !== null && images[editingIndex] && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(26,21,16,0.6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 16,
                }}>
                    <div style={{
                        background: T.surface0, borderRadius: 6, padding: 24,
                        width: "100%", maxWidth: CONTAINER_SIZE + 228,
                        border: `1px solid ${T.border}`,
                    }}>
                        <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: T.text900, margin: "0 0 2px", letterSpacing: "-0.02em" }}>
                                Adjust Crop
                            </h2>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>
                                Drag the box to move · drag corners to resize
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                            {/* Canvas */}
                            <div style={{
                                position: "relative", flexShrink: 0,
                                width: CONTAINER_SIZE, height: CONTAINER_SIZE,
                                background: T.surface1, borderRadius: 6, overflow: "hidden",
                                border: `1px solid ${T.border}`,
                            }}>
                                <img
                                    src={images[editingIndex].original}
                                    alt="crop preview"
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                                />

                                {/* Dark surround */}
                                <div style={{
                                    position: "absolute",
                                    left: cropBox.x, top: cropBox.y,
                                    width: cropBox.width, height: cropBox.height,
                                    boxShadow: "0 0 0 9999px rgba(26,21,16,0.55)",
                                    border: `2px solid ${T.surface0}`,
                                    cursor: "move",
                                }}
                                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                                >
                                    {/* Grid lines */}
                                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                                        {[1/3, 2/3].map(f => (
                                            <div key={f} style={{ position: "absolute", left: `${f * 100}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.3)" }} />
                                        ))}
                                        {[1/3, 2/3].map(f => (
                                            <div key={f} style={{ position: "absolute", top: `${f * 100}%`, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.3)" }} />
                                        ))}
                                    </div>

                                    {/* Corner handles */}
                                    {[
                                        { type: 'nw', top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'nw-resize' },
                                        { type: 'ne', top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'ne-resize' },
                                        { type: 'sw', bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'sw-resize' },
                                        { type: 'se', bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'se-resize' },
                                    ].map(({ type, cursor, ...pos }) => (
                                        <div
                                            key={type}
                                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, type); }}
                                            style={{
                                                position: "absolute", width: HANDLE_SIZE, height: HANDLE_SIZE,
                                                background: T.surface0, border: `2px solid ${T.accent}`,
                                                borderRadius: "50%", cursor, ...pos,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Info panel */}
                            <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 16, justifyContent: "space-between" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <button
                                        onClick={applyCrop}
                                        style={{
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                            height: 40, borderRadius: 6, border: "none",
                                            background: T.accent, color: "#fff",
                                            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <Check size={16} /> Apply
                                    </button>
                                    <button
                                        onClick={() => setEditingIndex(null)}
                                        style={{
                                            height: 40, borderRadius: 6, border: `1px solid ${T.border}`,
                                            background: "transparent", color: T.text600,
                                            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
