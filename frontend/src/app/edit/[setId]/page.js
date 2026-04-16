"use client";
import { API_URL } from '@/lib/api';

import { useState, useEffect, useContext, useRef } from "react";
import { imgUrl } from "@/lib/imgUrl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import { ArrowLeft, X, Plus, Loader2, Globe, Lock, Crop, Check, Pencil } from "lucide-react";
import ImageCropperIntegration from "@/app/create/ImageCropperIntegration";

const T = {
    bg: "#F7F3EE", surface0: "#FFFFFF", surface1: "#F2EDE7", surface2: "#E8E0D8",
    accent: "#D9572B", accentLight: "#F2C5B4", accentDim: "#B84422",
    text900: "#1A1510", text600: "#5C5047", text400: "#A0937F",
    border: "#DDD5CA", borderStrong: "#C4B8A8",
    stateOut: "#C0392B",
};

const MIN_CHARACTERS = 6;

export default function EditSetPage() {
    const { user } = useContext(UserContext);
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const setId = params.setId;
    const backTo = searchParams.get("from") === "create" ? "/create" : "/profile";

    const [set, setSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    // Metadata
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [showPublicModal, setShowPublicModal] = useState(false);
    const [publicAcknowledged, setPublicAcknowledged] = useState(false);
    const [coverPreview, setCoverPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);

    // Existing characters from the server (kept or removed)
    const [existingChars, setExistingChars] = useState([]);
    // New characters added via the cropper
    const [newImages, setNewImages] = useState([]);
    // Signals the cropper to auto-open crop modal (incremented each time to re-trigger)
    const [cropTrigger, setCropTrigger] = useState(null);

    const [coverOriginal, setCoverOriginal] = useState(null);
    const [coverCropOpen, setCoverCropOpen] = useState(false);
    const [coverCropBox, setCoverCropBox] = useState({ x: 50, y: 50, width: 200, height: 200 });
    const [coverDragging, setCoverDragging] = useState(null);

    const coverInputRef = useRef(null);

    const CROP_SIZE = 400;
    const COVER_OUTPUT = 400;
    const HANDLE = 12;
    const MIN_CROP = 50;

    const totalCount = existingChars.length + newImages.length;

    useEffect(() => {
        if (!setId || !user?.id) return;
        fetch(`${API_URL}/player/set/${setId}`, {
            headers: { "X-User-ID": user.id },
        })
            .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
            .then(found => {
                setSet(found);
                setName(found.name ?? "");
                setDescription(found.description ?? "");
                setIsPublic(found.public ?? false);
                setCoverPreview(found.coverImageName ? imgUrl(found.coverImageName) : null);
                setExistingChars((found.characters ?? []).map(c => ({ id: c.id, name: c.name, image: c.image })));
                setLoading(false);
            })
            .catch(() => { setError("Failed to load set."); setLoading(false); });
    }, [setId, user?.id]);

    const handleCoverChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCoverOriginal(ev.target.result);
            setCoverPreview(ev.target.result);
            setCoverFile(file);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const openCoverCrop = async () => {
        let original = coverOriginal;
        if (!original && coverPreview) {
            try {
                const res = await fetch(coverPreview);
                const blob = await res.blob();
                original = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.readAsDataURL(blob);
                });
                setCoverOriginal(original);
            } catch {
                setError("Could not load cover for cropping.");
                return;
            }
        }
        setCoverCropBox({ x: 50, y: 50, width: 200, height: 200 });
        setCoverCropOpen(true);
    };

    const handleCoverMouseDown = (e, type) => {
        e.preventDefault();
        setCoverDragging({ type, startX: e.clientX, startY: e.clientY, startBox: { ...coverCropBox } });
    };

    useEffect(() => {
        if (!coverDragging) return;
        const onMove = (e) => {
            const dx = e.clientX - coverDragging.startX;
            const dy = e.clientY - coverDragging.startY;
            let b = { ...coverCropBox };
            if (coverDragging.type === "move") {
                b.x = Math.max(0, Math.min(CROP_SIZE - b.width, coverDragging.startBox.x + dx));
                b.y = Math.max(0, Math.min(CROP_SIZE - b.height, coverDragging.startBox.y + dy));
            } else {
                const sb = coverDragging.startBox;
                if (coverDragging.type === "nw") { const s = Math.max(MIN_CROP, Math.min(sb.width - dx, sb.height - dy)); b.width = s; b.height = s; b.x = sb.x + (sb.width - s); b.y = sb.y + (sb.height - s); }
                else if (coverDragging.type === "ne") { const s = Math.max(MIN_CROP, Math.min(sb.width + dx, sb.height - dy)); b.width = s; b.height = s; b.y = sb.y + (sb.height - s); }
                else if (coverDragging.type === "sw") { const s = Math.max(MIN_CROP, Math.min(sb.width - dx, sb.height + dy)); b.width = s; b.height = s; b.x = sb.x + (sb.width - s); }
                else if (coverDragging.type === "se") { const s = Math.max(MIN_CROP, Math.min(sb.width + dx, sb.height + dy)); b.width = s; b.height = s; }
                b.x = Math.max(0, Math.min(CROP_SIZE - b.width, b.x));
                b.y = Math.max(0, Math.min(CROP_SIZE - b.height, b.y));
            }
            setCoverCropBox(b);
        };
        const onUp = () => setCoverDragging(null);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [coverDragging, coverCropBox]);

    const applyCoverCrop = () => {
        const image = new Image();
        image.onload = () => {
            const aspect = image.width / image.height;
            let rw, rh, ox, oy;
            if (aspect > 1) { rw = CROP_SIZE; rh = CROP_SIZE / aspect; ox = 0; oy = (CROP_SIZE - rh) / 2; }
            else { rh = CROP_SIZE; rw = CROP_SIZE * aspect; ox = (CROP_SIZE - rw) / 2; oy = 0; }
            const sx = (coverCropBox.x - ox) * (image.width / rw);
            const sy = (coverCropBox.y - oy) * (image.height / rh);
            const sw = coverCropBox.width * (image.width / rw);
            const sh = coverCropBox.height * (image.height / rh);
            const canvas = document.createElement("canvas");
            canvas.width = COVER_OUTPUT; canvas.height = COVER_OUTPUT;
            canvas.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, COVER_OUTPUT, COVER_OUTPUT);
            canvas.toBlob((blob) => {
                const file = new File([blob], "cover.png", { type: "image/png" });
                setCoverFile(file);
                setCoverPreview(canvas.toDataURL("image/png"));
                setCoverCropOpen(false);
            }, "image/png");
        };
        image.src = coverOriginal;
    };

    const removeExisting = (id) => setExistingChars(prev => prev.filter(c => c.id !== id));

    const cropExisting = async (char) => {
        try {
            const res = await fetch(imgUrl(char.image));
            const blob = await res.blob();
            const objectURL = URL.createObjectURL(blob);
            const file = new File([blob], `${char.name}.jpg`, { type: blob.type });
            const newEntry = {
                id: Date.now() + Math.random(),
                name: char.name,
                originalName: `${char.name}.jpg`,
                file,
                original: objectURL,
                cropped: objectURL,
                croppedFile: file,
            };
            setExistingChars(prev => prev.filter(c => c.id !== char.id));
            setNewImages(prev => {
                const updated = [...prev, newEntry];
                setCropTrigger(updated.length - 1);
                return updated;
            });
        } catch {
            setError("Could not load image for cropping.");
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await fetch(`${API_URL}/player/set/${setId}`, {
                method: "DELETE",
                headers: { "X-User-ID": user?.id },
            });
            router.push(backTo);
        } catch {
            setError("Failed to delete set.");
            setDeleting(false);
            setDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) { setError("Set name is required."); return; }
        if (totalCount < MIN_CHARACTERS) { setError(`A set must have at least ${MIN_CHARACTERS} characters.`); return; }
        const blankExisting = existingChars.findIndex(c => !c.name.trim());
        if (blankExisting !== -1) { setError(`Character ${blankExisting + 1} is missing a name.`); return; }
        const blankNew = newImages.findIndex(img => !img.name.trim());
        if (blankNew !== -1) { setError(`Character ${existingChars.length + blankNew + 1} is missing a name.`); return; }
        setSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("description", description);
        formData.append("public", isPublic);
        if (coverFile) formData.append("coverImage", coverFile);

        existingChars.forEach((c, i) => {
            formData.append(`keepCharacters[${i}][id]`, c.id);
            formData.append(`keepCharacters[${i}][name]`, c.name);
        });

        newImages.forEach((img, i) => {
            formData.append(`newCharacters[${i}][name]`, img.name);
            formData.append(`newCharacters[${i}][image]`, img.croppedFile || img.file);
        });

        try {
            const res = await fetch(`${API_URL}/player/set/${setId}`, {
                method: "PUT",
                headers: { "X-User-ID": user?.id },
                body: formData,
            });
            if (!res.ok) {
                const text = await res.text();
                setError(text || "Failed to save.");
                setSaving(false);
                return;
            }
            router.push(backTo);
        } catch {
            setError("Network error.");
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Loader2 size={24} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error && !set) return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: T.text600, marginBottom: 16 }}>{error}</p>
                <button onClick={() => router.push(backTo)} style={ghostBtn}>Back to Profile</button>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: T.bg }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <header style={{ background: T.surface0, borderBottom: `1px solid ${T.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.text900, letterSpacing: "-0.02em", margin: 0 }}>Edit Set</h1>
                    <button onClick={() => router.push(backTo)} style={ghostBtn}>
                        <ArrowLeft size={15} /> Back
                    </button>
                </div>
            </header>

            <main style={{ padding: "32px 24px", display: "flex", flexDirection: "column", gap: 32 }}>

                {/* Details */}
                <section style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <h2 style={{ ...sectionHeading, margin: 0 }}>Details</h2>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <button
                            onClick={() => deleteConfirm ? handleDelete() : setDeleteConfirm(true)}
                            onBlur={() => setTimeout(() => setDeleteConfirm(false), 200)}
                            disabled={deleting}
                            style={{ ...ghostBtn, borderColor: deleteConfirm ? T.stateOut : T.border, color: deleteConfirm ? T.stateOut : T.text600, display: "flex", alignItems: "center", gap: 6 }}
                        >
                            {deleting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
                            {deleting ? "Deleting…" : deleteConfirm ? "Confirm Delete" : "Delete Set"}
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => isPublic ? setIsPublic(false) : setShowPublicModal(true)}>
                            {isPublic ? <Globe size={15} color={T.accent} /> : <Lock size={15} color={T.text400} />}
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: isPublic ? T.accent : T.text400 }}>
                                {isPublic ? "Public" : "Private"}
                            </span>
                            <div style={{ width: 32, height: 18, borderRadius: 9, background: isPublic ? T.accent : T.border, position: "relative", transition: "background 150ms", flexShrink: 0 }}>
                                <div style={{ position: "absolute", top: 2, left: isPublic ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} />
                            </div>
                        </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <div style={{ width: 180, height: 180, borderRadius: 6, overflow: "hidden", border: `2px dashed ${T.border}`, flexShrink: 0, background: T.surface1, position: "relative" }}>
                            {coverPreview ? (
                                <>
                                    <img src={coverPreview} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    <div
                                        style={{ position: "absolute", inset: 0, background: "rgba(26,21,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0, transition: "opacity 150ms" }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >
                                        <button onClick={openCoverCrop} title="Crop" style={{ width: 32, height: 32, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Crop size={15} color={T.text900} />
                                        </button>
                                        <button onClick={() => { setCoverPreview(null); setCoverFile(null); setCoverOriginal(null); }} title="Remove" style={{ width: 32, height: 32, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <X size={15} color={T.stateOut} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div onClick={() => coverInputRef.current?.click()} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, cursor: "pointer" }}>
                                    <Plus size={24} color={T.text400} />
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.text400 }}>Cover</span>
                                </div>
                            )}
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />

                        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 30 }}>
                            <div>
                                <label style={label}>Set Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter set name" maxLength={50} style={input} />
                            </div>
                            <div>
                                <label style={label}>Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} style={{ ...input, height: "auto", resize: "none" }} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Characters */}
                <section style={card}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
                        <h2 style={{ ...sectionHeading, margin: 0 }}>Characters</h2>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: totalCount < MIN_CHARACTERS ? T.stateOut : T.text400 }}>
                            {totalCount} / {MIN_CHARACTERS} minimum
                        </span>
                    </div>

                    {/* Existing */}
                    {existingChars.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ ...label, marginBottom: 10 }}>Existing</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                                {existingChars.map(char => (
                                    <div key={char.id} style={{ position: "relative", background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
                                        <img src={imgUrl(char.image)} alt={char.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />

                                        {/* Hover overlay */}
                                        <div style={{
                                            position: "absolute", inset: 0, height: 120,
                                            background: "rgba(26,21,16,0.45)",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                            opacity: 0, transition: "opacity 150ms",
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                        >
                                            <button
                                                onClick={() => cropExisting(char)}
                                                title="Crop"
                                                style={{ width: 30, height: 30, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >
                                                <Crop size={14} color={T.text900} />
                                            </button>
                                            <button
                                                onClick={() => removeExisting(char.id)}
                                                title="Remove"
                                                style={{ width: 30, height: 30, borderRadius: 4, background: T.surface0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            >
                                                <X size={14} color={T.stateOut} />
                                            </button>
                                        </div>

                                        <div style={{ padding: "7px 8px 8px", borderTop: `1px solid ${T.border}` }}>
                                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, color: T.text400, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px", display: "flex", alignItems: "center", gap: 3 }}>Name <Pencil size={9} /></p>
                                            <input
                                                value={char.name}
                                                onChange={e => setExistingChars(prev => prev.map(c => c.id === char.id ? { ...c, name: e.target.value } : c))}
                                                maxLength={28}
                                                onFocus={e => e.target.style.borderBottomColor = T.accent}
                                                onBlur={e => e.target.style.borderBottomColor = T.border}
                                                style={{ width: "100%", border: "none", borderBottom: `1px solid ${T.border}`, background: "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: T.text900, outline: "none", padding: "2px 0", boxSizing: "border-box" }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cropper for new characters */}
                    <div>
                        {existingChars.length > 0 && (
                            <p style={{ ...label, marginBottom: 10 }}>Add New</p>
                        )}
                        <ImageCropperIntegration images={newImages} setImages={setNewImages} triggerEdit={cropTrigger} />
                    </div>

                </section>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                    {error && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.stateOut, margin: 0 }}>{error}</p>
                    )}
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={() => router.push(backTo)} style={ghostBtn} disabled={saving}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !name.trim() || totalCount < MIN_CHARACTERS}
                                style={{ ...primaryBtn, opacity: saving || !name.trim() || totalCount < MIN_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || totalCount < MIN_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            >
                                {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Public acknowledgment modal */}
            {showPublicModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,21,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: T.surface0, borderRadius: 6, padding: 28, width: "100%", maxWidth: 620, border: `1px solid ${T.border}` }}>
                        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.text900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Make this set public?</h2>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text600, margin: "0 0 20px", lineHeight: 1.6 }}>
                            Public sets are visible to all players. Before publishing, please confirm the following:
                        </p>
                        <ul style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text600, lineHeight: 1.8, paddingLeft: 18, margin: "0 0 20px" }}>
                            <li>All images are ones you own or have rights to use</li>
                            <li>No copyrighted photos (celebrities, movie stills, brand logos, etc.) without permission</li>
                            <li>No offensive, explicit, or harmful content</li>
                            <li>Images of real people must be of notable public figures</li>
                            <li>Do not upload images of friends, family, classmates, coworkers, or any private individuals</li>
                        </ul>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 24 }}>
                            <input
                                type="checkbox"
                                checked={publicAcknowledged}
                                onChange={e => setPublicAcknowledged(e.target.checked)}
                                style={{ marginTop: 2, accentColor: T.accent, width: 15, height: 15, flexShrink: 0, cursor: "pointer" }}
                            />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text900, lineHeight: 1.5 }}>
                                I confirm that my set complies with these guidelines and I take responsibility for its content.
                            </span>
                        </label>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => { setShowPublicModal(false); setPublicAcknowledged(false); }} style={ghostBtn}>Cancel</button>
                            <button
                                onClick={() => { setIsPublic(true); setShowPublicModal(false); setPublicAcknowledged(false); }}
                                disabled={!publicAcknowledged}
                                style={{ ...primaryBtn, opacity: publicAcknowledged ? 1 : 0.4, cursor: publicAcknowledged ? "pointer" : "not-allowed" }}
                            >
                                Make Public
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cover crop modal */}
            {coverCropOpen && coverOriginal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,21,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: T.surface0, borderRadius: 6, padding: 24, width: "100%", maxWidth: CROP_SIZE + 220, border: `1px solid ${T.border}` }}>
                        <div style={{ marginBottom: 20 }}>
                            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: T.text900, margin: "0 0 2px", letterSpacing: "-0.02em" }}>Crop Cover</h2>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>Drag the box to move · drag corners to resize</p>
                        </div>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                            <div style={{ position: "relative", flexShrink: 0, width: CROP_SIZE, height: CROP_SIZE, background: T.surface1, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                                <img src={coverOriginal} alt="crop" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
                                <div
                                    style={{ position: "absolute", left: coverCropBox.x, top: coverCropBox.y, width: coverCropBox.width, height: coverCropBox.height, boxShadow: "0 0 0 9999px rgba(26,21,16,0.55)", border: `2px solid ${T.surface0}`, cursor: "move" }}
                                    onMouseDown={(e) => handleCoverMouseDown(e, "move")}
                                >
                                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                                        {[1 / 3, 2 / 3].map(f => <div key={f} style={{ position: "absolute", left: `${f * 100}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.3)" }} />)}
                                        {[1 / 3, 2 / 3].map(f => <div key={f} style={{ position: "absolute", top: `${f * 100}%`, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.3)" }} />)}
                                    </div>
                                    {[
                                        { type: "nw", top: -HANDLE / 2, left: -HANDLE / 2, cursor: "nw-resize" },
                                        { type: "ne", top: -HANDLE / 2, right: -HANDLE / 2, cursor: "ne-resize" },
                                        { type: "sw", bottom: -HANDLE / 2, left: -HANDLE / 2, cursor: "sw-resize" },
                                        { type: "se", bottom: -HANDLE / 2, right: -HANDLE / 2, cursor: "se-resize" },
                                    ].map(({ type, cursor, ...pos }) => (
                                        <div key={type} onMouseDown={(e) => { e.stopPropagation(); handleCoverMouseDown(e, type); }}
                                            style={{ position: "absolute", width: HANDLE, height: HANDLE, background: T.surface0, border: `2px solid ${T.accent}`, borderRadius: "50%", cursor, ...pos }} />
                                    ))}
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
                                <button onClick={applyCoverCrop} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 6, border: "none", background: T.accent, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                                    <Check size={16} /> Apply
                                </button>
                                <button onClick={() => setCoverCropOpen(false)} style={{ height: 40, borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.text600, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const card = { background: "#FFFFFF", border: "1px solid #DDD5CA", borderRadius: 6, padding: "24px" };
const sectionHeading = { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1A1510", letterSpacing: "-0.01em", marginBottom: 16 };
const label = { display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#A0937F", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };
const input = { width: "100%", height: 40, padding: "0 12px", background: "#FFFFFF", border: "1px solid #DDD5CA", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1A1510", outline: "none", boxSizing: "border-box" };
const ghostBtn = { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", background: "transparent", border: "1px solid #DDD5CA", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#5C5047", cursor: "pointer" };
const primaryBtn = { display: "inline-flex", alignItems: "center", height: 40, padding: "0 20px", background: "#D9572B", border: "none", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" };
