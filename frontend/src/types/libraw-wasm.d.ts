declare module "libraw-wasm" {
    export default class LibRaw {
        open(data: Uint8Array, settings?: Record<string, unknown>): Promise<void>;
        metadata(fullOutput?: boolean): Promise<{ width: number; height: number; [key: string]: unknown }>;
        imageData(): Promise<Uint8Array>;
    }
}
