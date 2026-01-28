import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['quickshow-plum.vercel.app', 'http://localhost:3000'], // In production, restrict this
        methods: ['GET', 'POST'],
    },
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
