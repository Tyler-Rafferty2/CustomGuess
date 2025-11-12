import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Move } from 'lucide-react';

export default function ImageCropperIntegration({ images, setImages }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 200, height: 200 });
    const [dragging, setDragging] = useState(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    const TARGET_SIZE = 800;
    const HANDLE_SIZE = 12;

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImages(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        originalName: file.name,
                        file,
                        original: event.target.result,
                        width: img.width,
                        height: img.height,
                        cropped: null,
                        isEditing: false
                    }]);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const startEdit = (index) => {
        console.log('Starting edit for index:', index);
        console.log('Image data:', images[index]);
        setEditingIndex(index);
        setCropBox({ x: 50, y: 50, width: 200, height: 200 });
    };

    const handleMouseDown = (e, type) => {
        e.preventDefault();
        setDragging({ type, startX: e.clientX, startY: e.clientY, startBox: { ...cropBox } });
    };

    const handleMouseMove = (e) => {
        if (!dragging || !containerRef.current) return;

        const deltaX = e.clientX - dragging.startX;
        const deltaY = e.clientY - dragging.startY;

        let newBox = { ...cropBox };

        if (dragging.type === 'move') {
            newBox.x = Math.max(0, Math.min(400 - cropBox.width, dragging.startBox.x + deltaX));
            newBox.y = Math.max(0, Math.min(400 - cropBox.height, dragging.startBox.y + deltaY));
        } else if (dragging.type === 'nw') {
            const newWidth = Math.max(50, dragging.startBox.width - deltaX);
            const newHeight = Math.max(50, dragging.startBox.height - deltaY);
            const size = Math.min(newWidth, newHeight);
            newBox.width = size;
            newBox.height = size;
            newBox.x = dragging.startBox.x + (dragging.startBox.width - size);
            newBox.y = dragging.startBox.y + (dragging.startBox.height - size);
        } else if (dragging.type === 'ne') {
            const newWidth = Math.max(50, dragging.startBox.width + deltaX);
            const newHeight = Math.max(50, dragging.startBox.height - deltaY);
            const size = Math.min(newWidth, newHeight);
            newBox.width = size;
            newBox.height = size;
            newBox.y = dragging.startBox.y + (dragging.startBox.height - size);
        } else if (dragging.type === 'sw') {
            const newWidth = Math.max(50, dragging.startBox.width - deltaX);
            const newHeight = Math.max(50, dragging.startBox.height + deltaY);
            const size = Math.min(newWidth, newHeight);
            newBox.width = size;
            newBox.height = size;
            newBox.x = dragging.startBox.x + (dragging.startBox.width - size);
        } else if (dragging.type === 'se') {
            const newWidth = Math.max(50, dragging.startBox.width + deltaX);
            const newHeight = Math.max(50, dragging.startBox.height + deltaY);
            const size = Math.min(newWidth, newHeight);
            newBox.width = size;
            newBox.height = size;
        }

        newBox.x = Math.max(0, Math.min(400 - newBox.width, newBox.x));
        newBox.y = Math.max(0, Math.min(400 - newBox.height, newBox.y));

        setCropBox(newBox);
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, cropBox]);

    const applyCrop = () => {
        const img = images[editingIndex];
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext('2d');

        const image = new Image();
        image.onload = () => {
            const containerSize = 400;
            const imageAspect = image.width / image.height;

            let renderedWidth, renderedHeight, offsetX, offsetY;

            if (imageAspect > 1) {
                renderedWidth = containerSize;
                renderedHeight = containerSize / imageAspect;
                offsetX = 0;
                offsetY = (containerSize - renderedHeight) / 2;
            } else {
                renderedHeight = containerSize;
                renderedWidth = containerSize * imageAspect;
                offsetX = (containerSize - renderedWidth) / 2;
                offsetY = 0;
            }

            const cropXRelative = cropBox.x - offsetX;
            const cropYRelative = cropBox.y - offsetY;

            const scaleX = image.width / renderedWidth;
            const scaleY = image.height / renderedHeight;

            const sourceX = cropXRelative * scaleX;
            const sourceY = cropYRelative * scaleY;
            const sourceWidth = cropBox.width * scaleX;
            const sourceHeight = cropBox.height * scaleY;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                TARGET_SIZE,
                TARGET_SIZE
            );

            canvas.toBlob((blob) => {
                const croppedFile = new File([blob], img.originalName, { type: 'image/png' });
                const croppedDataUrl = canvas.toDataURL('image/png');

                setImages(prev => prev.map((item, idx) =>
                    idx === editingIndex
                        ? { ...item, cropped: croppedDataUrl, croppedFile }
                        : item
                ));
                setEditingIndex(null);
            }, 'image/png');
        };
        image.src = img.original;
    };

    const cancelEdit = () => {
        setEditingIndex(null);
    };

    const deleteImage = (index) => {
        setImages(prev => prev.filter((_, idx) => idx !== index));
        if (editingIndex === index) {
            setEditingIndex(null);
        }
    };

    const updateImageName = (id, newName) => {
        setImages(prev => prev.map(img =>
            img.id === id ? { ...img, name: newName } : img
        ));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Image Cropper</h1>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
                <input
                    ref={fileInputRef}
                    type="file"
                    id="card-upload"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <label htmlFor="card-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 mb-2">Drop card images here or click to browse</p>
                    <span className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-block">
                        Upload Images
                    </span>
                </label>
            </div>

            {/* Display uploaded images */}
            {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                    {images.map((card, index) => (
                        <div key={card.id} className="relative group">
                            <div className="w-full aspect-square">
                                <img
                                    src={card.cropped || card.original}
                                    alt={card.name}
                                    className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => startEdit(index)}
                                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg"
                                    title="Crop"
                                >
                                    ✂️
                                </button>
                                <button
                                    onClick={() => deleteImage(index)}
                                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                                    title="Remove"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Not cropped indicator */}
                            {!card.cropped && (
                                <div className="absolute bottom-1 left-1 right-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded text-center">
                                    Not cropped
                                </div>
                            )}

                            {/* Editable Name */}
                            {card.isEditing ? (
                                <input
                                    type="text"
                                    value={card.name}
                                    onChange={(e) => updateImageName(card.id, e.target.value)}
                                    onBlur={() => setImages(prev => prev.map(c =>
                                        c.id === card.id ? { ...c, isEditing: false } : c
                                    ))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setImages(prev => prev.map(c =>
                                                c.id === card.id ? { ...c, isEditing: false } : c
                                            ));
                                        }
                                    }}
                                    autoFocus
                                    className="w-full text-xs text-gray-800 mt-1 px-2 py-1 border border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            ) : (
                                <p
                                    onClick={() => setImages(prev => prev.map(c =>
                                        c.id === card.id ? { ...c, isEditing: true } : c
                                    ))}
                                    className="text-xs text-gray-600 mt-1 truncate cursor-pointer hover:text-gray-800 hover:bg-gray-100 px-1 py-0.5 rounded"
                                    title="Click to edit"
                                >
                                    {card.name}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {images.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                    {images.length} card{images.length !== 1 ? 's' : ''} uploaded
                    {images.filter(img => !img.cropped).length > 0 && (
                        <span className="text-yellow-600 ml-2">
                            ({images.filter(img => !img.cropped).length} not cropped)
                        </span>
                    )}
                </p>
            )}

            {/* Crop Modal */}
            {editingIndex !== null && images[editingIndex] && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full">
                        <h2 className="text-xl font-bold mb-4">Crop Image - Drag corners to resize, drag center to move</h2>

                        <div className="flex gap-6 mb-4">
                            <div
                                ref={containerRef}
                                className="relative bg-gray-100 flex-shrink-0"
                                style={{ width: 400, height: 400 }}
                            >
                                <img
                                    src={images[editingIndex].original}
                                    alt="Crop preview"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    onError={(e) => console.error('Image failed to load', e)}
                                    onLoad={() => console.log('Image loaded successfully')}
                                />

                                <div
                                    className="absolute border-2 border-white shadow-lg cursor-move"
                                    style={{
                                        left: cropBox.x,
                                        top: cropBox.y,
                                        width: cropBox.width,
                                        height: cropBox.height,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                                >
                                    <div className="absolute inset-0 bg-transparent" />

                                    {/* Corner handles */}
                                    {['nw', 'ne', 'sw', 'se'].map(corner => (
                                        <div
                                            key={corner}
                                            className={`absolute bg-white border-2 border-blue-500 rounded-full cursor-${corner}-resize`}
                                            style={{
                                                width: HANDLE_SIZE,
                                                height: HANDLE_SIZE,
                                                [corner.includes('n') ? 'top' : 'bottom']: -HANDLE_SIZE / 2,
                                                [corner.includes('w') ? 'left' : 'right']: -HANDLE_SIZE / 2,
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleMouseDown(e, corner);
                                            }}
                                        />
                                    ))}

                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <Move size={24} className="text-white opacity-70" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h3 className="font-semibold mb-2">How to use:</h3>
                                    <ul className="text-sm space-y-1 text-gray-700">
                                        <li>• Drag the white box to move it</li>
                                        <li>• Drag any corner to resize (stays square)</li>
                                        <li>• The selected area will be your final image</li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-semibold mb-2">Debug Info:</h3>
                                    <p className="text-xs text-gray-600">Editing Index: {editingIndex}</p>
                                    <p className="text-xs text-gray-600">Image Name: {images[editingIndex].name}</p>
                                    <p className="text-xs text-gray-600 truncate">Image Source: {images[editingIndex].original.substring(0, 50)}...</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelEdit}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyCrop}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                <Check size={18} />
                                Apply Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}