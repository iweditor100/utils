export interface XhrUploadOptions {
    url: string;
    file: File | Blob;
    contentType: string;
    onProgress?: (percent: number, loaded: number, total: number) => void;
    signal?: AbortSignal;
}

export function xhrUpload({ url, file, contentType, onProgress, signal }: XhrUploadOptions): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress?.(percent, e.loaded, e.total);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.getResponseHeader('ETag') || undefined);
            } else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

        signal?.addEventListener('abort', () => xhr.abort());

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.send(file);
    });
}