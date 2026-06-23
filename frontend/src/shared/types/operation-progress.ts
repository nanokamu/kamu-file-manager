export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface OperationProgressItem {
    id: string;
    label: string;
    progress: number;
    status: OperationStatus;
    error?: string;
}

export type OperationKind = 'upload' | 'save' | 'copy' | 'move' | 'delete' | 'rename';

interface OperationLabelConfig {
    title: string;
    subtitleActive: (count: number) => string;
    subtitlePartialFailure: (completed: number, failed: number) => string;
    subtitleSuccess: (count: number) => string;
    subtitleFailed: string;
    itemStatus: Record<OperationStatus, string>;
    closeActive: string;
    closeIdle: string;
}

export const OPERATION_LABELS: Record<OperationKind, OperationLabelConfig> = {
    upload: {
        title: 'Uploading files',
        subtitleActive: (count) => `Uploading ${count} file${count === 1 ? '' : 's'}…`,
        subtitlePartialFailure: (completed, failed) => `${completed} uploaded, ${failed} failed`,
        subtitleSuccess: (count) => `${count} file${count === 1 ? '' : 's'} uploaded`,
        subtitleFailed: 'Upload failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Uploading…',
            completed: 'Done',
            failed: 'Failed',
        },
        closeActive: 'Uploading…',
        closeIdle: 'Close',
    },
    save: {
        title: 'Saving file',
        subtitleActive: () => 'Saving…',
        subtitlePartialFailure: () => 'Save failed',
        subtitleSuccess: () => 'File saved',
        subtitleFailed: 'Save failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Saving…',
            completed: 'Done',
            failed: 'Failed',
        },
        closeActive: 'Saving…',
        closeIdle: 'Close',
    },
    copy: {
        title: 'Copying files',
        subtitleActive: (count) => `Copying ${count} item${count === 1 ? '' : 's'}…`,
        subtitlePartialFailure: (completed, failed) => `${completed} copied, ${failed} failed`,
        subtitleSuccess: (count) => `${count} item${count === 1 ? '' : 's'} copied`,
        subtitleFailed: 'Copy failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Copying…',
            completed: 'Copied',
            failed: 'Failed',
        },
        closeActive: 'Copying…',
        closeIdle: 'Close',
    },
    move: {
        title: 'Moving files',
        subtitleActive: (count) => `Moving ${count} item${count === 1 ? '' : 's'}…`,
        subtitlePartialFailure: (completed, failed) => `${completed} moved, ${failed} failed`,
        subtitleSuccess: (count) => `${count} item${count === 1 ? '' : 's'} moved`,
        subtitleFailed: 'Move failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Moving…',
            completed: 'Moved',
            failed: 'Failed',
        },
        closeActive: 'Moving…',
        closeIdle: 'Close',
    },
    delete: {
        title: 'Deleting files',
        subtitleActive: (count) => `Deleting ${count} item${count === 1 ? '' : 's'}…`,
        subtitlePartialFailure: (completed, failed) => `${completed} deleted, ${failed} failed`,
        subtitleSuccess: (count) => `${count} item${count === 1 ? '' : 's'} deleted`,
        subtitleFailed: 'Delete failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Deleting…',
            completed: 'Deleted',
            failed: 'Failed',
        },
        closeActive: 'Deleting…',
        closeIdle: 'Close',
    },
    rename: {
        title: 'Renaming',
        subtitleActive: () => 'Renaming…',
        subtitlePartialFailure: () => 'Rename failed',
        subtitleSuccess: () => 'Renamed',
        subtitleFailed: 'Rename failed',
        itemStatus: {
            pending: 'Waiting…',
            in_progress: 'Renaming…',
            completed: 'Renamed',
            failed: 'Failed',
        },
        closeActive: 'Renaming…',
        closeIdle: 'Close',
    },
};

export function isOperationActive(items: OperationProgressItem[]): boolean {
    return items.some(
        (item) => item.status === 'pending' || item.status === 'in_progress',
    );
}
