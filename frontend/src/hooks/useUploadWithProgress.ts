import { useState, useRef, useCallback, useEffect } from 'react';
import { usePresignUploadMutation, useCompleteUploadMutation } from '../features/uploads/uploadsApi'
import { xhrUpload } from '../utils/xhrUpload'
import { resolveMimeType } from '../utils/mimeUtils';

export type UploadStatus = 'idle' | 'presigning' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';

export interface UploadWithProgressResult {
    upload: (file: File, category: string) => Promise<{ key: string; fileId: string } | null>;
    progress: number; // 0–100
    status: UploadStatus;
    error: string | null;
    cancel: () => void;
}

export function useUploadWithProgress(): UploadWithProgressResult {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const [presignUpload] = usePresignUploadMutation();
    const [completeUpload] = useCompleteUploadMutation();

    // Abort any in-progress upload on unmount
    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setStatus('aborted');
        setProgress(0);
    }, []);

    const upload = useCallback(
        async (file: File, category: string) => {
            try {
                // Abort any previous upload before starting a new one
                abortRef.current?.abort();
                abortRef.current = new AbortController();
                setError(null);
                setProgress(0);
                setStatus('presigning');

                const mimeType = resolveMimeType(file);

                const response = await presignUpload({
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType,
                    category,
                }).unwrap();

                const { uploadUrl, key } = response.data;

                setStatus('uploading');
                await xhrUpload({
                    url: uploadUrl,
                    file,
                    contentType: mimeType,
                    onProgress: setProgress,
                    signal: abortRef.current.signal,
                });

                setStatus('completing');
                const completeRes = await completeUpload({
                    key,
                    category,
                    mimeType,
                    size: file.size,
                }).unwrap();

                setStatus('done');
                setProgress(100);
                return { key, fileId: completeRes.data.id };
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    setStatus('aborted');
                    return null;
                }
                // RTK Query unwrap errors are { status, data } — not Error instances
                const message: string =
                    err?.data?.message ?? err?.message ?? 'Upload failed';
                setError(message);
                setStatus('error');
                return null;
            }
        },
        [presignUpload, completeUpload]
    );

    return { upload, progress, status, error, cancel };
}
