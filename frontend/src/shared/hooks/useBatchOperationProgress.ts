import { useCallback, useState } from 'react';
import type { OperationKind, OperationProgressItem } from '../types/operation-progress';

export function useBatchOperationProgress() {
    const [items, setItems] = useState<OperationProgressItem[]>([]);
    const [operation, setOperation] = useState<OperationKind>('upload');
    const [isOpen, setIsOpen] = useState(false);

    const closeModal = useCallback(() => {
        const isActive = items.some(
            (item) => item.status === 'pending' || item.status === 'in_progress',
        );

        if (isActive) {
            return;
        }

        setIsOpen(false);
        setItems([]);
    }, [items]);

    const runBatch = useCallback(async (
        op: OperationKind,
        inputItems: { id: string; label: string }[],
        handler: (
            index: number,
            update: (patch: Partial<OperationProgressItem>) => void,
        ) => Promise<void>,
    ): Promise<void> => {
        const initial: OperationProgressItem[] = inputItems.map((item) => ({
            ...item,
            progress: 0,
            status: 'pending',
        }));

        setOperation(op);
        setItems(initial);
        setIsOpen(true);

        for (let index = 0; index < inputItems.length; index++) {
            const update = (patch: Partial<OperationProgressItem>) => {
                setItems((prev) =>
                    prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ...patch } : item,
                    ),
                );
            };

            await handler(index, update);
        }
    }, []);

    return { items, operation, isOpen, closeModal, runBatch };
}
