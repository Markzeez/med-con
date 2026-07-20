// src/app/api/matching/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findBestMatch, createChatRoom } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const matchSchema = z.object({
  bookingType: z.enum(["CONSULTATION", "HOME_VISIT", "SAMPLE_COLLECTION", "PRESCRIPTION"]),
  specialty: z.string().optional(),
  urgency: z.enum(["normal", "urgent", "critical"]).default("normal"),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = matchSchema.parse(body);

    // Save match request
    const { data: matchRequest, error: mrError } = await supabase
      .from("match_requests")
      .insert({
        patient_id: session.user.id,
        specialty: data.specialty ?? "",
        booking_type: data.bookingType,
        urgency: data.urgency,
        description: data.description || null,
      })
      .select("id")
      .single();

    if (mrError || !matchRequest) {
      console.error("Match request insert error:", mrError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Find best professional
    const matched = await findBestMatch({
      specialty: data.specialty,
      bookingType: data.bookingType,
      urgency: data.urgency,
      patientLatitude: data.latitude,
      patientLongitude: data.longitude,
    });

    if (!matched) {
      await supabase
        .from("match_requests")
        .update({ status: "rejected" })
        .eq("id", matchRequest.id);

      return NextResponse.json(
        { error: "No available professionals found. Please try again shortly." },
        { status: 404 }
      );
    }

    // Create private chat room
    const room = await createChatRoom(session.user.id, matched.id);

    // Update match request
    await supabase
      .from("match_requests")
      .update({ status: "matched", assigned_pro_id: matched.id })
      .eq("id", matchRequest.id);

    // Create a booking record
    const { data: booking, error: bkError } = await supabase
      .from("bookings")
      .insert({
        patient_id: session.user.id,
        professional_id: matched.id,
        room_id: room.id,
        type: data.bookingType,
        notes: data.description || null,
        address: data.address || null,
        status: "PENDING",
      })
      .select("*")
      .single();

    if (bkError) {
      console.error("Booking insert error:", bkError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    return NextResponse.json({
      room,
      professional: matched,
      booking,
      matchRequestId: matchRequest.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — list available professionals by type
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const specialty = searchParams.get("specialty");

  let query = supabase
    .from("users")
    .select("id, name, role, specialty, avatar_url, is_available")
    .eq("is_available", true)
    .eq("is_verified", true);

  if (role) {
    query = query.eq("role", role);
  } else {
    query = query.in("role", ["DOCTOR", "PHARMACIST", "NURSE", "LAB_SCIENTIST"]);
  }

  if (specialty) {
    query = query.ilike("specialty", `%${specialty}%`);
  }

  const { data: professionals, error } = await query;

  if (error) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  return NextResponse.json(professionals);
}
