import { useRef, useEffect, useCallback } from 'react';
import { Element } from '../types';
import { drawElement } from '../utils/canvas';

export const useCanvas = (
    elementsRef: React.MutableRefObject<Element[]>,
    offset: { x: number; y: number },
    scale: number
) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Apply pan and zoom
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // Draw grid
        drawGrid(ctx, canvas.width / scale, canvas.height / scale, offset, scale);

        // Draw elements
        elementsRef.current.forEach((element) => {
            drawElement(ctx, element);
        });

        ctx.restore();
    }, [elementsRef, offset, scale]);

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: { x: number; y: number }, scale: number) => {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1 / scale;
        const gridSize = 50;

        const startX = Math.floor(-offset.x / scale / gridSize) * gridSize;
        const startY = Math.floor(-offset.y / scale / gridSize) * gridSize;
        const endX = startX + width + gridSize;
        const endY = startY + height + gridSize;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            render();
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [render]);

    return { canvasRef, render };
};
