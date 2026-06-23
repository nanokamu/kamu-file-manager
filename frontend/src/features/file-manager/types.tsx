export type FileType = 'folder' | 'document' | 'image' | 'video' | 'pdf';

// const EDITABLE_FILE_TYPES = new Set<FileType>(['document']);

// export function canOpenInEditor(item: FileItem): boolean {
//     return item.type !== 'folder' && EDITABLE_FILE_TYPES.has(item.type);
// }

// examples:
// const MOCK_FILES: FileItem[] = [
//     { id: '1', name: 'Projects', type: 'folder', updatedAt: '2026-06-12', parentId: null },
//     { id: '2', name: 'Assets', type: 'folder', updatedAt: '2026-06-10', parentId: null },
//     { id: '3', name: 'Q2_Report.pdf', type: 'pdf', size: '4.2 MB', updatedAt: '2026-06-14', parentId: null },
//     { id: '4', name: 'Hero_Banner.png', type: 'image', size: '2.1 MB', updatedAt: '2026-06-13', parentId: null },
//     { id: '5', name: 'Intro_Video.mp4', type: 'video', size: '45.0 MB', updatedAt: '2026-05-28', parentId: null },
//     { id: '101', name: 'Website Redesign', type: 'folder', updatedAt: '2026-06-11', parentId: '1' },
//     { id: '102', name: 'Index.tsx', type: 'document', size: '12 KB', updatedAt: '2026-06-12', parentId: '1' },
//     { id: '201', name: 'styles.css', type: 'document', size: '4 KB', updatedAt: '2026-06-11', parentId: '101' },
// ];

export interface FileItem {
    id: string;
    name: string;
    type: FileType;
    size?: string;
    updatedAt: string;
    parentId: string | null;
}

export interface Crumb {
    id: string | null;
    name: string;
}
