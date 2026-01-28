# Real-Time Collaborative Drawing App Architecture

This document outlines the architecture, data flow, and technical implementation details of the collaborative drawing application.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, shadcn/ui.
- **Canvas Rendering**: HTML5 Canvas API (Vector-based rendering).
- **Backend**: Node.js, Express, Socket.IO.
- **Database**: PostgreSQL with Prisma ORM.
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs.

---

## 🏗 System Architecture
The application is structured as a monorepo with two main packages:

### 1. Frontend (`apps/web`)
The frontend is the "Source of Truth" for drawing operations. It handles user interaction, local rendering, and optimistic updates.

- **Canvas Management**: Uses standard React `useRef` to store canvas elements and properties. This avoids React's re-render cycle, allowing for smooth 60fps drawing.
- **Tools**: Each tool (Rectangle, Ellipse, Arrow, Freehand, Text) is encapsulated in a manager that generates element objects.
- **Real-time Sync**: A Socket.IO client listens for remote updates and broadcasts local changes.
- **Auth Context**: Manages user sessions, tokens, and route protection.

### 2. Backend (`apps/server`)
The backend acts as a relay for real-time messages and a persistent store for drawing history.

- **Socket.IO Server**: Manages rooms and broadcasts element-level diffs between clients.
- **Prisma & Postgres**: Persists the current state of every room and maintains a versioned history of every element.
- **Authentication**: Handles user registration and login, issuing JWTs for secure communication.

---

## 🔄 Data Flow

### 1. Collaborative Drawing Flow
The drawing flow follows an **Optimistic Update** strategy:

1.  **Pointer Down**: A new `Element` is created locally with a unique `nanoid`.
2.  **Pointer Move**: 
    - The element is updated in the local `elementsRef`.
    - The canvas is re-rendered immediately.
    - An `element:update` event is emitted via Socket.IO (throttled).
3.  **Server Relay**: The server receives `element:update` and broadcasts it to all other users in the same `roomId`.
4.  **Pointer Up**: 
    - An `element:commit` event is sent to the server.
    - The server persists the finalized element to the PostgreSQL database.
5.  **Conflict Resolution**: If two users edit the same element simultaneously, the server applies a **Last-Write-Wins** strategy using the `version` and `updatedAt` fields.

### 2. Authentication Flow
1.  **Signup/Login**: User sends credentials to the server.
2.  **JWT Issuance**: Server verifies credentials and returns a signed JWT.
3.  **Persistence**: The frontend stores the token in `localStorage`.
4.  **Guarded Routes**: The `AuthProvider` checks for the token on mount. If missing, it redirects the user to `/login`.
5.  **Authorized Requests**: The token is included in the headers for sensitive operations (future expansion).

---

## 🗄 Database Schema (Prisma)

- **User**: Stores credentials and profile info.
- **Room**: Represents a shared drawing space.
- **Element**: Stores the current state of a drawing object (position, dimensions, color, type).
- **ElementVersion**: Stores every committed state of an element, allowing for undo/redo or history tracking in future versions.

---

## 🎨 Rendering Logic

Rendering is handled by a custom `render()` loop in the `useCanvas` hook:
1.  **Clear**: `ctx.clearRect()` clears the viewport.
2.  **Transform**: `ctx.translate()` and `ctx.scale()` are applied based on the current Pan and Zoom levels.
3.  **Grid**: A procedural grid is drawn for visual reference.
4.  **Elements**: Every element in the `elementsRef` array is iterated and drawn using specific logic for its `type`.
5.  **Peer Cursors**: Synchronized cursors are rendered as HTML overlays to maintain high-performance drawing on the canvas layer.

---

## ⚡ Performance Optimization

- **No React State for Drawing**: Using `useRef` for elements prevents thousands of React lifecycle triggers per second.
- **Throttling**: Socket updates are throttled to prevent network congestion.
- **JSON Serialization**: Complex shapes (Freehand) are stored as a list of coordinates, optimized for database storage via JSONB.
- **Layering**: UI components (Toolbar, Cursors, Text Inputs) are rendered as HTML elements on top of the canvas for better accessibility and event handling.
