"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageCropperIntegration from './ImageCropperIntegration';

export default function CreateLobbyPage({ user, setError, setLobby, getPlayers }) {
    const router = useRouter();
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectSecret, setSelectSecret] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    // Set browsing state
    const [setView, setSetView] = useState("public"); // "public", "my-sets", "create"
    const [searchQuery, setSearchQuery] = useState("");
    const [publicSets, setPublicSets] = useState([]);
    const [mySets, setMySets] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create set state
    const [newSetName, setNewSetName] = useState("");
    const [newSetDescription, setNewSetDescription] = useState("");
    const [newSetCards, setNewSetCards] = useState([]);
    const [newSetImage, setNewSetImage] = useState("");
    const [isSetPublic, setIsSetPublic] = useState(false);

    //Real set
    const [images, setImages] = useState([]);

    useEffect(() => {
        loadSets();
        loadSetsPublic();
    }, []);

    const loadSets = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("http://localhost:8080/player/set/player", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log("Fetched my sets:", data);
            setMySets(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const loadSetsPublic = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("http://localhost:8080/player/set/public", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }
            console.log("Fetched public sets:", data);
            setPublicSets(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const handleCreateLobby = async () => {
        if (!selectedSet) {
            setError("Please select a set");
            return;
        }

        setError(null);

        const randomizeSecret = !selectSecret;
        console.log("randomize Sec:", randomizeSecret)
        try {
            console.log(selectedSet.id);
            const res = await fetch("http://localhost:8080/lobby/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID": user?.id,
                },
                body: JSON.stringify({
                    setId: selectedSet.id,
                    isPrivate,
                    randomizeSecret,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            setLobby(data);
            console.log("Lobby created:", data);
            router.push(`/lobby/${data.id}`);
        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const handleCreateSet = async () => {
        setSetView("my-sets");
        console.log("Original cards:", images);

        // Create FormData instead of JSON
        const formData = new FormData();
        formData.append("name", newSetName);
        formData.append("description", newSetDescription);
        formData.append("public", isSetPublic);
        formData.append("coverImage", newSetImage?.file || ""); // optional cover image

        // Append each character
        images.forEach((card, index) => {
            formData.append(`characters[${index}][name]`, card.name);
            formData.append(`characters[${index}][image]`, card.croppedFile || card.file);
        });

        console.log(Array.from(formData.entries()));

        try {
            const res = await fetch("http://localhost:8080/player/set/create", {
                method: "POST",
                headers: {
                    "X-User-ID": user?.id,
                },
                body: formData,
            });

            let data;
            try {
                data = await res.json();
            } catch {
                data = await res.text();
            }
            loadSets();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

        } catch (err) {
            console.error(err);
            setError("Network error");
        }
    };

    const filteredSets = () => {
        const sets = setView === "public" ? publicSets : mySets;
        if (!searchQuery) return sets;

        return sets.filter(set =>
            set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            set.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create New Lobby</h1>
                        <p className="text-sm text-gray-300 mt-1">Configure your game and select a card set</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition text-gray-300 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Left Panel - Set Selection */}
                <div className="flex-1 bg-slate-900/50 overflow-y-auto">
                    <div className="max-w-5xl mx-auto p-6">
                        {/* Tab Navigation */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setSetView("public")}
                                className={`px-4 py-2 rounded-lg font-medium transition ${setView === "public"
                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                                    : "text-gray-300 hover:bg-slate-700/50 hover:text-white"
                                    }`}
                            >
                                Public Sets
                            </button>
                            <button
                                onClick={() => setSetView("my-sets")}
                                className={`px-4 py-2 rounded-lg font-medium transition ${setView === "my-sets"
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                    : "text-gray-300 hover:bg-slate-700/50 hover:text-white"
                                    }`}
                            >
                                My Sets
                            </button>
                            <button
                                onClick={() => setSetView("create")}
                                className={`px-4 py-2 rounded-lg font-medium transition ${setView === "create"
                                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                                    : "text-gray-300 hover:bg-slate-700/50 hover:text-white"
                                    }`}
                            >
                                + Create New Set
                            </button>
                        </div>

                        {/* Search Bar */}
                        {setView !== "create" && (
                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search sets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-3 pl-12 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                                    />
                                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        {setView === "create" ? (
                            // Create New Set Form
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-6">
                                <h2 className="text-xl font-bold text-white mb-4">Create Custom Set</h2>

                                <div className="space-y-4">
                                    <div className="flex gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Set Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newSetName}
                                                    onChange={(e) => setNewSetName(e.target.value)}
                                                    placeholder="Enter set name"
                                                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={newSetDescription}
                                                    onChange={(e) => setNewSetDescription(e.target.value)}
                                                    placeholder="Describe your set"
                                                    rows={3}
                                                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="w-64">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Cover Image (Optional)
                                            </label>
                                            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition h-full flex items-center justify-center bg-slate-800/30">
                                                <input
                                                    type="file"
                                                    id="cover-upload"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                setNewSetImage({
                                                                    file,
                                                                    preview: event.target.result,
                                                                });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                {newSetImage ? (
                                                    <div className="relative">
                                                        <img
                                                            src={newSetImage.preview}
                                                            alt="Cover preview"
                                                            className="w-full h-48 object-cover rounded-lg border-2 border-slate-600"
                                                        />
                                                        <button
                                                            onClick={() => setNewSetImage("")}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-lg"
                                                            title="Remove cover image"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label htmlFor="cover-upload" className="cursor-pointer">
                                                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-gray-400 text-sm mb-2">Click to upload</p>
                                                        <span className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition inline-block text-sm">
                                                            Upload Cover
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <ImageCropperIntegration
                                            images={images}
                                            setImages={setImages}
                                        />
                                    </div>

                                    <div>
                                        <label className="flex items-center justify-between p-4 border-2 border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/30 transition">
                                            <div>
                                                <span className="block text-sm font-semibold text-gray-200">
                                                    Public Set
                                                </span>
                                                <span className="block text-xs text-gray-400 mt-1">
                                                    Anyone can view this set
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSetPublic}
                                                onChange={(e) => setIsSetPublic(e.target.checked)}
                                                className="w-5 h-5 text-purple-500 rounded focus:ring-purple-500 bg-slate-700 border-slate-600"
                                            />
                                        </label>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setSetView("my-sets")}
                                            className="flex-1 px-4 py-2 bg-slate-700 text-gray-200 rounded-lg hover:bg-slate-600 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateSet}
                                            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition shadow-lg shadow-purple-500/30"
                                        >
                                            Create Set
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Sets Grid
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {loading ? (
                                    <div className="col-span-full text-center py-12 text-gray-400">
                                        Loading sets...
                                    </div>
                                ) : filteredSets().length === 0 ? (
                                    <div className="col-span-full text-center py-12 text-gray-400">
                                        No sets found
                                    </div>
                                ) : (
                                    filteredSets().map((set) => (
                                        <div
                                            key={set.id}
                                            onClick={() => setSelectedSet(set)}
                                            className={`bg-slate-800/50 backdrop-blur-sm rounded-lg overflow-hidden cursor-pointer transition border-2 hover:scale-105 ${selectedSet?.id === set.id
                                                ? "border-emerald-500 shadow-lg shadow-emerald-500/30"
                                                : "border-slate-700 hover:border-slate-600"
                                                }`}
                                        >
                                            {/* Image */}
                                            <div className="relative h-40 bg-slate-700/50 overflow-hidden">
                                                <img
                                                    src={`http://localhost:8080` + set.coverImageName}
                                                    alt={set.coverImageName}
                                                    className="w-full h-full object-cover"
                                                />
                                                {selectedSet?.id === set.id && (
                                                    <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-4">
                                                <h3 className="font-bold text-white text-lg mb-1">{set.name}</h3>
                                                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{set.description}</p>
                                                <div className="flex items-center justify-between text-sm">
                                                    {set.creator && (
                                                        <span className="text-gray-500 text-xs">by {set.creator}</span>
                                                    )}
                                                    {set.rating && (
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                            <span className="text-gray-300 font-medium">{set.rating}</span>
                                                        </div>
                                                    )}
                                                    {set.isPublic !== undefined && (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${set.isPublic ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-gray-300"
                                                            }`}>
                                                            {set.isPublic ? "Public" : "Private"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Game Settings */}
                {setView !== "create" && (
                    <div className="w-96 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Game Settings</h2>

                            {/* Selected Set Preview */}
                            {selectedSet && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg overflow-hidden mb-6">
                                    <img
                                        src={`http://localhost:8080` + selectedSet.coverImageName}
                                        alt={selectedSet.coverImageName}
                                        className="w-full h-32 object-cover"
                                    />
                                    <div className="p-3">
                                        <p className="text-xs text-emerald-400 font-medium mb-1">SELECTED SET</p>
                                        <p className="font-bold text-white">{selectedSet.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Randomize Secret Character */}
                                <div>
                                    <label className="flex items-center justify-between p-4 border-2 border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/30 transition">
                                        <div>
                                            <span className="block text-sm font-semibold text-gray-200">
                                                Select Secret Character
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectSecret}
                                            onChange={(e) => setSelectSecret(e.target.checked)}
                                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 bg-slate-700 border-slate-600"
                                        />
                                    </label>
                                </div>

                                {/* Privacy Toggle */}
                                <div>
                                    <label className="flex items-center justify-between p-4 border-2 border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/30 transition">
                                        <div>
                                            <span className="block text-sm font-semibold text-gray-200">
                                                Private Lobby
                                            </span>
                                            <span className="block text-xs text-gray-400 mt-1">
                                                Only players with the link or code can join
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 bg-slate-700 border-slate-600"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={handleCreateLobby}
                                disabled={!selectedSet}
                                className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold transition shadow-lg ${selectedSet
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30"
                                    : "bg-slate-700 text-gray-500 cursor-not-allowed"
                                    }`}
                            >
                                Create Lobby
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}