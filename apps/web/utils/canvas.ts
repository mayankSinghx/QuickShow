import { Element, Point } from '../types';

export const drawElement = (ctx: CanvasRenderingContext2D, element: Element) => {
    ctx.strokeStyle = element.strokeColor;
    ctx.fillStyle = element.fillColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y, width, height, type, points, text } = element;

    switch (type) {
        case 'rectangle':
            ctx.strokeRect(x, y, width, height);
            if (element.fillColor !== 'transparent') {
                ctx.fillRect(x, y, width, height);
            }
            break;
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI);
            ctx.stroke();
            if (element.fillColor !== 'transparent') {
                ctx.fill();
            }
            break;
        case 'arrow':
            drawArrow(ctx, x, y, x + width, y + height);
            break;
        case 'freehand':
            if (points && points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            }
            break;
        case 'text':
            if (text) {
                ctx.font = '20px Arial';
                ctx.textBaseline = 'top';
                ctx.strokeText(text, x, y);
            }
            break;
    }
};

const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLength = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
};
