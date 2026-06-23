import { useEffect, useRef, useState } from 'react';

interface TruncatedTextProps {
    text: string;
    className?: string;
}

export function TruncatedText({ text, className = '' }: TruncatedTextProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const checkTruncation = () => {
            setIsTruncated(el.scrollWidth > el.clientWidth);
        };

        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(el);

        return () => observer.disconnect();
    }, [text]);

    return (
        <span
            ref={ref}
            className={`block min-w-0 truncate ${className}`}
            title={isTruncated ? text : undefined}
        >
            {text}
        </span>
    );
}
