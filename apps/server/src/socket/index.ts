import { Server, Socket } from 'socket.io';
import prisma from '../db/prisma';

export const setupSocketHandlers = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', async ({ roomId, user }: { roomId: string; user: { id: string, name: string } }) => {
            socket.join(roomId);
            (socket as any).userId = user.id;
            (socket as any).userName = user.name || 'Anonymous';
            (socket as any).roomId = roomId;

            console.log(`User ${user.name} joined room ${roomId}`);

            // Broadcast active users in room
            const broadcastRoomUsers = async () => {
                const sockets = await io.in(roomId).fetchSockets();
                const users = sockets.map(s => ({
                    userId: (s as any).userId,
                    userName: (s as any).userName
                }));
                io.to(roomId).emit('room-users', users);
            };

            await broadcastRoomUsers();

            // Load room state
            try {
                let room = await prisma.room.findUnique({
                    where: { id: roomId },
                    include: { elements: true },
                });

                if (!room) {
                    room = await prisma.room.create({
                        data: { id: roomId },
                        include: { elements: true },
                    });
                }

                socket.emit('room-state', room.elements);
            } catch (error) {
                console.error('Error loading room state:', error);
            }
        });

        socket.on('element:update', ({ roomId, element }: { roomId: string; element: any }) => {
            // Broadcast update to others in the room
            socket.to(roomId).emit('element:update', element);
        });

        socket.on('element:commit', async ({ roomId, element }: { roomId: string; element: any }) => {
            try {
                // Last-write-wins logic using version + updatedAt
                const existingElement = await prisma.element.findUnique({
                    where: { id: element.id },
                });

                if (existingElement) {
                    if (
                        element.version > existingElement.version ||
                        (element.version === existingElement.version && element.updatedAt > existingElement.updatedAt.getTime())
                    ) {
                        // Update existing element and create a version entry
                        await prisma.$transaction([
                            prisma.element.update({
                                where: { id: element.id },
                                data: {
                                    ...element,
                                    updatedAt: new Date(element.updatedAt),
                                    points: element.points ? JSON.parse(JSON.stringify(element.points)) : undefined,
                                },
                            }),
                            prisma.elementVersion.create({
                                data: {
                                    ...element,
                                    elementId: element.id,
                                    id: undefined, // Let DB generate cuid
                                    updatedAt: new Date(element.updatedAt),
                                    points: element.points ? JSON.parse(JSON.stringify(element.points)) : undefined,
                                },
                            }),
                        ]);
                        // Broadcast commit to others
                        socket.to(roomId).emit('element:commit', element);
                    } else {
                        // Reject stale update by sending back the current state
                        socket.emit('element:stale', existingElement);
                    }
                } else {
                    // Create new element
                    await prisma.$transaction([
                        prisma.element.create({
                            data: {
                                ...element,
                                roomId,
                                updatedAt: new Date(element.updatedAt),
                                points: element.points ? JSON.parse(JSON.stringify(element.points)) : undefined,
                            },
                        }),
                        prisma.elementVersion.create({
                            data: {
                                ...element,
                                elementId: element.id,
                                id: undefined,
                                updatedAt: new Date(element.updatedAt),
                                points: element.points ? JSON.parse(JSON.stringify(element.points)) : undefined,
                            },
                        }),
                    ]);
                    socket.to(roomId).emit('element:commit', element);
                }
            } catch (error) {
                console.error('Error committing element:', error);
            }
        });

        socket.on('cursor:move', ({ roomId, cursor }: { roomId: string; cursor: any }) => {
            socket.to(roomId).emit('cursor:move', { userId: socket.id, cursor });
        });

        socket.on('disconnect', async () => {
            const roomId = (socket as any).roomId;
            if (roomId) {
                // Fetch remaining sockets in the room
                const sockets = await io.in(roomId).fetchSockets();
                const users = sockets.map(s => ({
                    userId: (s as any).userId,
                    userName: (s as any).userName
                }));
                // Broadcast updated user list to the room
                io.to(roomId).emit('room-users', users);
            }
            console.log('User disconnected:', socket.id);
        });
    });
};
