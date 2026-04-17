"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";

interface ImageUploadWithCropProps {
    currentImageUrl?: string | null;
    onUploadComplete: (url: string) => void;
}

interface CropState {
    x: number;
    y: number;
    size: number;
}

export default function ImageUploadWithCrop({ currentImageUrl, onUploadComplete }: ImageUploadWithCropProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 0 });
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ mx: 0, my: 0, cx: 0, cy: 0 });
    const [resizeStart, setResizeStart] = useState({ my: 0, size: 0 });
    const [uploading, setUploading] = useState(false);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure the container so we can place the canvas correctly
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [previewSrc]);

    // Draw canvas overlay whenever crop or image changes
    useEffect(() => {
        if (!previewSrc || !canvasRef.current || !containerSize.w) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = containerSize.w;
        canvas.height = containerSize.h;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cut out the crop square (clear it)
        ctx.clearRect(crop.x, crop.y, crop.size, crop.size);

        // Bright border around crop
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 2;
        ctx.strokeRect(crop.x, crop.y, crop.size, crop.size);

        // Corner handles
        const handleSize = 10;
        const corners = [
            [crop.x, crop.y],
            [crop.x + crop.size - handleSize, crop.y],
            [crop.x, crop.y + crop.size - handleSize],
            [crop.x + crop.size - handleSize, crop.y + crop.size - handleSize],
        ];
        ctx.fillStyle = "#FFF";
        corners.forEach(([cx, cy]) => ctx.fillRect(cx, cy, handleSize, handleSize));

        // Resize handle at bottom-right (visible circle)
        ctx.beginPath();
        ctx.arc(crop.x + crop.size, crop.y + crop.size, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF";
        ctx.fill();

        // Rule-of-thirds grid inside crop
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        [1 / 3, 2 / 3].forEach((f) => {
            ctx.beginPath();
            ctx.moveTo(crop.x + crop.size * f, crop.y);
            ctx.lineTo(crop.x + crop.size * f, crop.y + crop.size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(crop.x, crop.y + crop.size * f);
            ctx.lineTo(crop.x + crop.size, crop.y + crop.size * f);
            ctx.stroke();
        });
    }, [crop, previewSrc, containerSize]);

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            setPreviewSrc(src);

            const img = new Image();
            img.onload = () => {
                imgRef.current = img;
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    // When the preview mounts, initialize crop once containerSize is known
    useEffect(() => {
        if (!previewSrc || !containerSize.w || !containerSize.h) return;
        const size = Math.min(containerSize.w, containerSize.h) * 0.7;
        setCrop({
            x: (containerSize.w - size) / 2,
            y: (containerSize.h - size) / 2,
            size,
        });
    }, [previewSrc, containerSize.w, containerSize.h]);

    // ── Pointer events ──────────────────────────────────────────────
    function isOnResizeHandle(px: number, py: number) {
        const dx = px - (crop.x + crop.size);
        const dy = py - (crop.y + crop.size);
        return Math.sqrt(dx * dx + dy * dy) <= 14;
    }

    function isInsideCrop(px: number, py: number) {
        return px >= crop.x && px <= crop.x + crop.size && py >= crop.y && py <= crop.y + crop.size;
    }

    function relativePos(e: React.PointerEvent) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return { px: e.clientX - rect.left, py: e.clientY - rect.top };
    }

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const { px, py } = relativePos(e);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        if (isOnResizeHandle(px, py)) {
            setResizing(true);
            setResizeStart({ my: py, size: crop.size });
        } else if (isInsideCrop(px, py)) {
            setDragging(true);
            setDragStart({ mx: px, my: py, cx: crop.x, cy: crop.y });
        }
    }, [crop]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const { px, py } = relativePos(e);

        if (resizing) {
            const delta = py - resizeStart.my;
            const newSize = Math.max(60, Math.min(
                resizeStart.size + delta,
                containerSize.w - crop.x,
                containerSize.h - crop.y,
            ));
            setCrop(c => ({ ...c, size: newSize }));
        } else if (dragging) {
            const dx = px - dragStart.mx;
            const dy = py - dragStart.my;
            const newX = Math.max(0, Math.min(dragStart.cx + dx, containerSize.w - crop.size));
            const newY = Math.max(0, Math.min(dragStart.cy + dy, containerSize.h - crop.size));
            setCrop(c => ({ ...c, x: newX, y: newY }));
        }
    }, [dragging, resizing, dragStart, resizeStart, containerSize, crop.size, crop.x, crop.y]);

    const onPointerUp = useCallback(() => {
        setDragging(false);
        setResizing(false);
    }, []);

    // ── Crop & upload ────────────────────────────────────────────────
    async function handleCropAndUpload() {
        if (!imgRef.current || !previewSrc) return;
        setUploading(true);

        const img = imgRef.current;
        const scaleX = img.naturalWidth / containerSize.w;
        const scaleY = img.naturalHeight / containerSize.h;

        const sx = crop.x * scaleX;
        const sy = crop.y * scaleY;
        const sw = crop.size * scaleX;
        const sh = crop.size * scaleY;

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = 600;
        outputCanvas.height = 600;
        const ctx = outputCanvas.getContext("2d")!;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 600, 600);

        outputCanvas.toBlob(async (blob) => {
            if (!blob) { setUploading(false); return; }

            const fileName = `${Date.now()}.jpg`;
            const { error } = await supabase.storage
                .from("menu-images")
                .upload(fileName, blob, { contentType: "image/jpeg" });

            if (error) {
                alert("Upload failed");
                setUploading(false);
                return;
            }

            const { data } = supabase.storage.from("menu-images").getPublicUrl(fileName);
            onUploadComplete(data.publicUrl);
            setPreviewSrc(null);
            setUploading(false);
        }, "image/jpeg", 0.92);
    }

    function handleCancel() {
        setPreviewSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div>
            {/* Upload trigger area */}
            {!previewSrc && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        maxWidth: 220,
                        border: "2px dashed #D1C4B5",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        cursor: "pointer",
                        background: currentImageUrl ? "none" : "rgba(59,31,0,0.03)",
                        overflow: "hidden",
                        position: "relative",
                        transition: "border-color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#3B1F00")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#D1C4B5")}
                >
                    {currentImageUrl ? (
                        <>
                            <img
                                src={currentImageUrl}
                                alt="Current"
                                style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }}
                            />
                            <div style={{
                                position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                                display: "flex", flexDirection: "column", alignItems: "center",
                                justifyContent: "center", gap: 6, opacity: 0, transition: "opacity 0.2s",
                            }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                            >
                                <span style={{ fontSize: 22 }}>🔄</span>
                                <span style={{ fontSize: 11, color: "#FFF", fontWeight: 600 }}>Replace</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: 28 }}>📷</span>
                            <span style={{ fontSize: 11, color: "#888", fontWeight: 600, fontFamily: "Poppins, sans-serif" }}>Upload Image</span>
                        </>
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onFileChange}
            />

            {/* Crop Modal */}
            {previewSrc && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(0,0,0,0.75)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 16,
                }}>
                    <div style={{
                        background: "#1A1A1A", borderRadius: 16, overflow: "hidden",
                        width: "100%", maxWidth: 540,
                        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                        display: "flex", flexDirection: "column",
                    }}>
                        {/* Header */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #2A2A2A", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 16 }}>✂️</span>
                            <span style={{ color: "#FFF", fontWeight: 700, fontSize: 14, fontFamily: "Poppins, sans-serif" }}>Crop Image</span>
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "#666", fontFamily: "Poppins, sans-serif" }}>Drag to move · Resize from corner</span>
                        </div>

                        {/* Crop area */}
                        <div
                            ref={containerRef}
                            style={{ position: "relative", width: "100%", maxHeight: 420, overflow: "hidden", background: "#000", cursor: dragging ? "grabbing" : resizing ? "nwse-resize" : "default" }}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                        >
                            <img
                                src={previewSrc}
                                alt="Preview"
                                draggable={false}
                                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }}
                            />
                            <canvas
                                ref={canvasRef}
                                style={{ position: "absolute", inset: 0, touchAction: "none" }}
                            />
                        </div>

                        {/* Footer buttons */}
                        <div style={{ padding: "14px 20px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #2A2A2A" }}>
                            <button
                                onClick={handleCancel}
                                style={{
                                    padding: "8px 20px", borderRadius: 8, border: "1px solid #333",
                                    background: "transparent", color: "#AAA", fontSize: 13,
                                    fontWeight: 600, fontFamily: "Poppins, sans-serif", cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropAndUpload}
                                disabled={uploading}
                                style={{
                                    padding: "8px 24px", borderRadius: 8, border: "none",
                                    background: uploading ? "#555" : "#3B1F00", color: "#FFF",
                                    fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif",
                                    cursor: uploading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", gap: 8,
                                }}
                            >
                                {uploading ? (
                                    <>
                                        <span style={{ width: 14, height: 14, border: "2px solid #FFF", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                                        Uploading…
                                    </>
                                ) : "Crop & Upload"}
                            </button>
                        </div>
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
}