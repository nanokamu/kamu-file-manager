export function basename(locator: string): string {
    const normalized = locator.replace(/^\/+/, '');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

export function parentLocator(locator: string): string {
    const normalized = locator.replace(/^\/+/, '');
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash === -1) {
        return '/';
    }

    const parent = normalized.slice(0, lastSlash);
    return parent || '/';
}

export function joinLocator(folder: string | null, name: string): string {
    const folderPath = folder && folder !== '/' ? folder.replace(/^\/+/, '') : '';

    if (!folderPath) {
        return name;
    }

    return `${folderPath}/${name}`;
}

export function normalizeLocator(locator: string): string {
    return locator.replace(/^\/+/, '');
}

export function resolveUniqueCopyName(
    baseName: string,
    existingNames: string[],
    isFolder: boolean,
): string {
    const existing = new Set(existingNames.map((name) => name.toLowerCase()));

    if (!existing.has(baseName.toLowerCase())) {
        return baseName;
    }

    const lastDot = baseName.lastIndexOf('.');
    const hasExtension = lastDot > 0 && !isFolder;
    const stem = hasExtension ? baseName.slice(0, lastDot) : baseName;
    const extension = hasExtension ? baseName.slice(lastDot) : '';

    let candidate = `${stem}-copy${extension}`;
    if (!existing.has(candidate.toLowerCase())) {
        return candidate;
    }

    let counter = 2;
    while (true) {
        candidate = hasExtension
            ? `${stem}-copy (${counter})${extension}`
            : `${stem}-copy (${counter})`;

        if (!existing.has(candidate.toLowerCase())) {
            return candidate;
        }

        counter++;
    }
}
