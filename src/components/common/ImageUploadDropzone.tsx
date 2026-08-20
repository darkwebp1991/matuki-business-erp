import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X, Eye, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../api/client';

interface ImageUploadDropzoneProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  onPreview?: (url: string) => void;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  value,
  onChange,
  label = 'Attach Bill / Receipt Photo (બિલ નો ફોટો)',
  placeholder = 'Click or drag bill photo here to attach',
  onPreview
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Check if image or pdf
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload an image file (JPG, PNG, WebP) or PDF.');
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const res = await api.uploadBillPhoto(base64);
          if (res && res.url) {
            onChange(res.url);
          }
        } catch (err: any) {
          alert(`Failed to upload bill photo: ${err.message}`);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert('Error reading file: ' + err.message);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const fullUrl = value ? (value.startsWith('http') ? value : `http://${window.location.hostname}:4321${value}`) : '';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {label}
          </span>
          {value && (
            <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              ✓ Attached
            </span>
          )}
        </label>
      )}

      {value ? (
        <div className="relative group border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {value.toLowerCase().endsWith('.pdf') ? (
                <span className="text-xs font-bold text-red-600">PDF</span>
              ) : (
                <img
                  src={fullUrl}
                  alt="Attached Bill"
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => onPreview ? onPreview(fullUrl) : window.open(fullUrl, '_blank')}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {value.split('/').pop() || 'Bill Photo'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bill photo attached successfully
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onPreview ? onPreview(fullUrl) : window.open(fullUrl, '_blank')}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300 shadow-sm transition-colors"
              title="Preview Bill Photo"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-300 shadow-sm transition-colors"
              title="Remove Bill Photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-amber-50/40 dark:hover:bg-slate-800/60 hover:border-amber-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-amber-600 dark:text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Uploading bill photo...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1 text-slate-600 dark:text-slate-400">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {placeholder}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  JPG, PNG, WebP or Camera Snap (Max 10MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
