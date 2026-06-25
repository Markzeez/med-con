// src/app/api/chat/[roomId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - fetch messages for a room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = params;

  // Verify user is a participant in this room
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isParticipant =
    room.patientId === session.user.id || room.professionalId === session.user.id;

  if (!isParticipant) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Mark messages as read
  await prisma.message.updateMany({
    where: { roomId, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json(room.messages);
}

// POST - send a message (also persisted via socket, this is the REST fallback)
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = params;
  const { content, type = "text" } = await req.json();

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isParticipant =
    room.patientId === session.user.id || room.professionalId === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const message = await prisma.message.create({
    data: { roomId, senderId: session.user.id, content, type },
    include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
