"use client";

import { useState, useRef, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserContext } from "@/context/UserContext";
import { ArrowLeft, Plus, Loader2, Globe, Lock } from "lucide-react";
import ImageCropperIntegration from "@/app/create/ImageCropperIntegration";

const T = {
    bg: "#F7F3EE", surface0: "#FFFFFF", surface1: "#F2EDE7",
    accent: "#D9572B", accentDim: "#B84422",
    text900: "#1A1510", text600: "#5C5047", text400: "#A0937F",
    border: "#DDD5CA", stateOut: "#C0392B",
};

const MIN_CHARACTERS = 6;

export default function NewSetPage() {
    const { user } = useContext(UserContext);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [coverPreview, setCoverPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [images, setImages] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const coverInputRef = useRef(null);

    const handleCoverChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!name.trim()) { setError("Set name is required."); return; }
        if (images.length < MIN_CHARACTERS) { setError(`A set must have at least ${MIN_CHARACTERS} characters.`); return; }
        setSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("description", description);
        formData.append("public", isPublic);
        if (coverFile) formData.append("coverImage", coverFile);

        images.forEach((img, i) => {
            formData.append(`characters[${i}][name]`, img.name);
            formData.append(`characters[${i}][image]`, img.croppedFile || img.file);
        });

        try {
            const res = await fetch("http://localhost:8080/player/set/create", {
                method: "POST",
                headers: { "X-User-ID": user?.id },
                body: formData,
            });
            if (!res.ok) {
                const text = await res.text();
                setError(text || "Failed to create set.");
                setSaving(false);
                return;
            }
            searchParams.get("from") ? router.back() : router.push("/profile");
        } catch {
            setError("Network error.");
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: T.bg }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <header style={{ background: T.surface0, borderBottom: `1px solid ${T.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.text900, letterSpacing: "-0.02em", margin: 0 }}>New Set</h1>
                    <button onClick={() => searchParams.get("from") ? router.back() : router.push("/profile")} style={ghostBtn}>
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
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: images.length < MIN_CHARACTERS ? T.stateOut : T.text400 }}>
                            {images.length} / {MIN_CHARACTERS} minimum
                        </span>
                    </div>
                    <ImageCropperIntegration images={images} setImages={setImages} />
                </section>

                {/* Actions */}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button onClick={() => searchParams.get("from") ? router.back() : router.push("/profile")} style={ghostBtn} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim() || images.length < MIN_CHARACTERS}
                        style={{ ...primaryBtn, opacity: saving || !name.trim() || images.length < MIN_CHARACTERS ? 0.5 : 1, cursor: saving || !name.trim() || images.length < MIN_CHARACTERS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                        {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                        {saving ? "Creating…" : "Create Set"}
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
