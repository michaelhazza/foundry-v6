import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';

interface FileUploadZoneProps {
  accept: string;
  maxSizeMB: number;
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  error?: string;
}

export function FileUploadZone({
  accept,
  maxSizeMB,
  onFileSelect,
  isUploading,
  error,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-2">
      <label
        className={cn(
          'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          error && 'border-destructive',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <>
              <LoadingSpinner size="lg" className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : selectedFile ? (
            <>
              <FileText className="w-10 h-10 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                {accept} up to {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
