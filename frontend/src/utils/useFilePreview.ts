import { useEffect, useState } from "react";
import { thumbnail } from "exifr";

export type FilePreview = {
    url: string | null;
    type: "image" | "video" | "other";
    ext: string;
};

const RAW_EXT = ["CR2", "CR3", "NEF", "ARW", "DNG"];

export function useFilePreview(file: File): FilePreview {

    const [preview, setPreview] = useState<FilePreview>({
        url: null,
        type: "other",
        ext: ""
    });

    useEffect(() => {

        if (!file) return;

        const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
        const isRaw = RAW_EXT.includes(ext);

        // Standard browser-previewable files
        if (!isRaw) {
            const url = URL.createObjectURL(file);
            console.log("tHE CREATED URL: ", url);
            const type =
                file.type.startsWith("image/") ? "image" :
                    file.type.startsWith("video/") ? "video" :
                        "other";

            setPreview({ url, type, ext });
            return () => URL.revokeObjectURL(url);
        }

        // RAW files: extract embedded JPEG using exifr (no pixel decode, no WASM, no canvas)
        let objectUrl: string | null = null;
        let cancelled = false;

        async function extractRawPreview() {
            console.log("Raw file detected", file);
            try {
                const bytes = await thumbnail(file);

                if (!bytes) {
                    // No embedded preview — degrade gracefully to file icon
                    if (!cancelled) setPreview({ url: null, type: "other", ext });
                    return;
                }

                const blob = new Blob([bytes], { type: "image/jpeg" });
                console.log("blob: ", blob);
                const url = URL.createObjectURL(blob);
                objectUrl = url;

                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }

                setPreview({ url, type: "image", ext });
            } catch {
                // Corrupt or unrecognised RAW — degrade gracefully to file icon
                if (!cancelled) setPreview({ url: null, type: "other", ext });
            }
        }

        extractRawPreview();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };

    }, [file]);

    return preview;
}
