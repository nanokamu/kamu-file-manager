import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import type { ApiTemplate } from '../../../shared/types/addon.types';

interface AddonMenuModalProps {
  isOpen: boolean;
  templates: ApiTemplate[];
  onSelect: (template: ApiTemplate) => void;
  onClose: () => void;
}

const focusRingClass =
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600';

export function AddonMenuModal({
  isOpen,
  templates,
  onSelect,
  onClose,
}: AddonMenuModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/60"
      >
        <h2 id={titleId} className="text-lg font-medium text-slate-900">
          Addon functions
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose an action to run on the selected items.
        </p>

        <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-100">
          {templates.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No addon functions available for this selection.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((template) => (
                <li key={template.apiUrl}>
                  <button
                    type="button"
                    onClick={() => onSelect(template)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRingClass}`}
                  >
                    {template.menuName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRingClass}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
