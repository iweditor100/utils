import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useLazyGetDownloadStatusQuery } from "../features/downloads/downloadsApi";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";

export default function DownloadReadyPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const [fetchStatus, { data, isLoading, isError }] = useLazyGetDownloadStatusQuery();
    const didFetch = useRef(false);

    useEffect(() => {
        if (jobId && !didFetch.current) {
            didFetch.current = true;
            fetchStatus(jobId);
        }
    }, [jobId, fetchStatus]);

    const status = data?.data;
    console.log("Data: ", data);

    function triggerDownload(url: string) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "archive.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return (
        <>
            <PageMeta title="Download Ready" description="Your ZIP file is ready to download" />
            <PageBreadcrumb pageTitle="Download" />

            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 max-w-md w-full text-center shadow-sm">

                    {/* Loading */}
                    {(isLoading || !status) && !isError && (
                        <div className="flex flex-col items-center gap-4">
                            <svg className="w-8 h-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Checking your download…</p>
                        </div>
                    )}

                    {/* Still processing */}
                    {status && (status.status === "QUEUED" || status.status === "PROCESSING") && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <svg className="w-7 h-7 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-base font-semibold text-gray-800 dark:text-white">Still processing</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    Your ZIP is being built. Check back in a moment.
                                </p>
                            </div>
                            <button
                                onClick={() => jobId && fetchStatus(jobId)}
                                className="mt-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Check again
                            </button>
                        </div>
                    )}

                    {/* Ready */}
                    {status?.status === "COMPLETED" && status.downloadUrl && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-base font-semibold text-gray-800 dark:text-white">Your ZIP is ready</p>
                                {status.expiresAt && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Link expires {new Date(status.expiresAt).toLocaleDateString(undefined, {
                                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                        })}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => triggerDownload(status.downloadUrl!)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download ZIP
                            </button>
                        </div>
                    )}

                    {/* Failed */}
                    {(isError || status?.status === "FAILED") && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-base font-semibold text-gray-800 dark:text-white">Download failed</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    {status?.error ?? "This download link is invalid or has expired."}
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
