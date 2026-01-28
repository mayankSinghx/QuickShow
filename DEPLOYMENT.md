# Deployment Guide: Vercel & Beyond

Since this application uses **WebSockets (Socket.IO)** and a persistent **Express** backend, a standard Vercel-only deployment requires a specific strategy. Vercel's serverless functions do not support the long-lived connections required for real-time drawing.

---

## 🏗 Recommended Architecture

1.  **Frontend**: [Vercel](https://vercel.com) (Next.js App Router).
2.  **Backend**: [Railway](https://railway.app), [Render](https://render.com), or [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) (Persistent Node.js server).
3.  **Database**: [Vercel Postgres](https://vercel.com/storage/postgres), [Railway Postgres](https://railway.app/template/postgres), or [Supabase](https://supabase.com).

---

## 📡 Part 1: Deploying the Backend (Railway/Render)

Your Express server needs to stay "awake" to handle WebSocket events.

1.  **Prepare for Deployment**:
    - Ensure `apps/server/package.json` has a `start` script:
      ```json
      "scripts": {
        "build": "tsc",
        "start": "node dist/index.js"
      }
      ```
2.  **Environment Variables**: Set these in your hosting provider:
    - `DATABASE_URL`: Your production Postgres connection string.
    - `PORT`: Usually provided by the host (e.g., `8080`).
    - `JWT_SECRET`: A long random string.
3.  **CORS Setup**: Update `apps/server/src/index.ts` to allow your Vercel URL:
    ```typescript
    const io = new Server(httpServer, {
      cors: {
        origin: 'https://your-app-name.vercel.app',
        methods: ['GET', 'POST'],
      },
    });
    ```

---

## 💻 Part 2: Deploying the Frontend (Vercel)

1.  **Project Settings**:
    - **Root Directory**: `apps/web`
    - **Build Command**: `next build`
    - **Output Directory**: `.next`
2.  **Environment Variables**:
    - `NEXT_PUBLIC_SOCKET_URL`: The URL of your deployed backend (e.g., `https://your-backend.railway.app`).
    - `DATABASE_URL`: (Only if using Prisma on the frontend).
3.  **Connect Repo**: Point Vercel to your GitHub repo and select the `apps/web` folder as the root.

---

## 🗄 Part 3: Database (Prisma)

1.  **Migration**: Once your production DB is ready, run the migration from your local machine (pointing to the production URL) or via a CI/CD pipeline:
    ```bash
    npx prisma migrate deploy
    ```
2.  **Generated Client**: Ensure `npx prisma generate` runs during your backend's build step.

---

## ⚠️ Important Considerations

### 1. Serverless vs. Persistent
Vercel's **Edge** and **Serverless** functions have a timeout (usually 10s-60s). WebSockets require a connection that stays open for minutes or hours. This is why the backend **must** go to a persistent provider like Railway or Render.

### 2. HTTPS/WSS
Vercel and most cloud providers enforce HTTPS. Socket.IO will automatically upgrade to `wss://` (WebSocket Secure) if you provide an `https://` URL in `NEXT_PUBLIC_SOCKET_URL`.

### 3. Scaling
If you scale your backend to multiple instances, you will need a **Redis Adapter** for Socket.IO to ensure messages are broadcasted across all server instances. For a single-instance start, the current setup is perfect.
