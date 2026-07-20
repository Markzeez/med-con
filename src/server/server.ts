import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // ── At this point Next.js has loaded .env.local ─────────────────────────
  // So process.env.NEXT_PUBLIC_SUPABASE_URL is now available.

  // Validate before using
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\n❌ Missing env vars. Check .env.local has:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=eyJ...\n");
    process.exit(1);
  }

  // Dynamic import AFTER env is loaded
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const activeRooms = new Map();
  const onlineUsers = new Map();

  io.on("connection", (socket) => {

    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("user:online", ({ userId, role }) => {
      onlineUsers.set(userId, { socketId: socket.id, role, status: "online" });
      (socket as any).userId = userId;
      (socket as any).userRole = role;
      io.emit("users:online_count", onlineUsers.size);
    });

    socket.on("room:join", ({ roomId, userId, role }) => {
      socket.join(roomId);
      if (!activeRooms.has(roomId)) activeRooms.set(roomId, { participants: [] });
      const room = activeRooms.get(roomId);
      if (!room.participants.find((p: any) => p.userId === userId)) {
        room.participants.push({ userId, role, socketId: socket.id });
      }
      io.to(roomId).emit("room:user_joined", { userId, role });
      console.log(`[Room] ${role} ${userId} joined ${roomId}`);
    });

    socket.on("room:leave", ({ roomId, userId }) => {
      socket.leave(roomId);
      const room = activeRooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter((p: any) => p.userId !== userId);
        if (room.participants.length === 0) activeRooms.delete(roomId);
      }
      io.to(roomId).emit("room:user_left", { userId });
    });

    // ── Messages — persisted to Supabase ────────────────────────────────

    socket.on("message:send", async ({ roomId, message }) => {
      try {
        const { data: saved, error } = await supabase
          .from("messages")
          .insert({
            room_id: roomId,
            sender_id: message.senderId,
            content: message.content,
            type: message.type || "text",
          })
          .select("*, sender:users!messages_sender_id_fkey(id, name, role, avatar_url)")
          .single();

        if (error) {
          console.error("[Message] Persist failed:", error);
          return;
        }
        io.to(roomId).emit("message:receive", saved);
      } catch (err) {
        console.error("[Message] Error:", err);
      }
    });

    // ── Typing ──────────────────────────────────────────────────────────

    socket.on("typing:start", ({ roomId, userId, name }) => {
      socket.to(roomId).emit("typing:update", { userId, name, isTyping: true });
    });

    socket.on("typing:stop", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing:update", { userId, isTyping: false });
    });

    // ── Ambulance ───────────────────────────────────────────────────────

    socket.on("ambulance:dispatch", ({ patientId, location, severity, roomId }) => {
      const evt = {
        id: `amb_${Date.now()}`,
        patientId, location, severity,
        status: "dispatched",
        timestamp: new Date().toISOString(),
        estimatedArrival: "8-12 minutes",
      };
      io.emit("ambulance:dispatched", evt);
      if (roomId) io.to(roomId).emit("ambulance:en_route", evt);
      console.log(`[Ambulance] Dispatched for ${patientId}`);
    });

    socket.on("ambulance:status_update", ({ dispatchId, status }) => {
      io.emit("ambulance:update", { dispatchId, status });
    });

    // ── Booking ─────────────────────────────────────────────────────────

    socket.on("booking:created", ({ professionalId, booking }) => {
      const pro = onlineUsers.get(professionalId);
      if (pro) io.to(pro.socketId).emit("booking:new_request", booking);
    });

    socket.on("booking:accepted", ({ patientId, booking, roomId }) => {
      const pat = onlineUsers.get(patientId);
      if (pat) io.to(pat.socketId).emit("booking:confirmed", { booking, roomId });
    });

    socket.on("booking:declined", ({ patientId, reason }) => {
      const pat = onlineUsers.get(patientId);
      if (pat) io.to(pat.socketId).emit("booking:declined", { reason });
    });

    // ── Disconnect ──────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      const uid = (socket as any).userId;
      if (uid) {
        onlineUsers.delete(uid);
        io.emit("users:online_count", onlineUsers.size);
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  const PORT = parseInt(process.env.PORT ?? "3000", 10);
  httpServer.listen(PORT, () => {
    console.log(`> MedConnect ready on http://localhost:${PORT}`);
  });
});