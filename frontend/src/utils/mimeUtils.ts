/**
 * Maps common file extensions to MIME types, specifically for RAW image formats
 * that browsers often fail to identify.
 */
const EXTENSION_MAP: Record<string, string> = {
    'CR2': 'image/CR2',
    'cr3': 'image/x-canon-cr3',
    'nef': 'image/x-nikon-nef',
    'arw': 'image/x-sony-arw',
    'dng': 'image/x-adobe-dng',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
};

/**
 * Resolves the MIME type of a file. 
 * If the browser doesn't provide one, it falls back to extension-based mapping.
 */
export function resolveMimeType(file: File): string {
    // 1. Use browser-detected type if available
    if (file.type && file.type.length > 0) {
        return file.type;
    }

    // 2. Fallback to extension mapping
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && EXTENSION_MAP[ext]) {
        return EXTENSION_MAP[ext];
    }

    // 3. Ultimate fallback
    return 'application/octet-stream';
}
