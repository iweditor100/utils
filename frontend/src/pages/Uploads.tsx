import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
    useListUploadsQuery,
    useLazyGetDownloadUrlQuery,
    type UploadItem,
} from "../features/uploads/uploadsApi";
import { useDownloadFile } from "../hooks/useDownloadFile";
import { useZipDownload } from "../hooks/useZipDownload";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function extractFileName(key: string): string {
    const segments = key.split("/");
    return segments[segments.length - 1] || key;
}

function isPreviewable(mimeType: string): boolean {
    return (
        mimeType.startsWith("image/") ||
        mimeType.startsWith("video/") ||
        mimeType === "application/pdf"
    );
}

function mimeTypeIcon(mimeType: string): React.ReactElement {
    if (mimeType.startsWith("image/")) {
        return (
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }
    if (mimeType.startsWith("video/")) {
        return (
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
            </div>
        );
    }
    if (mimeType === "application/pdf") {
        return (
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
        );
    }
    return (
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        </div>
    );
}

function categoryBadge(category: string) {
    const colors: Record<string, string> = {
        avatar:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        document: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        video:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        testing:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
    const cls = colors[category] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
            {category}
        </span>
    );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ upload, onClose }: { upload: UploadItem; onClose: () => void }) {
    const [getUrl] = useLazyGetDownloadUrlQuery();
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fileName = extractFileName(upload.key);

    useEffect(() => {
        getUrl(upload.id)
            .unwrap()
            .then((res) => setUrl(res.data.url))
            .finally(() => setLoading(false));
    }, [upload.id, getUrl]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {mimeTypeIcon(upload.mimeType)}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate" title={fileName}>
                                {fileName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {formatBytes(upload.size)} · {formatDate(upload.createdAt)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Preview area */}
                <div className="flex-1 overflow-auto p-5 flex items-center justify-center min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            <span className="text-sm">Loading preview…</span>
                        </div>
                    ) : !url ? (
                        <p className="text-sm text-gray-400">Could not load preview.</p>
                    ) : upload.mimeType.startsWith("image/") ? (
                        <img
                            src={url}
                            alt={fileName}
                            className="max-w-full max-h-[60vh] rounded-lg object-contain"
                        />
                    ) : upload.mimeType.startsWith("video/") ? (
                        <video
                            src={url}
                            controls
                            autoPlay
                            className="max-w-full max-h-[60vh] rounded-lg"
                        />
                    ) : upload.mimeType === "application/pdf" ? (
                        <iframe
                            src={url}
                            title={fileName}
                            className="w-full rounded-lg border border-gray-100 dark:border-gray-800"
                            style={{ height: "60vh" }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// ─── Upload Row ───────────────────────────────────────────────────────────────

function UploadRow({
    upload,
    selected,
    onToggle,
    onPreview,
}: {
    upload: UploadItem;
    selected: boolean;
    onToggle: () => void;
    onPreview: () => void;
}) {
    const navigate = useNavigate();
    const { download, status: dlStatus } = useDownloadFile();
    const isDownloading = dlStatus === "fetching-url" || dlStatus === "downloading";
    const fileName = extractFileName(upload.key);
    const canPreview = isPreviewable(upload.mimeType);

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                selected
                    ? "border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/10"
                    : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700"
            }`}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 accent-brand-500 flex-shrink-0 cursor-pointer"
            />

            {mimeTypeIcon(upload.mimeType)}

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={fileName}>
                    {fileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    {categoryBadge(upload.category)}
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{upload.mimeType}</span>
                </div>
            </div>

            <div className="hidden sm:block text-right flex-shrink-0">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{formatBytes(upload.size)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(upload.createdAt)}</p>
            </div>

            {/* Preview button */}
            {canPreview && (
                <button
                    onClick={onPreview}
                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 dark:hover:text-brand-400 transition-colors"
                    title="Preview"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            )}

            {/* Annotate button — JPEG, PNG, and WebP images */}
            {upload.mimeType.startsWith("image/") && (
                <button
                    onClick={() => navigate(`/uploads/${upload.id}/annotate`)}
                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-colors"
                    title="Annotate"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            )}

            {/* Download button */}
            <button
                onClick={() => download(upload.id, fileName)}
                disabled={isDownloading}
                className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
                title="Download"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 20;

const UploadsPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = useListUploadsQuery({ page, limit: LIMIT });

    const result = data?.data;
    const uploads = result?.uploads ?? [];
    const totalPages = result?.totalPages ?? 1;
    const total = result?.total ?? 0;

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const allSelected = uploads.length > 0 && uploads.every((u) => selectedIds.has(u.id));
    const someSelected = selectedIds.size > 0;

    const toggleOne = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(uploads.map((u) => u.id)));
        }
    }, [allSelected, uploads]);

    // Clear selection when page changes
    useEffect(() => { setSelectedIds(new Set()); }, [page]);

    // Preview
    const [previewUpload, setPreviewUpload] = useState<UploadItem | null>(null);

    // Bulk download
    const [getUrl] = useLazyGetDownloadUrlQuery();
    const [bulkStatus, setBulkStatus] = useState<"idle" | "running">("idle");
    const bulkAbortRef = useRef(false);

    // ZIP download
    const { triggerZip, phase: zipPhase, workerStatus, progress: zipProgress, error: zipError, reset: resetZip } = useZipDownload();

    const handleDownloadSelected = useCallback(async () => {
        if (bulkStatus === "running") return;
        setBulkStatus("running");
        bulkAbortRef.current = false;

        const toDownload = uploads.filter((u) => selectedIds.has(u.id));

        for (const upload of toDownload) {
            if (bulkAbortRef.current) break;
            try {
                const res = await getUrl(upload.id).unwrap();
                const url = res.data.url;
                const a = document.createElement("a");
                a.href = url;
                a.download = extractFileName(upload.key);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // Small gap between downloads so the browser can process each one
                await new Promise((r) => setTimeout(r, 400));
            } catch {
                // skip failed files silently
            }
        }

        setBulkStatus("idle");
    }, [bulkStatus, uploads, selectedIds, getUrl]);

    
    // Zip feedback toasts
    useEffect(() => {
        if (zipPhase === "done") {
            toast.success("ZIP Created!");
            resetZip();
        } else if (zipPhase === "failed" && zipError) {
            toast.error(zipError);
            resetZip();
        }
    }, [zipPhase, zipError, resetZip]);


    return (
        <>
            <PageMeta title="Your Uploads" description="All files you have uploaded" />
            <PageBreadcrumb pageTitle="Your Uploads" />

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Files</h2>
                        {!isFetching && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {total} {total === 1 ? "file" : "files"} total
                            </p>
                        )}
                    </div>

                    {someSelected && (
                        <div className="flex gap-3">
                        <button
                            onClick={handleDownloadSelected}
                            disabled={bulkStatus === "running"}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {bulkStatus === "running" ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    Downloading…
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download {selectedIds.size} {selectedIds.size === 1 ? "file" : "files"}
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                const keys = uploads
                                    .filter((u) => selectedIds.has(u.id))
                                    .map((u) => u.key);
                                triggerZip(keys);
                            }}
                            disabled={zipPhase === "queuing" || zipPhase === "waiting"}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {zipPhase === "queuing" || zipPhase === "waiting" ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    {zipPhase === "queuing" ? "Queuing…" : "Zipping…"}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download as ZIP
                                </>
                            )}
                        </button>
                            
                        </div>
                    )}
                </div>

                {/* ZIP progress bar — visible during queuing and worker processing */}
                {(zipPhase === "queuing" || zipPhase === "waiting") && (
                    <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                                {zipPhase === "queuing"
                                    ? "Queuing job…"
                                    : workerStatus === "PROCESSING"
                                    ? "Building ZIP…"
                                    : "Waiting for worker…"}
                            </span>
                            {zipPhase === "waiting" && workerStatus === "PROCESSING" && (
                                <span className="font-semibold text-brand-600 dark:text-brand-400">
                                    {zipProgress}%
                                </span>
                            )}
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${zipPhase === "queuing" ? 0 : zipProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Select-all row */}
                {uploads.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded border-gray-300 accent-brand-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {allSelected ? "Deselect all" : "Select all on this page"}
                            {someSelected && !allSelected && ` · ${selectedIds.size} selected`}
                        </span>
                    </div>
                )}

                {/* Content */}
                {isFetching ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Failed to load uploads</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Please try refreshing the page</p>
                    </div>
                ) : uploads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No uploads yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Files you upload will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {uploads.map((upload) => (
                            <UploadRow
                                key={upload.id}
                                upload={upload}
                                selected={selectedIds.has(upload.id)}
                                onToggle={() => toggleOne(upload.id)}
                                onPreview={() => setPreviewUpload(upload)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview modal */}
            {previewUpload && (
                <PreviewModal
                    upload={previewUpload}
                    onClose={() => setPreviewUpload(null)}
                />
            )}

        </>
    );
};

export default UploadsPage;
