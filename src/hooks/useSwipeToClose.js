import { useEffect, useRef } from 'react';

/**
 * Хук для свайпа модалки вниз для закрытия.
 * @param {() => void} onClose - функция закрытия
 * @returns {React.RefObject} - ref для прикрепления к .modal-sheet
 */
export function useSwipeToClose(onClose) {
    const sheetRef = useRef(null);

    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet) return;

        let startY = 0, currentY = 0, lastY = 0, velocity = 0, rafId = null;
        const SPRING  = 'transform .38s cubic-bezier(.2,.8,.4,1)';
        const DISMISS = 'transform .32s cubic-bezier(.4,0,1,1)';

        function onTouchStart(e) {
            startY = e.touches[0].clientY;
            lastY  = startY;
            currentY = 0;
            velocity = 0;
            cancelAnimationFrame(rafId);
            sheet.style.transition = 'none';
        }

        function onTouchMove(e) {
            const y = e.touches[0].clientY;
            velocity = y - lastY;
            lastY    = y;
            const dy = y - startY;
            if (dy < 0) return;
            currentY = dy;
            rafId = requestAnimationFrame(() => {
                sheet.style.transform = `translateY(${currentY}px)`;
            });
        }

        function onTouchEnd() {
            cancelAnimationFrame(rafId);
            if (currentY > 120 || velocity > 10) {
                sheet.style.transition = DISMISS;
                sheet.style.transform  = 'translateY(105%)';
                setTimeout(() => {
                    sheet.style.transition = '';
                    sheet.style.transform  = '';
                    onClose();
                }, 320);
            } else {
                sheet.style.transition = SPRING;
                sheet.style.transform  = 'translateY(0)';
            }
            currentY = 0;
            velocity = 0;
        }

        sheet.addEventListener('touchstart', onTouchStart, { passive: true });
        sheet.addEventListener('touchmove',  onTouchMove,  { passive: true });
        sheet.addEventListener('touchend',   onTouchEnd,   { passive: true });

        return () => {
            sheet.removeEventListener('touchstart', onTouchStart);
            sheet.removeEventListener('touchmove',  onTouchMove);
            sheet.removeEventListener('touchend',   onTouchEnd);
        };
    }, [onClose]);

    return sheetRef;
}