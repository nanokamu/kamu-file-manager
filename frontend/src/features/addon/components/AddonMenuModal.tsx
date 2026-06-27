import { useEffect, useId, useRef, useState } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuSnapshot, setMenuSnapshot] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentSnapshot = isOpen
    ? templates.map((template) => `${template.apiUrl}:${template.menuName}`).join('|')
    : null;

  if (currentSnapshot !== menuSnapshot) {
    setMenuSnapshot(currentSnapshot);
    setActiveIndex(-1);
  }

  const safeActiveIndex =
    templates.length === 0 ? 0 : Math.min(activeIndex, templates.length - 1);

  if (isOpen && templates.length > 0 && activeIndex >= templates.length) {
    setActiveIndex(templates.length - 1);
  }

  useEffect(() => {
    if (!isOpen || safeActiveIndex < 0) {
      return;
    }
    itemRefs.current[safeActiveIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, safeActiveIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (templates.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) =>
          index < 0
            ? Math.min(1, templates.length - 1)
            : Math.min(index + 1, templates.length - 1),
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) =>
          index < 0 ? templates.length - 1 : Math.max(index - 1, 0),
        );
        return;
      }

      if (event.key === 'Enter') {
        if (safeActiveIndex < 0) {
          return;
        }
        event.preventDefault();
        const template = templates[safeActiveIndex];
        if (template) {
          onSelect(template);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onSelect, templates, safeActiveIndex]);

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
            <ul role="menu" className="divide-y divide-slate-100">
              {templates.map((template, index) => {
                const isActive = safeActiveIndex >= 0 && index === safeActiveIndex;

                return (
                <li key={`${template.apiUrl}:${template.menuName}`}>
                  <button
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    role="menuitem"
                    aria-selected={isActive}
                    onClick={() => onSelect(template)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 ${isActive ? 'bg-slate-100' : ''} ${focusRingClass}`}
                  >
                    {template.menuName}
                  </button>
                </li>
                );
              })}
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
