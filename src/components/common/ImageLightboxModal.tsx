import React from 'react';
import { X, Download, ExternalLink, ZoomIn } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Attached Bill / Receipt Photo',
  onClose
}) => {
  if (!isOpen || !imageUrl) return null;

  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://${window.location.hostname}:4321${imageUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={fullUrl}
              download
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Download Bill Photo"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/5 dark:bg-slate-950/40 min-h-[300px]">
          {imageUrl.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={fullUrl}
              title="PDF Viewer"
              className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800"
            />
          ) : (
            <img
              src={fullUrl}
              alt={title}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md"
            />
          )}
        </div>
      </div>
    </div>
  );
};
