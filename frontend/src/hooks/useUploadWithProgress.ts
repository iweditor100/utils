import { useState, useRef, useCallback } from 'react';
import { usePresignUploadMutation, useCompleteUploadMutation } from '../features/uploads/uploadsApi'
import { xhrUpload } from '../utils/xhrUpload'
import { resolveMimeType } from '../utils/mimeUtils';

export type UploadStatus = 'idle' | 'presigning' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';

export interface UploadWithProgressResult {
    upload: (file: File, category: string) => Promise<{ key: string; publicUrl: string } | null>;
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

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setStatus('aborted');
        setProgress(0);
    }, []);

    const upload = useCallback(
        async (file: File, category: string) => {
            try {
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
                const completeRes = await completeUpload({ key, category }).unwrap();

                setStatus('done');
                setProgress(100);
                return { key, publicUrl: completeRes.data.publicUrl };
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    setStatus('aborted');
                    return null;
                }
                setError(err?.message ?? 'Upload failed');
                setStatus('error');
                return null;
            }
        },
        [presignUpload, completeUpload]
    );

    return { upload, progress, status, error, cancel };
}
