import { createPortal } from 'react-dom';
import type { SelectionBox } from '../hooks/useDragRowSelection';

interface DragSelectionBoxProps {
    box: SelectionBox | null;
}

export function DragSelectionBox({ box }: DragSelectionBoxProps) {
    if (!box) return null;

    return createPortal(
        <div
            className="fixed z-50 pointer-events-none border border-blue-400/60 bg-blue-400/10 rounded-sm"
            style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
            }}
        />,
        document.body,
    );
}
