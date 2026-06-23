import { useCallback, useEffect, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { OperationProgressModal } from '../../shared/components/OperationProgressModal';
import { useBatchOperationProgress } from '../../shared/hooks/useBatchOperationProgress';
import { Tooltip } from '../../shared/components/Tooltip';
import { computeSha256Hex } from '../../shared/utils/checksum.util';
import { decodeBlobAsText, encodeTextAsBlob } from '../../shared/utils/encoding.util';
import { downloadFile, uploadFileWithProgress } from '../file-manager/api/files.api';

interface FileItem {
    id: string;
    name: string;
    type: string;
    size?: string;
    updatedAt: string;
    parentId: string | null;
}

const MOCK_FILE_CONTENTS: Record<string, string> = {
    '102': `import React from 'react';\n\nexport const Index = () => {\n    return (\n        <div>\n            <h1>Hello World</h1>\n        </div>\n    );\n};`,
    '201': `body {\n    margin: 0;\n    font-family: sans-serif;\n    background-color: #f8fafc;\n}\n\n.container {\n    max-width: 1200px;\n    margin: 0 auto;\n}`
};

const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'md': return 'markdown';
        default: return 'plaintext';
    }
};

// Synchronously resolve mock file information from ?id= param (testing only)
const getMockFileData = (fileId: string) => {
    const mockFiles: FileItem[] = [
        { id: '102', name: 'Index.tsx', type: 'document', updatedAt: '2026-06-12', parentId: '1' },
        { id: '201', name: 'styles.css', type: 'document', updatedAt: '2026-06-11', parentId: '101' },
    ];

    const file = mockFiles.find((f) => f.id === fileId);
    if (!file) return null;

    return {
        name: file.name,
        language: getLanguageFromFilename(file.name),
        content: MOCK_FILE_CONTENTS[fileId] || '// No content available',
    };
};

const getInitialUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        locator: params.get('locator'),
        testId: params.get('id'),
    };
};

function splitFileLocator(locator: string): { parentLocator: string; fileName: string } {
    const normalized = locator.replace(/^\/+/, '');
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash === -1) {
        return { parentLocator: '/', fileName: normalized };
    }

    return {
        parentLocator: normalized.slice(0, lastSlash) || '/',
        fileName: normalized.slice(lastSlash + 1),
    };
}

export default function CodeEditor() {
    const [urlParams] = useState(() => getInitialUrlParams());
    const mockFile = urlParams.testId ? getMockFileData(urlParams.testId) : null;

    const [fileName, setFileName] = useState(
        () => mockFile?.name || (urlParams.locator ? 'Loading...' : 'File Not Found'),
    );
    const [editorLanguage, setEditorLanguage] = useState(
        () => getLanguageFromFilename(mockFile?.name || ''),
    );
    const [code, setCode] = useState(
        () => mockFile?.content || (urlParams.locator ? '// Loading file...' : '// Error: The requested file could not be located.'),
    );
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(() => Boolean(urlParams.locator && !mockFile));
    const [fileEncoding, setFileEncoding] = useState('utf-8');
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [isComparing, setIsComparing] = useState(false);
    const [sourceCode, setSourceCode] = useState<string | null>(null);
    const {
        items: operationItems,
        operation,
        isOpen: isSaveModalOpen,
        closeModal: closeSaveModal,
        runBatch,
    } = useBatchOperationProgress();

    useEffect(() => {
        document.title = 'Code Editor';
    }, []);

    useEffect(() => {
        if (!urlParams.locator || mockFile) {
            return;
        }

        let cancelled = false;

        downloadFile(urlParams.locator)
            .then(async ({ blob, fileName: downloadedName, encoding }) => {
                if (cancelled) {
                    return;
                }

                const content = await decodeBlobAsText(blob, encoding);

                setFileName(downloadedName);
                setEditorLanguage(getLanguageFromFilename(downloadedName));
                setFileEncoding(encoding);
                setCode(content);
            })
            .catch(() => {
                if (!cancelled) {
                    setCode('// Error: Failed to load file content.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mockFile, urlParams.locator]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(value);
        }
    };

    const handleSave = useCallback(async () => {
        if (!urlParams.locator) {
            return;
        }

        const saveBlob = encodeTextAsBlob(code, fileEncoding);
        const { parentLocator, fileName: saveFileName } = splitFileLocator(urlParams.locator);

        setIsSaving(true);

        try {
            await runBatch(
                'save',
                [{ id: 'save', label: saveFileName }],
                async (_index, update) => {
                    update({ status: 'in_progress', progress: 0 });

                    try {
                        const checksumValue = await computeSha256Hex(saveBlob);

                        await uploadFileWithProgress(
                            {
                                locator: parentLocator,
                                fileName: saveFileName,
                                file: saveBlob,
                                size: saveBlob.size,
                                overwrite: true,
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
                        const message = error instanceof Error ? error.message : 'Save failed';
                        update({ status: 'failed', progress: 0, error: message });
                    }
                },
            );
        } finally {
            setIsSaving(false);
        }
    }, [code, fileEncoding, urlParams.locator, runBatch]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();

                if (isSaving || isCompareMode || isLoading || isSaveModalOpen || !urlParams.locator) {
                    return;
                }

                void handleSave();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleSave, isSaving, isCompareMode, isLoading, isSaveModalOpen, urlParams.locator]);

    const fetchLatestSource = async (): Promise<string> => {
        if (urlParams.locator) {
            const { blob, encoding } = await downloadFile(urlParams.locator);
            return decodeBlobAsText(blob, encoding);
        }

        if (urlParams.testId) {
            const mockData = getMockFileData(urlParams.testId);
            if (!mockData) {
                throw new Error('Mock file not found');
            }
            return mockData.content;
        }

        throw new Error('No file locator available');
    };

    const handleCompare = async () => {
        if (isCompareMode) {
            setIsCompareMode(false);
            setSourceCode(null);
            return;
        }

        setIsComparing(true);

        try {
            const latestSource = await fetchLatestSource();
            setSourceCode(latestSource);
            setIsCompareMode(true);
        } catch {
            alert('Failed to fetch the latest file version for comparison.');
        } finally {
            setIsComparing(false);
        }
    };

    const hasChanges = sourceCode !== null && sourceCode !== code;

    return (
        // w-screen w-full max-w-none border-x-0, Original
        // w-full h-screen max-w-none border-x-0, New
        <div className="w-full h-full max-w-none border-x-0 h-screen flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden">
            {/* <div className="code-editor-shell w-full max-w-none border-x-0 h-screen flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden"> */}
            <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 z-10 text-left">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-xl leading-none" aria-hidden="true">📄</span>
                    <div className="min-w-0 leading-tight">
                        <span className="block truncate text-sm font-semibold text-slate-200">{fileName}</span>
                        <span className="block text-xs text-slate-400 uppercase tracking-wider">{editorLanguage}</span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-1.5 text-sm bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-800"
                    >
                        Close Tab
                    </button>
                    <button
                        onClick={handleCompare}
                        disabled={isComparing || isLoading || (!urlParams.locator && !urlParams.testId)}
                        className="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 font-medium rounded-lg shadow-sm transition-colors"
                    >
                        {isComparing ? 'Loading...' : isCompareMode ? 'Exit Compare' : 'Compare'}
                    </button>
                    <Tooltip
                        content={(
                            <span className="inline-flex items-center gap-1.5">
                                Save file
                                <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                                    Ctrl + S
                                </kbd>
                            </span>
                        )}
                    >
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isCompareMode || isLoading || !urlParams.locator}
                            aria-keyshortcuts="Control+S"
                            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition-colors"
                        >
                            {isSaving ? 'Saving...' : 'Save File'}
                        </button>
                    </Tooltip>
                </div>
            </header>

            <div className="flex-1 w-full relative">
                {isCompareMode && sourceCode !== null ? (
                    <DiffEditor
                        height="100%"
                        width="100%"
                        theme="vs-dark"
                        language={editorLanguage}
                        original={sourceCode}
                        modified={code}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: true },
                            automaticLayout: true,
                            wordWrap: 'on',
                            // padding: { top: 16 },
                            padding: { top: 8 },
                            readOnly: true,
                            renderSideBySide: true,
                        }}
                        loading={<div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400">Loading compare view...</div>}
                    />
                ) : (
                    <Editor
                        height="100%"
                        width="100%"
                        theme="vs-dark"
                        language={editorLanguage}
                        value={code}
                        onChange={handleEditorChange}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: true },
                            automaticLayout: true,
                            tabSize: 4,
                            wordWrap: 'on',
                            // padding: { top: 16 },
                            padding: { top: 8 },
                            readOnly: isLoading,
                        }}
                        loading={<div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400">Loading Editor...</div>}
                    />
                )}
                {(isLoading || isComparing) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-slate-300 text-sm">
                        {isComparing ? 'Fetching latest source...' : 'Loading file...'}
                    </div>
                )}
            </div>

            {isCompareMode && sourceCode !== null && (
                <div className="flex items-center justify-between px-6 py-2 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
                    <span>
                        {hasChanges
                            ? 'Changes detected — left: source (latest), right: your edits'
                            : 'No changes — your code matches the latest source'}
                    </span>
                    <span className="uppercase tracking-wider text-slate-500">Read-only compare mode</span>
                </div>
            )}

            {!isCompareMode && (
                <div className="flex items-center justify-between px-6 py-2 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
                    <span>
                        {/* {hasChanges
                            ? 'Changes detected — left: source (latest), right: your edits'
                            : 'No changes — your code matches the latest source'} */}
                    </span>
                    {/* <span className="tracking-wider bg-slate-950/80 text-xs text-slate-200">Encoding: {fileEncoding}</span> */}
                    <span className="uppercase tracking-wider bg-slate-950/80 text-xs text-slate-200">Encoding: {fileEncoding}</span>
                </div>
            )}
            {isSaveModalOpen && (
                <OperationProgressModal
                    isOpen={isSaveModalOpen}
                    operation={operation}
                    items={operationItems}
                    onClose={closeSaveModal}
                    autoCloseOnComplete
                    theme="dark"
                />
            )}
        </div>
    );
}