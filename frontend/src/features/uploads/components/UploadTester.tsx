import React, { useState, useEffect } from 'react';
import { useUploadWithProgress } from '../../../hooks/useUploadWithProgress';
import { UploadProgressBar } from '../../../components/ui/UploadProgressBar';
import toast from 'react-hot-toast';
import { useFilePreview } from '../../../utils/useFilePreview';

export function UploadItem({
    file,
    onRemove,
    triggerAll
}: {
    file: File;
    onRemove: () => void;
    triggerAll: boolean
}) {
    const { upload, progress, status, error, cancel } = useUploadWithProgress();

    const { url: previewUrl, type, ext } = useFilePreview(file);

    const isImage = type === "image";
    const isVideo = type === "video";


    const handleUpload = async () => {
        try {
            await upload(file, 'testing');
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    useEffect(() => {
        if (triggerAll && status === 'idle') {
            handleUpload();
        }
    }, [triggerAll, status]);


    return (
        <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 space-y-3 relative group/item">
            <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 truncate max-w-[60%]" title={file.name}>
                    {file.name}
                </span>
                <div className="flex gap-2">
                    {status === 'idle' && (
                        <button
                            onClick={handleUpload}
                            className="text-blue-600 hover:underline font-medium text-xs"
                        >
                            Upload
                        </button>
                    )}
                    {status === 'uploading' && (
                        <button
                            onClick={cancel}
                            className="text-red-500 hover:underline font-medium text-xs"
                        >
                            Cancel
                        </button>
                    )}
                    {(status === 'idle' || status === 'done' || status === 'error') && (
                        <button
                            onClick={onRemove}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {previewUrl && (
                <div className="w-full h-40 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">

                    {isImage && (
                        <img
                            src={previewUrl}
                            alt={file.name}
                            className="object-cover w-full h-full"
                        />
                    )}

                    {isVideo && (
                        <video
                            src={previewUrl}
                            className="object-cover w-full h-full"
                            muted
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                                e.currentTarget.currentTime = 0.1;
                            }}
                        />
                    )}

                    {!isImage && !isVideo && (
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 px-4">
                            <div className="relative">
                                <svg className="w-12 h-14 text-gray-300" fill="currentColor" viewBox="0 0 48 56">
                                    <path d="M28 0H4a4 4 0 00-4 4v48a4 4 0 004 4h40a4 4 0 004-4V20L28 0z" />
                                    <path d="M28 0v16a4 4 0 004 4h16" fill="white" opacity="0.3" />
                                </svg>
                                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-gray-400 rounded px-1 leading-4">
                                    {ext}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium text-center truncate w-full text-center" title={file.name}>
                                {file.name}
                            </span>
                        </div>
                    )}
                </div>
            )}
            <UploadProgressBar
                progress={progress}
                status={status}
                onCancel={cancel}
            />

            <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                <span className={
                    status === 'error' ? 'text-red-500' :
                        status === 'done' ? 'text-green-500' :
                            'text-blue-500'
                }>
                    {status}
                </span>

                {status === "uploading" && (
                    <span className="text-blue-600">{progress}%</span>
                )}

                {status === 'done' && (
                    <span className="text-green-600">100%</span>
                )}
            </div>

            {error && (
                <div className="text-[10px] text-red-600 bg-red-50 p-1 rounded">
                    {error}
                </div>
            )}
        </div>
    );
}

export function UploadTester() {

    const [files, setFiles] = useState<File[]>([]);
    const [isUploadingAll, setIsUploadingAll] = useState(false);


    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const droppedFiles = Array.from(e.dataTransfer.files);

        if (droppedFiles.length > 10) {
            toast.error("Max 10 files allowed your last 10 files will be dropped");
            setFiles(droppedFiles.slice(0, 10));
        } else {
            setFiles(droppedFiles);
        }
        setIsUploadingAll(false);
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); //NO REFERSH WHEN DRAGGING. 
    }
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            // Limit to 10 files
            if (selectedFiles.length > 10) {
                alert("Maximum 10 files allowed at a time.");
                setFiles(selectedFiles.slice(0, 10));
            } else {
                setFiles(selectedFiles);
            }
            setIsUploadingAll(false); // Reset trigger
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadAll = () => {
        setIsUploadingAll(true);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6 border border-gray-100">
            <div className="flex justify-between items-baseline">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Upload Test Playground</h2>
                    <p className="text-xs text-gray-400 font-medium">Native XHR Engine • Bulk Testing Mode</p>
                </div>
                {files.length > 0 && (
                    <button
                        onClick={handleUploadAll}
                        disabled={isUploadingAll}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
                    >
                        ⏏ Start All Uploads
                    </button>
                )}
            </div>

            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 transition-colors hover:border-blue-300 group"
            >
                <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div>
                        <label className="cursor-pointer">
                            <span className="text-blue-600 font-bold hover:underline">Click to select </span>
                            <span className="text-gray-500">or drag and drop</span>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">Up to 10 files • Max 100MB each</p>
                    </div>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Selected Files ({files.length}/10)
                        </h3>
                        <button
                            onClick={() => {
                                setFiles([]);
                                setIsUploadingAll(false);
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 font-medium"
                        >
                            Clear All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {files.map((file, index) => (
                            <UploadItem
                                key={`${file.name}-${index}`}
                                file={file}
                                triggerAll={isUploadingAll}
                                onRemove={() => removeFile(index)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {files.length === 0 && (
                <div className="py-20 text-center text-gray-300">
                    <p className="text-sm italic">No files selected for testing.</p>
                </div>
            )}

            <div className="text-[10px] text-gray-400 text-center italic border-t border-gray-50 pt-4">
                Note: Each file uses an isolated `useUploadWithProgress` hook instance.
            </div>
        </div>
    );
}
