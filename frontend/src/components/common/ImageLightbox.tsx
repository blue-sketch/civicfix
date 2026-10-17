import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { IssuePhoto } from '../../types';

interface ImageLightboxProps {
  photos: IssuePhoto[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 3.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetTransform();
      setHasError(false);
      setIsLoading(true);
    }
  }, [currentIndex, resetTransform]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetTransform();
      setHasError(false);
      setIsLoading(true);
    }
  }, [currentIndex, photos.length, resetTransform]);

  // Sync index if initialIndex or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetTransform();
      setHasError(false);
    }
  }, [initialIndex, isOpen, resetTransform]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard navigation & Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleZoomIn, handleZoomOut, resetTransform, onClose]);

  // Mouse & Touch Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Only return null right before rendering if not open or no photos
  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence Photo Lightbox"
    >
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-6 bg-navy-950/80 border-b border-white/10 flex items-center justify-between z-10 text-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-white/10 text-teal-accent px-2.5 py-1 rounded-md font-bold">
            {currentIndex + 1} of {photos.length}
          </span>
          <span className="text-xs text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
            {currentPhoto?.caption || currentPhoto?.photo_type.replace('_', ' ') || 'Grievance Evidence Photo'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Level Indicator */}
          <span className="text-xs font-mono font-bold text-slate-300 min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3.5}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset to fit */}
          <button
            onClick={resetTransform}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Reset zoom (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Direct Download/View Original Link */}
          {currentPhoto?.photo_url && (
            <a
              href={currentPhoto.photo_url}
              target="_blank"
              rel="noreferrer"
              download
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Open full resolution in new tab"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Close Lightbox */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Drag & Zoom */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 relative flex items-center justify-center overflow-hidden ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-teal-accent">
            <div className="w-8 h-8 border-2 border-teal-accent/20 border-t-teal-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="text-center text-slate-400 p-6 space-y-2">
            <AlertCircle className="w-10 h-10 text-status-critical mx-auto" />
            <div className="font-bold text-sm text-white">Image Failed to Load</div>
            <p className="text-xs text-slate-400">
              The evidence file may be inaccessible or removed from municipal storage.
            </p>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="max-w-[90vw] max-h-[80vh] flex items-center justify-center"
          >
            <img
              src={currentPhoto?.photo_url}
              alt={currentPhoto?.caption || 'Evidence'}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              draggable={false}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-none"
            />
          </div>
        )}

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-20 disabled:pointer-events-none transition border border-white/10 shadow-xl"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentIndex === photos.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-20 disabled:pointer-events-none transition border border-white/10 shadow-xl"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple photos) */}
      {photos.length > 1 && (
        <div className="h-20 bg-navy-950/80 border-t border-white/10 px-4 flex items-center justify-center gap-2 overflow-x-auto z-10">
          {photos.map((photo, idx) => (
            <button
              key={photo.id || idx}
              onClick={() => {
                setCurrentIndex(idx);
                resetTransform();
                setHasError(false);
                setIsLoading(true);
              }}
              className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                currentIndex === idx
                  ? 'border-teal-accent ring-2 ring-teal-accent/30 scale-105'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || `Thumb ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
