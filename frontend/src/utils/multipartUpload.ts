import { xhrUpload } from './xhrUpload';

export const PART_SIZE = 10 * 1024 * 1024; // 10MB (R2 min is 5MB)

export interface PartResult {
    PartNumber: number;
    ETag: string;
}

export interface MultipartUploadCallbacks {
    onProgress?: (percent: number) => void;
    onPartComplete?: (partNumber: number, total: number) => void;
    signal?: AbortSignal;
}

export interface PresignPartFn {
    (partNumber: number): Promise<string>; // returns presigned URL for that part
}

export async function uploadMultipart(
    file: File,
    presignPart: PresignPartFn,
    callbacks: MultipartUploadCallbacks = {}
): Promise<PartResult[]> {
    const { onProgress, onPartComplete, signal } = callbacks;
    const totalParts = Math.ceil(file.size / PART_SIZE);
    const parts: PartResult[] = [];
    let totalUploaded = 0;

    for (let i = 0; i < totalParts; i++) {
        if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');

        const partNumber = i + 1;
        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partUrl = await presignPart(partNumber);

        let partLoaded = 0;
        const etag = await xhrUpload({
            url: partUrl,
            file: chunk,
            contentType: file.type,
            signal,
            onProgress: (_, loaded) => {
                const delta = loaded - partLoaded;
                partLoaded = loaded;
                totalUploaded += delta;
                onProgress?.(Math.round((totalUploaded / file.size) * 100));
            },
        });

        // Capture the actual ETag from the response header (R2/S3 return it in PUT responses)
        // We strip quotes as some backends expect the raw ETag
        parts.push({ PartNumber: partNumber, ETag: etag?.replace(/"/g, '') || `part-${partNumber}` });
        onPartComplete?.(partNumber, totalParts);
    }

    return parts;
}
