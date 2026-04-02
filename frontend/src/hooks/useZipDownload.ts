import { useState, useEffect, useCallback } from "react";
import {
    useCreateZipJobMutation,
    useLazyGetDownloadStatusQuery,
    type DownloadStatus,
} from "../features/downloads/downloadsApi";
import { socket } from "../lib/socket";

export type ZipPhase =
    | "idle"
    | "queuing"     // createZipJob in-flight
    | "waiting"     // worker running — receiving socket events
    | "done"        // COMPLETED — URL available
    | "failed";

export interface UseZipDownloadResult {
    triggerZip: (fileKeys: string[]) => Promise<void>;
    phase: ZipPhase;
    workerStatus: DownloadStatus | null;
    progress: number;
    error: string | null;
    isLoading: boolean;
    reset: () => void;
}

export function useZipDownload(): UseZipDownloadResult {
    const [jobId, setJobId] = useState<string | null>(null);
    const [phase, setPhase] = useState<ZipPhase>("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [workerStatus, setWorkerStatus] = useState<DownloadStatus | null>(null);

    const [createZipJob] = useCreateZipJobMutation();
    const [fetchStatus] = useLazyGetDownloadStatusQuery();

    // Listen to socket events while a job is active.
    useEffect(() => {
        if (!jobId) return;

        // Safety net: if no completion event arrives within 10 minutes,
        // fall back to a single HTTP poll to get current status.
        const timeoutId = setTimeout(async () => {
            try {
                const result = await fetchStatus(jobId, false).unwrap();
                const s = result.data;
                if (s.status === "COMPLETED" && s.downloadUrl) {
                    setWorkerStatus("COMPLETED");
                    setProgress(100);
                    setPhase("done");
                    setJobId(null);
                    const a = document.createElement("a");
                    a.href = s.downloadUrl;
                    a.download = "archive.zip";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else if (s.status === "FAILED") {
                    setError(s.error ?? "ZIP generation failed");
                    setPhase("failed");
                    setJobId(null);
                } else {
                    setError("ZIP is taking too long. Please try again.");
                    setPhase("failed");
                    setJobId(null);
                }
            } catch {
                setError("ZIP timed out. Please try again.");
                setPhase("failed");
                setJobId(null);
            }
        }, 10 * 60 * 1000);

        const onProgress = (data: { jobId: string; progress: number }) => {
            if (data.jobId !== jobId) return;
            setWorkerStatus("PROCESSING");
            setProgress(data.progress);
        };

        const onComplete = async (data: { jobId: string }) => {
            if (data.jobId !== jobId) return;
            clearTimeout(timeoutId);
            try {
                const result = await fetchStatus(jobId, false).unwrap();
                const s = result.data;
                if (s.status === "COMPLETED" && s.downloadUrl) {
                    setWorkerStatus("COMPLETED");
                    setProgress(100);
                    setPhase("done");
                    setJobId(null);

                    const a = document.createElement("a");
                    a.href = s.downloadUrl;
                    a.download = "archive.zip";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else {
                    setError(s.error ?? "ZIP generation failed");
                    setPhase("failed");
                    setJobId(null);
                }
            } catch {
                setError("Failed to fetch download URL");
                setPhase("failed");
                setJobId(null);
            }
        };

        const onFailed = (data: { jobId: string; error?: string }) => {
            if (data.jobId !== jobId) return;
            clearTimeout(timeoutId);
            setError(data.error ?? "ZIP generation failed");
            setPhase("failed");
            setJobId(null);
        };

        socket.on("download:progress", onProgress);
        socket.on("download:complete", onComplete);
        socket.on("download:failed", onFailed);

        return () => {
            clearTimeout(timeoutId);
            socket.off("download:progress", onProgress);
            socket.off("download:complete", onComplete);
            socket.off("download:failed", onFailed);
        };
    }, [jobId, fetchStatus]);

    const triggerZip = useCallback(async (fileKeys: string[]) => {
        if (phase === "queuing" || phase === "waiting") return;

        setError(null);
        setProgress(0);
        setWorkerStatus(null);
        setPhase("queuing");

        try {
            const result = await createZipJob({ fileKeys }).unwrap();
            setJobId(result.data.jobId);
            setPhase("waiting");
        } catch (err: any) {
            setError(err?.data?.message ?? "Failed to create ZIP job");
            setPhase("failed");
        }
    }, [phase, createZipJob]);

    const reset = useCallback(() => {
        setJobId(null);
        setPhase("idle");
        setProgress(0);
        setError(null);
        setWorkerStatus(null);
    }, []);

    return {
        triggerZip,
        phase,
        workerStatus,
        progress,
        error,
        isLoading: phase === "queuing" || phase === "waiting",
        reset,
    };
}
