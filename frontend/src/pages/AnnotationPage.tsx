import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLazyGetDownloadUrlQuery } from "../features/uploads/uploadsApi";
import { AnnotationCanvas } from "../features/annotations/components/AnnotationCanvas";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";

export default function AnnotationPage() {
    const { uploadId } = useParams<{ uploadId: string }>();
    const navigate = useNavigate();

    const [getUrl] = useLazyGetDownloadUrlQuery();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!uploadId) return;
        getUrl(uploadId)
            .unwrap()
            .then((res) => setImageUrl(res.data.url))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [uploadId, getUrl]);

    return (
        <>
            <PageMeta title="Annotate Image" description="Draw and save annotations on your image" />
            <PageBreadcrumb pageTitle="Annotate Image" />

            {/* Workspace card */}
            <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 h-12 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <span className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Annotate Image
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                            Annotation Tool
                        </span>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-3 text-gray-400">
                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span className="text-sm font-medium">Loading image…</span>
                    </div>
                ) : error || !imageUrl ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Could not load image</p>
                            <p className="text-xs text-gray-400 mt-0.5">The image may have expired or been removed.</p>
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-1 px-4 py-1.5 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                            Go back
                        </button>
                    </div>
                ) : (
                    <AnnotationCanvas uploadId={uploadId!} imageUrl={imageUrl} />
                )}
            </div>
        </>
    );
}
