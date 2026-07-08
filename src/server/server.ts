import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { Server, Socket } from "socket.io";
import type { Role, Message, Booking, AmbulanceStatus } from "../types/index";
// import { startServer } from "./src/server/server";
// startServer();
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ── Types ──────────────────────────────────────────────────────────────────

interface OnlineUser {
  socketId: string;
  role: Role;
  status: "online";
}

interface RoomParticipant {
  userId: string;
  role: Role;
  socketId: string;
}

interface ActiveRoom {
  participants: RoomParticipant[];
  messages: Partial<Message>[];
}

interface SocketWithUser extends Socket {
  userId?: string;
  userRole?: Role;
}

// ── Boot ───────────────────────────────────────────────────────────────────

export async function startServer() {
  await app.prepare();

  const httpServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const parsedUrl = parse(req.url ?? "/", true);
      handle(req, res, parsedUrl);
    }
  );

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // In-memory store (swap for Redis in production)
  const activeRooms = new Map<string, ActiveRoom>();
  const onlineUsers = new Map<string, OnlineUser>();

  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as SocketWithUser;
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Presence ──────────────────────────────────────────────────────────

    socket.on(
      "user:online",
      ({ userId, role }: { userId: string; role: Role }) => {
        onlineUsers.set(userId, { socketId: socket.id, role, status: "online" });
        socket.userId = userId;
        socket.userRole = role;
        io.emit("users:online_count", onlineUsers.size);
        console.log(`[Presence] User ${userId} (${role}) is online`);
      }
    );

    // ── Room ──────────────────────────────────────────────────────────────

    socket.on(
      "room:join",
      ({
        roomId,
        userId,
        role,
      }: {
        roomId: string;
        userId: string;
        role: Role;
      }) => {
        socket.join(roomId);
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, { participants: [], messages: [] });
        }
        const room = activeRooms.get(roomId)!;
        if (!room.participants.find((p) => p.userId === userId)) {
          room.participants.push({ userId, role, socketId: socket.id });
        }
        io.to(roomId).emit("room:user_joined", { userId, role });
        console.log(`[Room] ${role} ${userId} joined room ${roomId}`);
      }
    );

    socket.on(
      "room:leave",
      ({ roomId, userId }: { roomId: string; userId: string }) => {
        socket.leave(roomId);
        const room = activeRooms.get(roomId);
        if (room) {
          room.participants = room.participants.filter((p) => p.userId !== userId);
          if (room.participants.length === 0) {
            activeRooms.delete(roomId);
            console.log(`[Room] Room ${roomId} deleted (no participants)`);
          }
        }
        io.to(roomId).emit("room:user_left", { userId });
        console.log(`[Room] User ${userId} left room ${roomId}`);
      }
    );

    // ── Messages ──────────────────────────────────────────────────────────

    socket.on(
      "message:send",
      ({
        roomId,
        message,
      }: {
        roomId: string;
        message: Partial<Message>;
      }) => {
        const room = activeRooms.get(roomId);
        if (!room) {
          console.warn(`[Message] Attempted to send message to non-existent room ${roomId}`);
          return;
        }

        const fullMessage: Partial<Message> & { id: string; timestamp: string } = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          ...message,
          timestamp: new Date().toISOString(),
        } as Partial<Message> & { id: string; timestamp: string };

        room.messages.push(fullMessage);
        io.to(roomId).emit("message:receive", fullMessage);
        console.log(
          `[Message] Message sent to room ${roomId} from user ${message.senderId}`
        );
      }
    );

    socket.on("message:history", ({ roomId }: { roomId: string }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        socket.emit("message:history_response", room.messages);
        console.log(`[Message] History requested for room ${roomId}`);
      }
    });

    // ── Typing ────────────────────────────────────────────────────────────

    socket.on(
      "typing:start",
      ({
        roomId,
        userId,
        name,
      }: {
        roomId: string;
        userId: string;
        name: string;
      }) => {
        socket.to(roomId).emit("typing:update", { userId, name, isTyping: true });
      }
    );

    socket.on(
      "typing:stop",
      ({ roomId, userId }: { roomId: string; userId: string }) => {
        socket.to(roomId).emit("typing:update", { userId, isTyping: false });
      }
    );

    // ── Ambulance ─────────────────────────────────────────────────────────

    socket.on(
      "ambulance:dispatch",
      ({
        patientId,
        location,
        severity,
        roomId,
      }: {
        patientId: string;
        location: { lat: number; lng: number; address?: string };
        severity: string;
        roomId?: string;
      }) => {
        const dispatchEvent = {
          id: `amb_${Date.now()}`,
          patientId,
          location,
          severity,
          status: "dispatched" as const,
          timestamp: new Date().toISOString(),
          estimatedArrival: "8–12 minutes",
        };
        io.emit("ambulance:dispatched", dispatchEvent);
        if (roomId) {
          io.to(roomId).emit("ambulance:en_route", dispatchEvent);
        }
        console.log(`[Ambulance] Dispatched for patient ${patientId}`);
      }
    );

    socket.on(
      "ambulance:status_update",
      ({
        dispatchId,
        status,
      }: {
        dispatchId: string;
        status: AmbulanceStatus;
      }) => {
        io.emit("ambulance:update", { dispatchId, status });
        console.log(
          `[Ambulance] Status updated for dispatch ${dispatchId}: ${status}`
        );
      }
    );

    socket.on(
      "ambulance:arrived",
      ({ dispatchId, patientId }: { dispatchId: string; patientId: string }) => {
        io.emit("ambulance:at_location", { dispatchId, patientId });
        console.log(`[Ambulance] Ambulance arrived for patient ${patientId}`);
      }
    );

    // ── Booking ───────────────────────────────────────────────────────────

    socket.on(
      "booking:created",
      ({
        professionalId,
        booking,
      }: {
        professionalId: string;
        booking: Booking;
      }) => {
        const profUser = onlineUsers.get(professionalId);
        if (profUser) {
          io.to(profUser.socketId).emit("booking:new_request", booking);
          console.log(
            `[Booking] New booking request sent to professional ${professionalId}`
          );
        } else {
          console.log(
            `[Booking] Professional ${professionalId} is not online`
          );
        }
      }
    );

    socket.on(
      "booking:accepted",
      ({
        patientId,
        booking,
        roomId,
      }: {
        patientId: string;
        booking: Booking;
        roomId: string;
      }) => {
        const patUser = onlineUsers.get(patientId);
        if (patUser) {
          io.to(patUser.socketId).emit("booking:confirmed", { booking, roomId });
          console.log(
            `[Booking] Booking ${booking.id} accepted and confirmed to patient ${patientId}`
          );
        }
      }
    );

    socket.on(
      "booking:declined",
      ({ patientId, reason }: { patientId: string; reason: string }) => {
        const patUser = onlineUsers.get(patientId);
        if (patUser) {
          io.to(patUser.socketId).emit("booking:declined", { reason });
          console.log(`[Booking] Booking declined for patient ${patientId}`);
        }
      }
    );

    socket.on(
      "booking:cancelled",
      ({ bookingId }: { bookingId: string }) => {
        io.emit("booking:cancelled", { bookingId });
        console.log(`[Booking] Booking ${bookingId} cancelled`);
      }
    );

    // ── Matching ──────────────────────────────────────────────────────────

    socket.on(
      "matching:start",
      ({
        patientId,
        serviceType,
      }: {
        patientId: string;
        serviceType: string;
      }) => {
        io.emit("matching:in_progress", { patientId, serviceType });
        console.log(
          `[Matching] Matching started for patient ${patientId} (${serviceType})`
        );
      }
    );

    socket.on(
      "matching:cancel",
      ({ patientId }: { patientId: string }) => {
        io.emit("matching:cancelled", { patientId });
        console.log(`[Matching] Matching cancelled for patient ${patientId}`);
      }
    );

    // ── Disconnect ────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("users:online_count", onlineUsers.size);
        console.log(
          `[Presence] User ${socket.userId} is offline. Online users: ${onlineUsers.size}`
        );
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  const PORT = parseInt(process.env.PORT ?? "3000", 10);
  httpServer.listen(PORT, () => {
    console.log(`> MedConnect ready on http://localhost:${PORT}`);
  });

  return httpServer;
}

// Entry point
if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
