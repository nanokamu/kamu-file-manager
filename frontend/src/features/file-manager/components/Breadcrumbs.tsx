import React from 'react';
import type { Crumb } from '../types';

interface BreadcrumbsProps {
    crumbs: Crumb[];
    onCrumbClick: (id: string | null) => void;
}

export function Breadcrumbs({ crumbs, onCrumbClick }: BreadcrumbsProps) {
    return (
        <div className="shrink-0 overflow-x-auto whitespace-nowrap px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 text-sm text-slate-500">
            {crumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id ?? 'root'}>
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    <button
                        onClick={() => onCrumbClick(crumb.id)}
                        className={`hover:text-blue-600 transition-colors font-medium ${idx === crumbs.length - 1 ? 'text-slate-800 pointer-events-none' : ''
                            }`}
                    >
                        {crumb.name}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}