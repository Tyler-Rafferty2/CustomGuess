"use client";

import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import { ArrowLeft, X, Plus, Loader2, Globe, Lock, Crop } from "lucide-react";
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
    const setId = params.setId;

    const [set, setSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Metadata
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [coverPreview, setCoverPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);

    // Existing characters from the server (kept or removed)
    const [existingChars, setExistingChars] = useState([]);
    // New characters added via the cropper
    const [newImages, setNewImages] = useState([]);
    // Signals the cropper to auto-open crop modal (incremented each time to re-trigger)
    const [cropTrigger, setCropTrigger] = useState(null);

    const coverInputRef = useRef(null);

    const totalCount = existingChars.length + newImages.length;

    useEffect(() => {
        if (!setId || !user?.id) return;
        fetch(`http://localhost:8080/player/set/player`, {
            headers: { "X-User-ID": user.id },
        })
            .then(r => r.json())
            .then(data => {
                const found = Array.isArray(data) ? data.find(s => s.id === setId) : null;
                if (!found) { setError("Set not found."); setLoading(false); return; }
                setSet(found);
                setName(found.name ?? "");
                setDescription(found.description ?? "");
                setIsPublic(found.public ?? false);
                setCoverPreview(found.coverImageName ? `http://localhost:8080${found.coverImageName}` : null);
                setExistingChars((found.characters ?? []).map(c => ({ id: c.id, name: c.name, image: c.image })));
                setLoading(false);
            })
            .catch(() => { setError("Failed to load set."); setLoading(false); });
    }, [setId, user?.id]);

    const handleCoverChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const removeExisting = (id) => setExistingChars(prev => prev.filter(c => c.id !== id));

    const cropExisting = async (char) => {
        try {
            const res = await fetch(`http://localhost:8080${char.image}`);
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

    const handleSave = async () => {
        if (!name.trim()) { setError("Set name is required."); return; }
        if (totalCount < MIN_CHARACTERS) { setError(`A set must have at least ${MIN_CHARACTERS} characters.`); return; }
        setSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("description", description);
        formData.append("public", isPublic);
        if (coverFile) formData.append("coverImage", coverFile);

        existingChars.forEach(c => formData.append("keepCharacterIds[]", c.id));

        newImages.forEach((img, i) => {
            formData.append(`newCharacters[${i}][name]`, img.name);
            formData.append(`newCharacters[${i}][image]`, img.croppedFile || img.file);
        });

        try {
            const res = await fetch(`http://localhost:8080/player/set/${setId}`, {
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
            router.push("/profile");
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
                <button onClick={() => router.push("/profile")} style={ghostBtn}>Back to Profile</button>
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
                <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.text900, letterSpacing: "-0.02em", margin: 0 }}>Edit Set</h1>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: "2px 0 0" }}>{set?.name}</p>
                    </div>
                    <button onClick={() => router.push("/profile")} style={ghostBtn}>
                        <ArrowLeft size={15} /> Back
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 32 }}>

                {error && (
                    <div style={{ background: T.surface0, border: `1px solid ${T.stateOut}`, borderRadius: 6, padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.stateOut }}>
                        {error}
                    </div>
                )}

                {/* Details */}
                <section style={card}>
                    <h2 style={sectionHeading}>Details</h2>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <div
                            onClick={() => coverInputRef.current?.click()}
                            style={{ width: 120, height: 120, borderRadius: 6, overflow: "hidden", border: `2px dashed ${T.border}`, cursor: "pointer", flexShrink: 0, background: T.surface1 }}
                        >
                            {coverPreview
                                ? <img src={coverPreview} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                                    <Plus size={20} color={T.text400} />
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.text400 }}>Cover</span>
                                </div>
                            }
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />

                        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <label style={label}>Set Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter set name" style={input} />
                            </div>
                            <div>
                                <label style={label}>Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} style={{ ...input, height: "auto", resize: "vertical" }} />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => setIsPublic(v => !v)}
                        style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: T.surface1, borderRadius: 6, cursor: "pointer", border: `1px solid ${T.border}` }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {isPublic ? <Globe size={16} color={T.accent} /> : <Lock size={16} color={T.text400} />}
                            <div>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: T.text900, margin: 0 }}>
                                    {isPublic ? "Public" : "Private"}
                                </p>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.text400, margin: 0 }}>
                                    {isPublic ? "Anyone can use this set in games" : "Only you can use this set"}
                                </p>
                            </div>
                        </div>
                        <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? T.accent : T.border, position: "relative", transition: "background 150ms", flexShrink: 0 }}>
                            <div style={{ position: "absolute", top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} />
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
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                                {existingChars.map(char => (
                                    <div key={char.id} style={{ position: "relative", background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
                                        <img src={`http://localhost:8080${char.image}`} alt={char.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />

                                        {/* Hover overlay */}
                                        <div style={{
                                            position: "absolute", inset: 0, height: 90,
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

                                        <div style={{ padding: "5px 7px" }}>
                                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: T.text900 }}>{char.name}</span>
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
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button onClick={() => router.push("/profile")} style={ghostBtn} disabled={saving}>
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
            </main>
        </div>
    );
}

const card = { background: "#FFFFFF", border: "1px solid #DDD5CA", borderRadius: 6, padding: "24px" };
const sectionHeading = { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1A1510", letterSpacing: "-0.01em", marginBottom: 16 };
const label = { display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#A0937F", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };
const input = { width: "100%", height: 40, padding: "0 12px", background: "#FFFFFF", border: "1px solid #DDD5CA", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1A1510", outline: "none", boxSizing: "border-box" };
const ghostBtn = { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", background: "transparent", border: "1px solid #DDD5CA", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#5C5047", cursor: "pointer" };
const primaryBtn = { display: "inline-flex", alignItems: "center", height: 40, padding: "0 20px", background: "#D9572B", border: "none", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" };
