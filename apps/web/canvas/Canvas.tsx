'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from './useCanvas';
import { Element, Tool, Point, ElementType } from '../types';
import { createNewElement, updateElement } from '../tools/manager';
import { socket, connectSocket, disconnectSocket } from '../socket/socket';

import {
    Square,
    Circle,
    ArrowRight,
    Pencil,
    Type,
    MousePointer2,
    Hand,
    LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const icons: Record<Tool, React.ReactNode> = {
    select: <MousePointer2 size={20} />,
    rectangle: <Square size={20} />,
    ellipse: <Circle size={20} />,
    arrow: <ArrowRight size={20} />,
    freehand: <Pencil size={20} />,
    text: <Type size={20} />,
    pan: <Hand size={20} />,
};

import { isPointInElement } from '../utils/geom';

interface CanvasProps {
    roomId: string;
}

export const Canvas: React.FC<CanvasProps> = ({ roomId }) => {
    const elementsRef = useRef<Element[]>([]);
    const currentElementRef = useRef<Element | null>(null);
    const selectedElementsRef = useRef<string[]>([]);
    const [tool, setTool] = useState<Tool>('rectangle');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [cursors, setCursors] = useState<{ [userId: string]: Point }>({});
    const [roomUsers, setRoomUsers] = useState<{ userId: string; userName: string }[]>([]);
    const prevUsersRef = useRef<{ userId: string; userName: string }[]>([]);
    const joinSoundRef = useRef<HTMLAudioElement | null>(null);
    const exitSoundRef = useRef<HTMLAudioElement | null>(null);
    const [editingText, setEditingText] = useState<{ id: string; x: number; y: number; text: string } | null>(null);
    const { user, logout } = useAuth();

    const { canvasRef, render } = useCanvas(elementsRef, offset, scale);

    const screenToCanvas = useCallback((x: number, y: number) => {
        return {
            x: (x - offset.x) / scale,
            y: (y - offset.y) / scale,
        };
    }, [offset, scale]);

    useEffect(() => {
        if (!user) return;

        // Initialize audio
        joinSoundRef.current = new Audio('/join-sound.mp3');
        exitSoundRef.current = new Audio('/exit-sound.mp3');

        connectSocket();
        socket.emit('join-room', { roomId, user: { id: user.id, name: user.name } });

        socket.on('room-state', (elements: Element[]) => {
            elementsRef.current = elements;
            render();
        });

        socket.on('room-users', (users: { userId: string; userName: string }[]) => {
            if (prevUsersRef.current.length > 0) {
                if (users.length > prevUsersRef.current.length) {
                    joinSoundRef.current?.play().catch(e => console.log('Auto-play blocked'));
                } else if (users.length < prevUsersRef.current.length) {
                    exitSoundRef.current?.play().catch(e => console.log('Auto-play blocked'));
                }
            }
            setRoomUsers(users);
            prevUsersRef.current = users;
        });

        socket.on('element:update', (updatedElement: Element) => {
            const index = elementsRef.current.findIndex((el) => el.id === updatedElement.id);
            if (index !== -1) {
                elementsRef.current[index] = updatedElement;
            } else {
                elementsRef.current.push(updatedElement);
            }
            render();
        });

        socket.on('element:commit', (committedElement: Element) => {
            const index = elementsRef.current.findIndex((el) => el.id === committedElement.id);
            if (index !== -1) {
                elementsRef.current[index] = committedElement;
            } else {
                elementsRef.current.push(committedElement);
            }
            render();
        });

        socket.on('cursor:move', ({ userId, cursor }: { userId: string; cursor: Point }) => {
            setCursors(prev => ({ ...prev, [userId]: cursor }));
        });

        socket.on('element:stale', (serverElement: Element) => {
            const index = elementsRef.current.findIndex((el) => el.id === serverElement.id);
            if (index !== -1) {
                elementsRef.current[index] = serverElement;
                render();
            }
        });

        return () => {
            socket.off('room-state');
            socket.off('element:update');
            socket.off('element:commit');
            socket.off('cursor:move');
            socket.off('element:stale');
            socket.off('room-users');
            disconnectSocket();
        };
    }, [roomId, render, user]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const canvasPos = screenToCanvas(clientX, clientY);

        if (e.button === 1 || tool === 'pan') {
            setIsPanning(true);
            return;
        }

        setIsDrawing(true);

        if (tool === 'select') {
            const clickedElement = [...elementsRef.current].reverse().find(el =>
                isPointInElement(canvasPos.x, canvasPos.y, el)
            );
            if (clickedElement) {
                selectedElementsRef.current = [clickedElement.id];
                currentElementRef.current = clickedElement;
            } else {
                selectedElementsRef.current = [];
                currentElementRef.current = null;
            }
            render();
            return;
        }

        const newElement = createNewElement(tool as ElementType, canvasPos.x, canvasPos.y);
        currentElementRef.current = newElement;
        elementsRef.current.push(newElement);
        render();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY, movementX, movementY } = e;
        const canvasPos = screenToCanvas(clientX, clientY);

        // Sync cursor
        socket.emit('cursor:move', { roomId, cursor: canvasPos });

        if (isPanning) {
            setOffset(prev => ({ x: prev.x + movementX, y: prev.y + movementY }));
            return;
        }

        if (!isDrawing || !currentElementRef.current) return;

        const element = currentElementRef.current;

        let updated: Element;
        if (tool === 'select') {
            updated = updateElement(element, {
                x: element.x + movementX / scale,
                y: element.y + movementY / scale,
            });
        } else if (element.type === 'freehand') {
            const points = [...(element.points || []), canvasPos];
            updated = updateElement(element, { points });
        } else {
            updated = updateElement(element, {
                width: canvasPos.x - element.x,
                height: canvasPos.y - element.y,
            });
        }

        currentElementRef.current = updated;
        const index = elementsRef.current.findIndex((el) => el.id === updated.id);
        if (index !== -1) {
            elementsRef.current[index] = updated;
        }

        socket.emit('element:update', { roomId, element: updated });
        render();
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentElementRef.current) {
            if (tool === 'text') {
                const element = currentElementRef.current;
                setEditingText({ id: element.id, x: element.x, y: element.y, text: '' });
                // We'll commit it after text is entered
            } else {
                socket.emit('element:commit', { roomId, element: currentElementRef.current });
                if (tool !== 'select') {
                    currentElementRef.current = null;
                }
            }
        }
    };

    const handleTextSubmit = (text: string) => {
        if (!editingText) return;
        const index = elementsRef.current.findIndex(el => el.id === editingText.id);
        if (index !== -1) {
            const updated = updateElement(elementsRef.current[index], { text });
            elementsRef.current[index] = updated;
            socket.emit('element:commit', { roomId, element: updated });
        }
        setEditingText(null);
        currentElementRef.current = null;
        render();
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            const zoomSpeed = 0.001;
            const newScale = Math.min(Math.max(scale - e.deltaY * zoomSpeed, 0.1), 10);

            // Zoom toward cursor
            const { clientX, clientY } = e;
            const zoomFactor = newScale / scale;
            setOffset(prev => ({
                x: clientX - (clientX - prev.x) * zoomFactor,
                y: clientY - (clientY - prev.y) * zoomFactor,
            }));
            setScale(newScale);
        } else {
            setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-gray-50">
            {/* Toolbar */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex gap-4 p-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-10">
                {(['select', 'pan', 'rectangle', 'ellipse', 'arrow', 'freehand', 'text'] as Tool[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTool(t)}
                        className={`p-3 rounded-lg transition-all duration-200 ${tool === t
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        title={t.charAt(0).toUpperCase() + t.slice(1)}
                    >
                        {icons[t]}
                    </button>
                ))}

                <div className="w-[1px] bg-gray-200 mx-1" />

                <button
                    onClick={logout}
                    className="p-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>

                {user && (
                    <div className="flex items-center ml-2 pr-2">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm uppercase">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                        </div>
                    </div>
                )}
            </div>

            {/* Room Info */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10 pointer-events-none">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2 pointer-events-auto">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Room</span>
                    <span className="text-xs font-mono font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{roomId}</span>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 pointer-events-auto flex flex-col gap-2 min-w-[150px]">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50 pb-1 mb-1">
                        Collaborators ({roomUsers.length})
                    </span>
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                        {roomUsers.map((u) => (
                            <div key={u.userId} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                    {u.userName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-700 truncate">
                                    {u.userName} {u.userId === user?.id && <span className="text-[9px] text-gray-400">(You)</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                className={`block ${tool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            />

            {/* Peer Cursors */}
            {Object.entries(cursors).map(([userId, pos]) => (
                <div
                    key={userId}
                    className="absolute pointer-events-none z-50 transition-transform duration-75"
                    style={{
                        left: pos.x * scale + offset.x,
                        top: pos.y * scale + offset.y,
                    }}
                >
                    <MousePointer2 size={16} className="text-blue-500 fill-blue-500" />
                    <span className="ml-2 px-1 py-0.5 bg-blue-500 text-white text-[10px] rounded">User</span>
                </div>
            ))}

            {/* Text Input Overlay */}
            {editingText && (
                <textarea
                    autoFocus
                    className="absolute bg-transparent border-none outline-none p-0 m-0 resize-none font-sans text-[20px] overflow-hidden leading-none"
                    style={{
                        left: editingText.x * scale + offset.x,
                        top: editingText.y * scale + offset.y,
                        color: 'black',
                        width: 'auto',
                        height: 'auto',
                    }}
                    value={editingText.text}
                    onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                    onBlur={(e) => handleTextSubmit(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit(editingText.text);
                        }
                    }}
                />
            )}
        </div>
    );
};
