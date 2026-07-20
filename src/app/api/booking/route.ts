// src/app/api/booking/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const bookingSchema = z.object({
  professionalId: z.string(),
  type: z.enum(["CONSULTATION", "HOME_VISIT", "SAMPLE_COLLECTION", "PRESCRIPTION"]),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// POST - create booking
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);

    // Insert booking and return nested fields using Supabase string joins
    const { data: booking, error } = await supabase
      .from("booking")
      .insert([
        {
          patient_id: session.user.id,
          professional_id: data.professionalId,
          type: data.type,
          scheduled_at: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
          notes: data.notes,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      ])
      .select(`
        *,
        patient:patient_id(id, name, email),
        professional:professional_id(id, name, role, specialty)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - list bookings for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isPatient = session.user.role === "PATIENT";
  const foreignKeyColumn = isPatient ? "patient_id" : "professional_id";

  const { data: bookings, error } = await supabase
    .from("booking")
    .select(`
      *,
      patient:patient_id(id, name, avatar_url),
      professional:professional_id(id, name, role, specialty, avatar_url),
      room:room(id, is_active)
    `)
    .eq(foreignKeyColumn, session.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(bookings);
}

// PATCH - update booking status (professional only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, status } = await req.json();

  // Fetch the booking first to verify ownership
  const { data: booking, error: fetchError } = await supabase
    .from("booking")
    .select("professional_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.professional_id !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Perform the update
  const { data: updated, error: updateError } = await supabase
    .from("booking")
    .update({ status })
    .eq("id", bookingId)
    .select(`
      *,
      patient:patient_id(*),
      professional:professional_id(*)
    `)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
