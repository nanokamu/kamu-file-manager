import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import type { UnifiedResource } from '../../../api/types';
import { useBatchOperationProgress } from '../../../shared/hooks/useBatchOperationProgress';
import { computeSha256Hex } from '../../../shared/utils/checksum.util';
import {
    copyFile,
    createFolder as createFolderApi,
    deleteFile,
    downloadFile,
    downloadFolderAsZip,
    listFiles,
    moveFile,
    uploadFileWithProgress,
} from '../api/files.api';
import { FILE_LIST_AUTO_REFRESH_INTERVAL_MS } from '../config/file-manager.config';
import type { Crumb, FileItem, FileType } from '../types';
import { areFileListsEqual } from '../utils/file-list-compare.util';
import {
    basename,
    joinLocator,
    normalizeLocator,
    parentLocator,
    resolveUniqueCopyName,
} from '../utils/locator.util';

type ClipboardMode = 'copy' | 'move';

interface ClipboardState {
    mode: ClipboardMode;
    sources: FileItem[];
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === filename.length - 1) {
        return '';
    }
    return filename.slice(lastDot + 1).toLowerCase();
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']);

function resourceToFileType(resource: UnifiedResource): FileType {
    if (resource.type === 'directory') {
        return 'folder';
    }

    const ext = getFileExtension(resource.name);
    if (IMAGE_EXTENSIONS.has(ext)) {
        return 'image';
    }
    if (VIDEO_EXTENSIONS.has(ext)) {
        return 'video';
    }
    if (ext === 'pdf') {
        return 'pdf';
    }
    return 'document';
}

function formatUpdatedAt(updatedAt: string): string {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function mapResourceToFileItem(resource: UnifiedResource, parentId: string | null): FileItem {
    return {
        id: resource.path,
        name: resource.name,
        type: resourceToFileType(resource),
        size: resource.size !== undefined ? formatFileSize(resource.size) : undefined,
        updatedAt: formatUpdatedAt(resource.updatedAt),
        parentId,
    };
}

function breadcrumbsFromPath(path: string | null): Crumb[] {
    const crumbs: Crumb[] = [{ id: null, name: 'Root' }];
    if (!path || path === '/') {
        return crumbs;
    }

    const segments = path.split('/').filter(Boolean);
    let currentPath = '';
    for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        crumbs.push({ id: currentPath, name: segment });
    }
    return crumbs;
}

function currentFolderPath(currentFolderId: string | null): string {
    return currentFolderId ?? '/';
}

function apiParentLocator(currentFolderId: string | null): string {
    return currentFolderId ?? '';
}

export function useFileActions() {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
    const loadRequestIdRef = useRef(0);
    const lastResourcesRef = useRef<UnifiedResource[]>([]);

    const {
        items: operationItems,
        operation,
        isOpen: isOperationModalOpen,
        closeModal: closeOperationModal,
        runBatch,
    } = useBatchOperationProgress();

    const applyResources = useCallback((resources: UnifiedResource[], folderId: string | null) => {
        lastResourcesRef.current = resources;
        setFiles(
            resources.map((resource) =>
                mapResourceToFileItem(resource, folderId),
            ),
        );
    }, []);

    const refreshFileList = useCallback((options?: { onlyIfChanged?: boolean }) => {
        const onlyIfChanged = options?.onlyIfChanged ?? false;
        const requestId = ++loadRequestIdRef.current;
        const folderId = currentFolderId;

        listFiles(folderId ?? undefined)
            .then((resources) => {
                if (requestId !== loadRequestIdRef.current) {
                    return;
                }

                if (onlyIfChanged && areFileListsEqual(lastResourcesRef.current, resources)) {
                    return;
                }

                applyResources(resources, folderId);
            })
            .catch((error) => {
                if (requestId !== loadRequestIdRef.current) {
                    return;
                }

                console.error('Failed to load files:', error);
                if (!onlyIfChanged) {
                    lastResourcesRef.current = [];
                    setFiles([]);
                }
            });
    }, [currentFolderId, applyResources]);

    const loadFiles = useCallback(() => {
        refreshFileList();
    }, [refreshFileList]);

    useEffect(() => {
        loadFiles();

        return () => {
            loadRequestIdRef.current += 1;
        };
    }, [loadFiles]);

    useEffect(() => {
        if (FILE_LIST_AUTO_REFRESH_INTERVAL_MS <= 0) {
            return;
        }

        const maybeAutoRefresh = () => {
            if (document.visibilityState !== 'visible' || isOperationModalOpen) {
                return;
            }
            refreshFileList({ onlyIfChanged: true });
        };

        const intervalId = window.setInterval(
            maybeAutoRefresh,
            FILE_LIST_AUTO_REFRESH_INTERVAL_MS,
        );

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                maybeAutoRefresh();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [refreshFileList, isOperationModalOpen]);

    const breadcrumbs = useMemo<Crumb[]>(
        () => breadcrumbsFromPath(currentFolderId),
        [currentFolderId],
    );

    const folderItems = files;

    const searchItems = useCallback((query: string) => {
        const normalizedQuery = query.toLowerCase();
        return files.filter((file) =>
            file.name.toLowerCase().includes(normalizedQuery),
        );
    }, [files]);

    const navigateToFolder = useCallback((id: string | null) => {
        setCurrentFolderId(id);
    }, []);

    const openFolder = useCallback((item: FileItem) => {
        if (item.type === 'folder') {
            setCurrentFolderId(item.id);
        }
    }, []);

    const getItemLabel = useCallback((locator: string) => {
        return files.find((file) => file.id === locator)?.name ?? basename(locator);
    }, [files]);

    const deleteItems = useCallback(async (ids: string[]) => {
        if (ids.length === 0) {
            return;
        }

        let hadFailure = false;

        await runBatch(
            'delete',
            ids.map((id) => ({ id, label: getItemLabel(id) })),
            async (index, update) => {
                update({ status: 'in_progress', progress: 0 });

                try {
                    await deleteFile(normalizeLocator(ids[index]));
                    update({ status: 'completed', progress: 100 });
                } catch (error) {
                    hadFailure = true;
                    const message = error instanceof Error ? error.message : 'Delete failed';
                    update({ status: 'failed', progress: 0, error: message });
                }
            },
        );

        loadFiles();

        return !hadFailure;
    }, [getItemLabel, runBatch, loadFiles]);

    const uploadFiles = useCallback(async (filesToUpload: File[]) => {
        if (filesToUpload.length === 0) {
            return;
        }

        const locator = apiParentLocator(currentFolderId);

        await runBatch(
            'upload',
            filesToUpload.map((file, index) => ({
                id: `${index}-${file.name}`,
                label: file.name,
            })),
            async (index, update) => {
                const file = filesToUpload[index];

                update({ status: 'in_progress', progress: 0 });

                try {
                    const checksumValue = await computeSha256Hex(file);

                    await uploadFileWithProgress(
                        {
                            locator,
                            fileName: file.name,
                            file,
                            size: file.size,
                            overwrite: false,
                            checksumAlgorithm: 'sha256',
                            checksumValue,
                        },
                        (loaded, total) => {
                            const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
                            update({ progress });
                        },
                    );

                    update({ progress: 100, status: 'completed' });
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Upload failed';
                    update({ status: 'failed', error: message });
                }
            },
        );

        loadFiles();
    }, [currentFolderId, runBatch, loadFiles]);

    const copyItems = useCallback((ids: string[]) => {
        if (ids.length === 0) {
            return;
        }

        const sources = ids
            .map((id) => files.find((file) => file.id === id))
            .filter((item): item is FileItem => item !== undefined);

        if (sources.length === 0) {
            return;
        }

        setClipboard({ mode: 'copy', sources });
    }, [files]);

    const moveItems = useCallback((ids: string[]) => {
        if (ids.length === 0) {
            return;
        }

        const sources = ids
            .map((id) => files.find((file) => file.id === id))
            .filter((item): item is FileItem => item !== undefined);

        if (sources.length === 0) {
            return;
        }

        setClipboard({ mode: 'move', sources });
    }, [files]);

    const clearClipboard = useCallback(() => {
        setClipboard(null);
    }, []);

    const pasteItems = useCallback(async () => {
        if (!clipboard || clipboard.sources.length === 0) {
            return;
        }

        const targetFolder = currentFolderPath(currentFolderId);
        const targetFolderNormalized = normalizeLocator(targetFolder === '/' ? '' : targetFolder);
        const existingNames = folderItems.map((item) => item.name);
        const usedNames = [...existingNames];

        const operations: { id: string; label: string; source: string; destination: string; recursive: boolean }[] = [];

        for (const sourceItem of clipboard.sources) {
            const sourceLocator = sourceItem.id;
            const sourceNormalized = normalizeLocator(sourceLocator);
            const sourceParent = parentLocator(sourceLocator);
            const isFolder = sourceItem.type === 'folder';
            const baseName = sourceItem.name;

            if (clipboard.mode === 'move') {
                if (sourceParent === targetFolder) {
                    continue;
                }

                const destination = joinLocator(
                    targetFolderNormalized || null,
                    baseName,
                );

                operations.push({
                    id: sourceLocator,
                    label: baseName,
                    source: sourceNormalized,
                    destination,
                    recursive: isFolder,
                });
                continue;
            }

            const sameParent = sourceParent === targetFolder;
            const nameCollision = usedNames.some(
                (name) => name.toLowerCase() === baseName.toLowerCase(),
            );

            const destinationName = sameParent || nameCollision
                ? resolveUniqueCopyName(baseName, usedNames, isFolder)
                : baseName;

            usedNames.push(destinationName);

            operations.push({
                id: sourceLocator,
                label: destinationName,
                source: sourceNormalized,
                destination: joinLocator(targetFolderNormalized || null, destinationName),
                recursive: isFolder,
            });
        }

        if (operations.length === 0) {
            setClipboard(null);
            return;
        }

        const operationKind = clipboard.mode;
        let hadFailure = false;

        await runBatch(
            operationKind,
            operations.map((op) => ({ id: op.id, label: op.label })),
            async (index, update) => {
                const op = operations[index];

                update({ status: 'in_progress', progress: 0 });

                try {
                    if (operationKind === 'copy') {
                        await copyFile({
                            sourceLocator: op.source,
                            destinationLocator: op.destination,
                            recursive: op.recursive,
                        });
                    } else {
                        await moveFile({
                            sourceLocator: op.source,
                            destinationLocator: op.destination,
                            recursive: op.recursive,
                        });
                    }

                    update({ status: 'completed', progress: 100 });
                } catch (error) {
                    hadFailure = true;
                    const message = error instanceof Error ? error.message : `${operationKind} failed`;
                    update({ status: 'failed', progress: 0, error: message });
                }
            },
        );

        setClipboard(null);
        if (!hadFailure) {
            loadFiles();
        }
    }, [clipboard, currentFolderId, folderItems, runBatch, loadFiles]);

    const submitCreateFolder = useCallback(async (
        folderName: string,
    ): Promise<{ success: boolean; error?: string }> => {
        const trimmed = folderName.trim();
        if (!trimmed) {
            return { success: false };
        }

        if (files.some((file) => file.name === trimmed)) {
            return { success: false, error: 'Folder already exists' };
        }

        const parentLocator = apiParentLocator(currentFolderId);

        try {
            await createFolderApi({ parentLocator, folderName: trimmed });
            loadFiles();
            return { success: true };
        } catch (error) {
            console.error('Failed to create folder:', error);
            if (error instanceof ApiError && error.status === 409) {
                return { success: false, error: error.message };
            }
            return { success: false, error: 'Failed to create folder' };
        }
    }, [currentFolderId, files, loadFiles]);

    const renameItem = useCallback(async (item: FileItem, newName: string): Promise<boolean> => {
        const trimmed = newName.trim();
        if (!trimmed) {
            return false;
        }

        if (trimmed === item.name) {
            return true;
        }

        const sourceLocator = normalizeLocator(item.id);
        const parent = parentLocator(item.id);
        const parentNormalized = parent === '/' ? null : normalizeLocator(parent);
        const destinationLocator = joinLocator(parentNormalized, trimmed);

        let hadFailure = false;

        await runBatch(
            'rename',
            [{ id: item.id, label: item.name }],
            async (_index, update) => {
                update({ status: 'in_progress', progress: 0 });

                try {
                    await moveFile({
                        sourceLocator,
                        destinationLocator,
                        recursive: item.type === 'folder',
                    });
                    update({ status: 'completed', progress: 100 });
                } catch (error) {
                    hadFailure = true;
                    const message = error instanceof Error ? error.message : 'Rename failed';
                    update({ status: 'failed', progress: 0, error: message });
                }
            },
        );

        if (!hadFailure) {
            loadFiles();
        }

        return !hadFailure;
    }, [runBatch, loadFiles]);

    const openInEditor = useCallback((item: FileItem) => {
        const params = new URLSearchParams({ locator: item.id });
        window.open(`/editor?${params.toString()}`, '_blank', 'noopener,noreferrer');
    }, []);

    const downloadItem = useCallback(async (item: FileItem) => {
        try {
            const { blob, fileName } = await downloadFile(item.id);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    }, []);

    const downloadFolderAsZipItem = useCallback(async (item: FileItem) => {
        try {
            const { blob, fileName } = await downloadFolderAsZip(item.id);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download folder as ZIP:', error);
        }
    }, []);

    return {
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
        refreshFileList,
    };
}
