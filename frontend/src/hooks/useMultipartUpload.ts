import { useState, useRef, useCallback } from 'react';
import {
    useInitiateMultipartMutation,
    usePresignPartMutation,
    useCompleteMultipartMutation,
    useAbortMultipartMutation,
} from '../features/uploads/multipartUploadApi';
import { uploadMultipart } from '../utils/multipartUpload';
import { resolveMimeType } from '../utils/mimeUtils';

export type UploadStatus = 'idle' | 'initiating' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';

export function useMultipartUpload() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const uploadSessionRef = useRef<{ key: string; uploadId: string } | null>(null);

    const [initiateMultipart] = useInitiateMultipartMutation();
    const [presignPart] = usePresignPartMutation();
    const [completeMultipart] = useCompleteMultipartMutation();
    const [abortMultipart] = useAbortMultipartMutation();

    const cancel = useCallback(async () => {
        abortRef.current?.abort();
        if (uploadSessionRef.current) {
            await abortMultipart(uploadSessionRef.current).catch(() => { }); // cleanup R2 incomplete parts
            uploadSessionRef.current = null;
        }
        setStatus('aborted');
        setProgress(0);
    }, [abortMultipart]);

    const upload = useCallback(
        async (file: File, category: string) => {
            try {
                abortRef.current = new AbortController();
                setError(null);
                setProgress(0);
                setStatus('initiating');

                const mimeType = resolveMimeType(file);

                const response = await initiateMultipart({
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType,
                    category,
                }).unwrap();

                const { uploadId, key } = (response as any).data;

                uploadSessionRef.current = { key, uploadId };
                setStatus('uploading');

                const parts = await uploadMultipart(
                    file,
                    (partNumber: number) => presignPart({ key, uploadId, partNumber }).unwrap().then((r: any) => r.data.partUrl),
                    { onProgress: setProgress, signal: abortRef.current.signal }
                );

                setStatus('completing');
                const completeRes = await completeMultipart({ key, uploadId, parts }).unwrap();
                const { publicUrl } = (completeRes as any).data;
                uploadSessionRef.current = null;

                setStatus('done');
                setProgress(100);
                return { key, publicUrl };
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
        [initiateMultipart, presignPart, completeMultipart]
    );

    return { upload, progress, status, error, cancel };
}
