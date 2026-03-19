import { useState, useEffect, useCallback } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
    useCreateZipJobMutation,
    useGetDownloadStatusQuery,
    type DownloadStatus,
} from "../features/downloads/downloadsApi";

export type ZipPhase =
    | "idle"
    | "queuing"     // createZipJob in-flight
    | "polling"     // waiting for worker (QUEUED / PROCESSING)
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

    // Poll every 2s while jobId is set. Automatically skipped when jobId is null.
    const { data: statusData } = useGetDownloadStatusQuery(
        jobId ?? skipToken,
        { pollingInterval: 2000 }
    );

    // React to status updates from the poller.
    useEffect(() => {
        const s = statusData?.data;
        if (!s) return;

        setWorkerStatus(s.status);

        if (s.status === "COMPLETED" && s.downloadUrl) {
            setProgress(100);
            setPhase("done");
            setJobId(null); // Stop polling

            // Trigger browser download
            const a = document.createElement("a");
            a.href = s.downloadUrl;
            a.download = "archive.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (s.status === "FAILED") {
            setError(s.error ?? "ZIP generation failed");
            setPhase("failed");
            setJobId(null); // Stop polling
        } else if (s.status === "PROCESSING") {
            setProgress(s.progress ?? 50);
        }
        // QUEUED — no update needed, just keep polling
    }, [statusData]);

    const triggerZip = useCallback(async (fileKeys: string[]) => {
        if (phase === "queuing" || phase === "polling") return;

        setError(null);
        setProgress(0);
        setWorkerStatus(null);
        setPhase("queuing");

        try {
            const result = await createZipJob({ fileKeys }).unwrap();
            setJobId(result.data.jobId);
            setPhase("polling");
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
        isLoading: phase === "queuing" || phase === "polling",
        reset,
    };
}
