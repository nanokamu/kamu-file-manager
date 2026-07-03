import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ApiTemplate } from '../../../shared/types/addon.types';

interface AddonParamsModalProps {
  isOpen: boolean;
  template: ApiTemplate | null;
  values: Record<string, string>;
  isSubmitting: boolean;
  onValueChange: (name: string, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  onClose: () => void;
}

const focusRingClass =
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60';

export function AddonParamsModal({
  isOpen,
  template,
  values,
  isSubmitting,
  onValueChange,
  onConfirm,
  onBack,
  onClose,
}: AddonParamsModalProps) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const setFirstFieldRef = (element: HTMLInputElement | HTMLSelectElement | null) => {
    firstFieldRef.current = element;
  };

  useEffect(() => {
    if (!isOpen || isSubmitting) {
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
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen || isSubmitting || !template) {
      return;
    }

    if (template.customParams.length > 0) {
      firstFieldRef.current?.focus();
      return;
    }

    confirmRef.current?.focus();
  }, [isOpen, isSubmitting, template]);

  if (!isOpen || !template) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isSubmitting) {
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
          {template.menuName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure parameters for this action.
        </p>

        <div className="mt-4 space-y-4">
          {template.customParams.map((param, index) => (
            <div key={param.name}>
              <label
                htmlFor={`addon-param-${param.name}`}
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {param.label}
              </label>
              {param.inputType === 'dropdown' ? (
                <select
                  ref={index === 0 ? setFirstFieldRef : undefined}
                  id={`addon-param-${param.name}`}
                  value={values[param.name] ?? param.defaultValue}
                  onChange={(e) => onValueChange(param.name, e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                >
                  {(param.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  ref={index === 0 ? setFirstFieldRef : undefined}
                  id={`addon-param-${param.name}`}
                  type="text"
                  value={values[param.name] ?? param.defaultValue}
                  onChange={(e) => onValueChange(param.name, e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[auto_1fr_auto_auto] grid-rows-1 items-center gap-2">
          <button
            ref={confirmRef}
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className={`col-start-4 row-start-1 justify-self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClass}`}
          >
            {isSubmitting ? 'Running…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className={`col-start-1 row-start-1 justify-self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 ${focusRingClass}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`col-start-3 row-start-1 justify-self-end rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 ${focusRingClass}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
