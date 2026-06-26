import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

interface AddonDownloadModalProps {
  isOpen: boolean;
  progress: number;
}

export function AddonDownloadModal({ isOpen, progress }: AddonDownloadModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/60"
      >
        <h2 id={titleId} className="text-lg font-medium text-slate-900">
          Downloading
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Preparing your file…
        </p>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-sm text-slate-500">{progress}%</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
