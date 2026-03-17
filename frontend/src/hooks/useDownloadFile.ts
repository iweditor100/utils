import { useCallback } from 'react';
import { useLazyGetDownloadUrlQuery } from '../features/uploads/uploadsApi';

export interface UseDownloadFileResult {
    download: (fileId: string, filename: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

// Fetches a presigned GET URL from the backend on demand, then triggers a
// browser file download. The URL is never persisted — it is used once and
// discarded. RTK Query still caches it internally so repeated calls within
// the cache window skip the network round-trip.
export function useDownloadFile(): UseDownloadFileResult {
    const [getDownloadUrl, { isLoading, error }] = useLazyGetDownloadUrlQuery();

    const download = useCallback(async (fileId: string, filename: string) => {
        const result = await getDownloadUrl(fileId).unwrap();

        const a = document.createElement('a');
        a.href = result.data.url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [getDownloadUrl]);

    const errorMessage = error
        ? ((error as any)?.data?.message ?? 'Download failed')
        : null;

    return { download, isLoading, error: errorMessage };
}
