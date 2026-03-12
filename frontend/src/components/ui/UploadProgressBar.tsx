interface Props {
    progress: number; // 0–100
    status: string;
    fileName?: string;
    onCancel?: () => void;
}

export function UploadProgressBar({ progress, status, fileName, onCancel }: Props) {
    const visible = ['uploading', 'presigning', 'completing'].includes(status);
    if (!visible) return null;

    return (
        <div className="w-full space-y-1">
            {fileName && (
                <div className="flex justify-between text-xs text-gray-500">
                    <span className="truncate max-w-[80%]">{fileName}</span>
                    <span>{progress}%</span>
                </div>
            )}
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                />
            </div>
            {onCancel && status === 'uploading' && (
                <button onClick={onCancel} className="text-xs text-red-500 hover:underline">
                    Cancel
                </button>
            )}
        </div>
    );
}
