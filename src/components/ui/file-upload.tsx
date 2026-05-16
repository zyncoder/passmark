import * as React from "react"
import { UploadCloud, X, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FileUploadProps {
  label?: string;
  error?: string;
  helperText?: string;
  accept?: string;
  maxSizeMB?: number;
  minSizeKB?: number;
  value?: File | null;
  onChange?: (file: File | null) => void;
  className?: string;
  disabled?: boolean;
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ label, error, helperText, accept = "image/jpeg, image/png", maxSizeMB = 2, minSizeKB = 50, value, onChange, className, disabled }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [dragActive, setDragActive] = React.useState(false);
    const [localError, setLocalError] = React.useState<string | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (value) {
        const objectUrl = URL.createObjectURL(value);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      } else {
        setPreviewUrl(null);
      }
    }, [value]);

    const handleFile = (file: File | undefined) => {
      setLocalError(null);
      if (!file) return;

      if (file.size > maxSizeMB * 1024 * 1024) {
        setLocalError(`File must be under ${maxSizeMB} MB.`);
        return;
      }
      
      if (file.size < minSizeKB * 1024) {
        setLocalError(`File must be at least ${minSizeKB} KB for quality purposes.`);
        return;
      }
      
      onChange?.(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFile(e.dataTransfer.files?.[0]);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
      if (inputRef.current) inputRef.current.value = '';
    };

    const displayError = error || localError;

    return (
      <div className={cn("flex flex-col gap-1 w-full", className)}>
        {label && (
          <label className="text-[13px] font-medium text-neutral-900">
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer overflow-hidden",
            dragActive ? "border-brand bg-brand-light" : "border-neutral-300 hover:bg-neutral-50",
            displayError && "border-danger bg-[#FEF2F2]",
            previewUrl && "p-4 border-solid border-neutral-300"
          )}
          onClick={() => !previewUrl && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={handleChange}
          />
          
          {previewUrl ? (
            <div className="flex flex-col items-center w-full gap-3">
              <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-md overflow-hidden bg-neutral-100 border border-neutral-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full hover:bg-white text-neutral-900 shadow-sm transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-neutral-600">
                <FileImage className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{value?.name}</span>
                <span>({((value?.size || 0) / 1024).toFixed(0)} KB)</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center mb-1">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-medium text-neutral-900">
                Click to upload or drag and drop
              </p>
              <p className="text-[12px] text-neutral-600">
                SVG, PNG, JPG or GIF ({minSizeKB}KB - {maxSizeMB}MB)
              </p>
            </div>
          )}
        </div>
        {displayError && <span className="text-[12px] text-danger">{displayError}</span>}
        {!displayError && helperText && <span className="text-[12px] text-neutral-600">{helperText}</span>}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
