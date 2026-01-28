import { nanoid } from 'nanoid';
import { Element, ElementType, Point } from '../types';

export const createNewElement = (
    type: ElementType,
    x: number,
    y: number,
    strokeColor: string = '#000000',
    fillColor: string = 'transparent',
    strokeWidth: number = 2
): Element => {
    return {
        id: nanoid(),
        type,
        x,
        y,
        width: 0,
        height: 0,
        rotation: 0,
        strokeColor,
        fillColor,
        strokeWidth,
        version: 1,
        updatedAt: Date.now(),
        points: type === 'freehand' ? [{ x, y }] : undefined,
    };
};

export const updateElement = (element: Element, updates: Partial<Element>): Element => {
    return {
        ...element,
        ...updates,
        version: element.version + 1,
        updatedAt: Date.now(),
    };
};
