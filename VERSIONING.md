# Element Versioning & Conflict Resolution

This document explains how drawing elements are versioned and synchronized between multiple users to ensure data integrity and resolve conflicts.

---

## 🏗 The Data Model

Every element on the canvas follows a strict structure including versioning metadata:

```typescript
type Element = {
  id: string;        // Unique identifier (nanoid)
  type: "rectangle"; // Example: Rectangle
  x: number;
  y: number;
  width: number;
  height: number;
  version: number;   // Incremental counter
  updatedAt: number; // Timestamp (Unix epoch)
  // ... style properties
}
```

---

## 🔄 The Versioning Lifecycle

Using a **Rectangle** as an example, here is the end-to-end flow:

### 1. Frontend: Initial Creation
When a user clicks to start drawing a rectangle:
- **Action**: `createNewElement` is called.
- **State**:
  ```json
  {
    "id": "rect_123",
    "type": "rectangle",
    "x": 100, "y": 100,
    "width": 0, "height": 0,
    "version": 1,
    "updatedAt": 1706465000000
  }
  ```

### 2. Frontend: Real-time Update (Optimistic)
As the user drags the mouse:
- **Action**: `updateElement` increments the version.
- **Socket**: `element:update` event is emitted (unpersisted diff).
- **State**: Version becomes `2`, `updatedAt` is refreshed.

### 3. Frontend: Final Commit
When the mouse is released:
- **Action**: `element:commit` is sent to the server.
- **Goal**: Persist this finalized state and increment history.

### 4. Backend: Persistence & Versioning Logic
When the server receives `element:commit`, it performs a **Conditional Upsert**:

```typescript
// Pseudo-code for the Backend Handler
socket.on('element:commit', async (incomingElement) => {
  const existing = await prisma.element.findUnique({ where: { id: incomingElement.id } });

  if (existing) {
    // Conflict Check: Last-Write-Wins
    if (incomingElement.version > existing.version) {
      // 1. Update Snapshot (The current state users see when they join)
      await prisma.element.update({ ... });
      
      // 2. Create History Entry (For undo/redo/audit)
      await prisma.elementVersion.create({ ... });
      
      // 3. Broadcast to other users
      socket.broadcast.emit('element:commit', incomingElement);
    } else {
      // 4. Handle Stale Data
      socket.emit('element:stale', existing);
    }
  } else {
    // New Element: Create snapshot and version 1
    await prisma.$transaction([
      prisma.element.create({ ... }),
      prisma.elementVersion.create({ ... })
    ]);
  }
});
```

---

## ⚔️ Conflict Example: Two Users Editing One Rectangle

Scenario: User A and User B both try to move the same rectangle (`rect_123`) at the same time.

1.  **Current State in DB**: `version: 5`, `updatedAt: T100`.
2.  **User A Commits**: Sends `version: 6`, `updatedAt: T105`.
    - Result: **ACCEPTED**. DB is now `v6`.
3.  **User B Commits**: Sends `version: 6`, `updatedAt: T102` (based on old `v5`).
    - Result: **REJECTED**. The server sees that it already has a `v6` with a later timestamp or simply that User B's update is no longer applicable.
    - Result: **SYNC**. Server sends `element:stale` back to User B with the current `v6` data from User A.
    - User B's screen jumps slightly to align with the global reality.

---

## 🗄 Storage Impact

- **`Element` Table**: Always contains exactly one row per active drawing object. This is what's loaded when a new user joins a room.
- **`ElementVersion` Table**: Contains an every-growing list of snapshots. Every time a user finishes a transformation (Mouse Up), a new row is added here. This allows us to reconstruct the drawing process step-by-step.
