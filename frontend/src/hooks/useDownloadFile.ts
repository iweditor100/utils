import { useState, useRef, useCallback, useEffect } from 'react';
import { useLazyGetDownloadUrlQuery } from '../features/uploads/uploadsApi';

export type DownloadStatus = 'idle' | 'fetching-url' | 'downloading' | 'done' | 'error';

export interface UseDownloadFileResult {
    download: (fileId: string, filename: string) => Promise<void>;
    progress: number; // 0–100
    status: DownloadStatus;
    error: string | null;
    cancel: () => void;
}

const supportsFileSystemAccess = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

// Streams the response body directly to disk via the File System Access API.
// Peak RAM = one chunk (~64KB), regardless of file size.
async function streamToDisk(
    response: Response,
    filename: string,
    total: number,
    onProgress: (p: number) => void,
): Promise<void> {
    const fileHandle = await (window as any).showSaveFilePicker({ suggestedName: filename });
    const writable = await fileHandle.createWritable();
    const reader = response.body!.getReader();
    let loaded = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writable.write(value);
            loaded += value.length;
            if (total > 0) onProgress(Math.round((loaded / total) * 100));
        }
        await writable.close();
    } catch (err) {
        await writable.abort();
        throw err;
    }
}

// Fallback: accumulates chunks in memory then triggers an <a> download.
// Used when File System Access API is unavailable (Firefox, Safari).
async function streamToBlob(
    response: Response,
    filename: string,
    total: number,
    onProgress: (p: number) => void,
): Promise<void> {
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) onProgress(Math.round((loaded / total) * 100));
    }

    const blob = new Blob(chunks);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

export function useDownloadFile(): UseDownloadFileResult {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<DownloadStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const [getDownloadUrl] = useLazyGetDownloadUrlQuery();

    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setStatus('idle');
        setProgress(0);
    }, []);

    const download = useCallback(async (fileId: string, filename: string) => {
        try {
            abortRef.current?.abort();
            abortRef.current = new AbortController();
            setError(null);
            setProgress(0);
            setStatus('fetching-url');

            const result = await getDownloadUrl(fileId).unwrap();
            const url = result.data.url;

            setStatus('downloading');
            const response = await fetch(url, { signal: abortRef.current.signal });
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            if (!response.body) throw new Error('No response body');

            const contentLength = response.headers.get('Content-Length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            if (supportsFileSystemAccess) {
                await streamToDisk(response, filename, total, setProgress);
            } else {
                await streamToBlob(response, filename, total, setProgress);
            }

            setProgress(100);
            setStatus('done');
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                setStatus('idle');
                return;
            }
            const message: string = err?.data?.message ?? err?.message ?? 'Download failed';
            setError(message);
            setStatus('error');
        }
    }, [getDownloadUrl]);

    return { download, progress, status, error, cancel };
}
