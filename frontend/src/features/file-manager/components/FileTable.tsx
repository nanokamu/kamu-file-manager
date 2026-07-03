import React from 'react';
// import { TruncatedText } from '../../../shared/components/TruncatedText';
import { useFileDropUpload } from '../hooks/useFileDropUpload';
import type { FileItem } from '../types';
import { FileIcon } from './FileIcon';
import { FileRowMenu } from './FileRowMenu';

// const EDITABLE_TYPES = new Set<FileItem['type']>(['document']);

interface FileTableProps {
    items: FileItem[];
    selectedFiles: string[];
    focusedId: string | null;
    openMenuId: string | null;
    getRowProps: (id: string) => {
        'data-file-row-id': string;
        onMouseDown: (e: React.MouseEvent) => void;
    };
    getKeyboardRowProps: (id: string) => {
        role: 'row';
        tabIndex: number;
        'aria-selected': boolean;
        'aria-label': string | undefined;
        onFocus: () => void;
        ref: (node: HTMLTableRowElement | null) => void;
    };
    isDragging: boolean;
    onRowClick: (item: FileItem) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onToggleMenu: (id: string) => void;
    onCloseMenu: () => void;
    onOpenInEditor?: (item: FileItem) => void;
    onDownload?: (item: FileItem) => void;
    onDownloadFolderAsZip?: (item: FileItem) => void;
    onRename?: (item: FileItem) => void;
    onUploadFiles?: (files: File[]) => void;
}

export function FileTable({
    items,
    selectedFiles,
    focusedId,
    openMenuId,
    getRowProps,
    getKeyboardRowProps,
    isDragging,
    onRowClick,
    onToggleSelect,
    onToggleMenu,
    onCloseMenu,
    onOpenInEditor,
    onDownload,
    onDownloadFolderAsZip,
    onRename,
    onUploadFiles,
}: FileTableProps) {
    const { isFileDragOver, dropZoneProps } = useFileDropUpload({
        onUpload: onUploadFiles ?? (() => {}),
        disabled: !onUploadFiles,
    });

    return (
        <div className="relative min-h-full" {...dropZoneProps}>
            {isFileDragOver && onUploadFiles && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80 pointer-events-none"
                    aria-hidden="true"
                >
                    <span className="text-sm font-medium text-blue-700">Drop files to upload</span>
                </div>
            )}
            <table className="w-full table-fixed text-left border-collapse">
                <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3 w-12 bg-slate-50"></th>
                        <th className="py-3 px-4 bg-slate-50">Name</th>
                        <th className="py-3 px-4 hidden sm:table-cell sm:w-40 whitespace-nowrap overflow-hidden bg-slate-50">Last Modified</th>
                        <th className="py-3 px-4 hidden md:table-cell md:w-24 whitespace-nowrap overflow-hidden bg-slate-50">Size</th>
                        <th className="py-3 px-3 w-24 text-right whitespace-nowrap overflow-hidden bg-slate-50">Actions</th>
                    </tr>
                </thead>
                <tbody
                    className={`divide-y divide-slate-100 text-sm text-slate-700${isDragging ? ' cursor-default' : ''}`}
                >
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                This directory is empty.
                            </td>
                        </tr>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedFiles.includes(item.id);
                            const isFocused = focusedId === item.id;
                            const rowProps = getRowProps(item.id);
                            const keyboardRowProps = getKeyboardRowProps(item.id);
                            return (
                                <tr
                                    key={item.id}
                                    {...rowProps}
                                    {...keyboardRowProps}
                                    onClick={() => onRowClick(item)}
                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group outline-none ${
                                        isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''
                                    } ${isFocused ? 'ring-2 ring-inset ring-blue-500/50' : ''}`}
                                >
                                    {/* Checkbox column */}
                                    <td
                                        className="py-3.5 px-3 w-12 overflow-hidden cursor-pointer"
                                        onMouseDown={rowProps.onMouseDown}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleSelect(item.id, e);
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            tabIndex={-1}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 transition-all pointer-events-none"
                                        />
                                    </td>

                                    {/* File Name & Icon column */}
                                    <td className="py-3.5 px-4 font-medium text-slate-800 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileIcon type={item.type} />
                                            <span className="min-w-0 truncate">{item.name}</span>
                                        </div>
                                    </td>

                                    {/* Modified Date column */}
                                    <td className="py-3.5 px-4 text-slate-500 hidden sm:table-cell sm:w-40 whitespace-nowrap overflow-hidden">
                                        {item.updatedAt}
                                    </td>

                                    {/* Size column */}
                                    <td className="py-3.5 px-4 text-slate-500 hidden md:table-cell md:w-24 whitespace-nowrap overflow-hidden">
                                        {item.type === 'folder' ? '--' : item.size}
                                    </td>

                                    {/* Actions column */}
                                    <td
                                        className="py-3.5 px-3 w-24 text-right whitespace-nowrap overflow-hidden"
                                        data-file-row-actions
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <FileRowMenu
                                            item={item}
                                            isOpen={openMenuId === item.id}
                                            onToggle={() => onToggleMenu(item.id)}
                                            onClose={onCloseMenu}
                                            onOpenInEditor={onOpenInEditor}
                                            onDownload={onDownload}
                                            onDownloadFolderAsZip={onDownloadFolderAsZip}
                                            onRename={onRename}
                                        />
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
