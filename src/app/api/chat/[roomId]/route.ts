// src/app/api/chat/[roomId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET — fetch messages for a room
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;

  // Verify room exists and user is a participant
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .select("id, patient_id, professional_id")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isParticipant =
    room.patient_id === session.user.id || room.professional_id === session.user.id;

  if (!isParticipant) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, role, avatar_url)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Mark messages as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("room_id", roomId)
    .neq("sender_id", session.user.id)
    .eq("is_read", false);

  return NextResponse.json(messages);
}

// POST — send a message (REST fallback for socket)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const { content, type = "text" } = await req.json();

  // Verify room exists and user is a participant
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, patient_id, professional_id")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isParticipant =
    room.patient_id === session.user.id || room.professional_id === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      room_id: roomId,
      sender_id: session.user.id,
      content,
      type,
    })
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, role, avatar_url)
    `)
    .single();

  if (error) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });

  return NextResponse.json(message, { status: 201 });
}
