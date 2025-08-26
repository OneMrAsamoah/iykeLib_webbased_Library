import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSize?: number; // in MB
  value?: string;
  onChange: (value: string) => void;
  onFileSelect?: (file: File) => void;
  onFileData?: (fileData: { content: string; size: number; type: string }) => void;
  onFileUpload?: (file: File) => void; // New prop for file upload mode
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  uploadMode?: boolean; // New prop to enable file upload mode instead of base64
}


const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
    return <Image className="h-4 w-4" />;
  }
  
  if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
    return <FileText className="h-4 w-4" />;
  }
  
  return <File className="h-4 w-4" />;
};

export function FileUpload({
    label = "File",
    description,
    accept = "*/*",
    maxSize = 100, // Increased to 100MB default to match server limit
    value = "",
    onChange,
    onFileSelect,
    onFileData,
    onFileUpload,
    placeholder = "Choose a file or drag and drop",
    className,
    required = false,
    disabled = false,
    uploadMode = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileSize, setFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB. Current file: ${Math.round(file.size / (1024 * 1024))}MB`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    setIsProcessing(true);
    setFileSize(file.size);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setIsProcessing(false);
      return;
    }

    // Show processing message for large files
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Processing large file... This may take a moment.');
    }

    if (uploadMode) {
      // File upload mode - just pass the file object
      onChange(file.name); // Store just the filename
      onFileSelect?.(file);
      onFileUpload?.(file); // Pass the file for upload
      setIsProcessing(false);
      setError(null);
    } else {
      // Base64 mode - convert file to base64 for storage in database
      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = reader.result as string;
        const filePath = file.name; // Store just the filename
        
        onChange(filePath);
        onFileSelect?.(file);
        
        // Provide file data for database storage
        onFileData?.({
          content: base64Content.split(',')[1], // Remove data:application/pdf;base64, prefix
          size: file.size,
          type: file.type
        });
        
        setIsProcessing(false);
        setError(null);
      };
      
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    onChange('');
    setError(null);
    setFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="file-upload" className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          dragActive ? "border-primary bg-primary/10 dark:bg-primary/5" : "border-muted-foreground/25",
          value ? "border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-400" : "",
          error ? "border-destructive bg-destructive/10 dark:bg-destructive/5" : "",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!disabled ? openFileDialog : undefined}
      >
        {!value ? (
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">{placeholder}</p>
            <p className="text-xs text-muted-foreground">
              {accept !== "*/*" ? `Accepted formats: ${accept}` : "All file types accepted"}
              {maxSize && ` • Max size: ${maxSize}MB`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Large files may take longer to process
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getFileIcon(value)}
              <span className="text-sm font-medium text-foreground">{value.split('/').pop()}</span>
              <span className="text-xs text-muted-foreground">
                ({Math.round(fileSize / (1024 * 1024) * 100) / 100}MB)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {error && (
        <p className={cn(
          "text-xs",
          error.includes('Processing') || error.includes('large file') 
            ? "text-blue-600 dark:text-blue-400" 
            : "text-destructive"
        )}>
          {error}
          {isProcessing && (
            <span className="ml-2 inline-block animate-pulse">⏳</span>
          )}
        </p>
      )}

      {value && !error && !isProcessing && (
        <p className="text-xs text-green-600 dark:text-green-400">File selected successfully</p>
      )}

      {isProcessing && !error && (
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Processing file... <span className="inline-block animate-pulse">⏳</span>
        </p>
      )}
    </div>
  );
}
