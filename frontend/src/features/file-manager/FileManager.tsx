import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageBoxModal } from '../../shared/components/MessageBoxModal';
import { OperationProgressModal } from '../../shared/components/OperationProgressModal';
import { AddonDownloadModal } from '../addon/components/AddonDownloadModal';
import { AddonMenuModal } from '../addon/components/AddonMenuModal';
import { AddonParamsModal } from '../addon/components/AddonParamsModal';
import { useAddonConfig } from '../addon/hooks/useAddonConfig';
import { useAddonFlow } from '../addon/hooks/useAddonFlow';
import type { FileItem } from './types';
import { ActionBar } from './components/ActionBar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { TextInputDialog } from '../../shared/components/TextInputDialog';
import { FileTableArea } from './components/FileTableArea';
import { useFileActions } from './hooks/useFileActions';

function getRangeIds(items: FileItem[], startId: string, endId: string): string[] {
    const start = items.findIndex((i) => i.id === startId);
    const end = items.findIndex((i) => i.id === endId);
    if (start === -1 || end === -1) return [];
    const [lo, hi] = [start, end].sort((a, b) => a - b);
    return items.slice(lo, hi + 1).map((i) => i.id);
}

export default function FileManager() {
    const {
        breadcrumbs,
        folderItems,
        searchItems,
        navigateToFolder,
        openFolder,
        deleteItems,
        copyItems,
        moveItems,
        pasteItems,
        clipboard,
        clearClipboard,
        submitCreateFolder,
        renameItem,
        uploadFiles,
        operationItems,
        operation,
        isOperationModalOpen,
        closeOperationModal,
        openInEditor,
        downloadItem,
        downloadFolderAsZipItem,
    } = useFileActions();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [messageBox, setMessageBox] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
    const anchorIdRef = useRef<string | null>(null);

    useEffect(() => {
        document.title = 'Files';
    }, []);

    const selectedFileIds = useMemo(() => {
        const validIds = new Set(folderItems.map((item) => item.id));
        return selectedFiles.filter((id) => validIds.has(id));
    }, [folderItems, selectedFiles]);

    const filteredItems = useMemo(() => {
        if (searchQuery) {
            return searchItems(searchQuery);
        }
        return folderItems;
    }, [searchQuery, folderItems, searchItems]);

    const { config: addonConfig } = useAddonConfig();

    const selectedItems = useMemo(
        () => filteredItems.filter((item) => selectedFileIds.includes(item.id)),
        [filteredItems, selectedFileIds],
    );

    const {
        step: addonStep,
        applicableTemplates,
        selectedTemplate,
        paramValues,
        downloadProgress,
        isSubmitting: isAddonSubmitting,
        resultMessage: addonResultMessage,
        openMenu: openAddonMenu,
        closeFlow: closeAddonFlow,
        selectTemplate: selectAddonTemplate,
        goBackToMenu: goBackToAddonMenu,
        updateParamValue: updateAddonParamValue,
        confirmParams: confirmAddonParams,
        closeResult: closeAddonResult,
    } = useAddonFlow({
        config: addonConfig,
        selectedLocators: selectedFileIds,
        selectedItems,
    });

    useEffect(() => {
        anchorIdRef.current = null;
    }, [filteredItems]);

    const clearSelection = useCallback(() => {
        anchorIdRef.current = null;
        setSelectedFiles([]);
    }, []);

    const handleRowClick = (item: FileItem) => {
        if (item.type === 'folder') {
            openFolder(item);
            setSearchQuery('');
            setSelectedFiles([]);
        } else if (item.type === 'document') {
            openInEditor(item);
        }
    };

    const applyRangeSelection = (
        startId: string,
        endId: string,
        modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    ) => {
        let rangeStartId = startId;
        let rangeEndId = endId;

        if (modifiers.shiftKey) {
            const anchorId = anchorIdRef.current;
            if (anchorId) {
                rangeStartId = anchorId;
                rangeEndId = endId;
            }
        }

        const rangeIds = getRangeIds(filteredItems, rangeStartId, rangeEndId);
        if (rangeIds.length === 0) return;

        if (modifiers.ctrlKey || modifiers.metaKey) {
            setSelectedFiles((prev) => [...new Set([...prev, ...rangeIds])]);
        } else {
            setSelectedFiles(rangeIds);
        }
    };

    const applyMarqueeSelection = (
        ids: string[],
        modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    ) => {
        if (ids.length === 0) return;

        if (modifiers.ctrlKey || modifiers.metaKey) {
            setSelectedFiles((prev) => [...new Set([...prev, ...ids])]);
        } else {
            setSelectedFiles(ids);
        }
    };

    const handleSelectFile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const anchorId = anchorIdRef.current;

        if (e.shiftKey && anchorId) {
            const rangeIds = getRangeIds(filteredItems, anchorId, id);
            if (rangeIds.length > 0) {
                setSelectedFiles(rangeIds);
                return;
            }
        }

        setSelectedFiles((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
        anchorIdRef.current = id;
    };

    const handleBreadcrumbClick = (id: string | null) => {
        navigateToFolder(id);
        setSelectedFiles([]);
    };

    const handleCopy = () => {
        copyItems(selectedFileIds);
        setSelectedFiles([]);
    };

    const handleMove = () => {
        moveItems(selectedFileIds);
        setSelectedFiles([]);
    };

    const handleDelete = async () => {
        const ids = [...selectedFileIds];
        setSelectedFiles([]);
        await deleteItems(ids);
    };

    const handleCreateFolderSubmit = async (folderName: string): Promise<boolean> => {
        const result = await submitCreateFolder(folderName);
        if (!result.success && result.error) {
            setMessageBox({
                title: 'Could not create folder',
                description: result.error,
            });
        }
        return true;
    };

    return (
        <div className="flex flex-1 min-h-0 flex-col bg-slate-50 p-6 font-sans">
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/80">

                <ActionBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedCount={selectedFileIds.length}
                    clipboardCount={clipboard?.sources.length ?? 0}
                    onClearSelection={clearSelection}
                    onClearClipboard={clearClipboard}
                    onCopy={handleCopy}
                    onMove={handleMove}
                    onPaste={() => void pasteItems()}
                    onDelete={() => void handleDelete()}
                    onNewFolder={() => setIsCreateFolderOpen(true)}
                    onUpload={uploadFiles}
                    showAddon={selectedFileIds.length > 0 && applicableTemplates.length > 0}
                    onAddon={openAddonMenu}
                />

                <Breadcrumbs
                    crumbs={breadcrumbs}
                    onCrumbClick={handleBreadcrumbClick}
                />

                <FileTableArea
                    items={filteredItems}
                    selectedFiles={selectedFileIds}
                    openMenuId={openMenuId}
                    onRowClick={handleRowClick}
                    onToggleSelect={handleSelectFile}
                    onRangeSelect={applyRangeSelection}
                    onMarqueeSelect={applyMarqueeSelection}
                    onDragSelectEnd={(anchorId) => {
                        anchorIdRef.current = anchorId;
                    }}
                    onEmptyAreaClick={() => {
                        if (selectedFileIds.length > 0) {
                            clearSelection();
                        }
                    }}
                    onToggleMenu={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                    onCloseMenu={() => setOpenMenuId(null)}
                    onOpenInEditor={openInEditor}
                    onDownload={downloadItem}
                    onDownloadFolderAsZip={downloadFolderAsZipItem}
                    onRename={setRenameTarget}
                />

            </div>

            {isCreateFolderOpen && (
                <TextInputDialog
                    isOpen={isCreateFolderOpen}
                    onClose={() => setIsCreateFolderOpen(false)}
                    onSubmit={handleCreateFolderSubmit}
                    title="New folder"
                    description="Enter a name for the new folder."
                    placeholder="Folder name"
                    confirmLabel="Create"
                    submittingLabel="Creating…"
                />
            )}

            {renameTarget && (
                <TextInputDialog
                    isOpen={!!renameTarget}
                    onClose={() => setRenameTarget(null)}
                    onSubmit={async (name) => {
                        const target = renameTarget;
                        if (!target) {
                            return false;
                        }
                        setRenameTarget(null);
                        const success = await renameItem(target, name);
                        if (success) {
                            if (selectedFileIds.includes(target.id)) {
                                setSelectedFiles([]);
                            }
                            if (clipboard?.sources.some((item) => item.id === target.id)) {
                                clearClipboard();
                            }
                        }
                        return success;
                    }}
                    title="Rename"
                    description="Enter a new name."
                    initialValue={renameTarget.name}
                    selectAllOnFocus
                    confirmLabel="Rename"
                    submittingLabel="Renaming…"
                />
            )}

            {messageBox && (
                <MessageBoxModal
                    isOpen
                    onClose={() => setMessageBox(null)}
                    title={messageBox.title}
                    description={messageBox.description}
                    variant="error"
                />
            )}

            <AddonMenuModal
                isOpen={addonStep === 'menu'}
                templates={applicableTemplates}
                onSelect={selectAddonTemplate}
                onClose={closeAddonFlow}
            />

            <AddonParamsModal
                isOpen={addonStep === 'params'}
                template={selectedTemplate}
                values={paramValues}
                isSubmitting={isAddonSubmitting}
                onValueChange={updateAddonParamValue}
                onConfirm={() => void confirmAddonParams()}
                onBack={goBackToAddonMenu}
                onClose={closeAddonFlow}
            />

            <AddonDownloadModal
                isOpen={addonStep === 'downloading'}
                progress={downloadProgress}
            />

            {addonResultMessage && (
                <MessageBoxModal
                    isOpen
                    onClose={closeAddonResult}
                    title={addonResultMessage.title}
                    description={addonResultMessage.description}
                    variant={addonResultMessage.variant}
                />
            )}

            {isOperationModalOpen && (
                <OperationProgressModal
                    isOpen={isOperationModalOpen}
                    operation={operation}
                    items={operationItems}
                    onClose={closeOperationModal}
                    autoCloseOnComplete={operation === 'rename'}
                />
            )}
        </div>
    );
}
