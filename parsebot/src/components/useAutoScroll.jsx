import { useRef, useEffect } from 'react';

export function useAutoScroll(dependencies) {
    const containerRef = useRef(null);

    useEffect(() => {
        const containerElem = containerRef.current;
        if(containerElem){
            containerElem.scrollTop = containerElem.scrollHeight;
        }
    },[dependencies]);
    return containerRef;
}