import { Element, Point } from '../types';

export const isPointInElement = (x: number, y: number, element: Element): boolean => {
    const { x: ex, y: ey, width: ew, height: eh, type, points } = element;

    switch (type) {
        case 'rectangle':
        case 'ellipse':
            const minX = Math.min(ex, ex + ew);
            const maxX = Math.max(ex, ex + ew);
            const minY = Math.min(ey, ey + eh);
            const maxY = Math.max(ey, ey + eh);
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        case 'arrow':
        case 'freehand':
            // Simplified: check bounding box for now
            if (points) {
                const xs = points.map(p => p.x);
                const ys = points.map(p => p.y);
                return x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys);
            }
            return false;
        case 'text':
            return x >= ex && x <= ex + 100 && y >= ey && y <= ey + 20; // Hardcoded text box size
        default:
            return false;
    }
};
