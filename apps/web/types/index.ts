export type ElementType = 'rectangle' | 'ellipse' | 'arrow' | 'freehand' | 'text';

export type Point = {
    x: number;
    y: number;
};

export type Element = {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    points?: Point[];
    text?: string;
    version: number;
    updatedAt: number;
};

export type Tool = ElementType | 'select' | 'pan';
