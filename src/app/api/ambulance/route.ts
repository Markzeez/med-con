// src/app/api/ambulance/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const dispatchSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  severity: z.enum(["mild", "moderate", "critical"]),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  dispatchId: z.string(),
  status: z.enum(["REQUESTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "COMPLETED"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = dispatchSchema.parse(body);

    const { data: dispatch, error } = await supabase
      .from("ambulance_dispatches")
      .insert({
        patient_id: session.user.id,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || null,
        severity: data.severity,
        notes: data.notes || null,
        estimated_arrival: "8–12 minutes",
        status: "DISPATCHED",
      })
      .select(`
        *,
        patient:users!ambulance_dispatches_patient_id_fkey(id, name, phone)
      `)
      .single();

    if (error) {
      console.error("Ambulance dispatch error:", error);
      return NextResponse.json({ error: "Failed to dispatch" }, { status: 500 });
    }

    return NextResponse.json(dispatch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — dispatch history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dispatches, error } = await supabase
    .from("ambulance_dispatches")
    .select("*")
    .eq("patient_id", session.user.id)
    .order("dispatched_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  return NextResponse.json(dispatches);
}

// PATCH — update dispatch status (admin only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { dispatchId, status } = patchSchema.parse(body);

    const updateData: Record<string, unknown> = { status };
    if (status === "COMPLETED") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from("ambulance_dispatches")
      .update(updateData)
      .eq("id", dispatchId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// const { data, error } = await supabase
//   .from("bookings")
//   .insert({ /* your payload data here */ })
//   .select()
//   .single();

// if (error) {
//   return new Response(JSON.stringify({ error: error.message }), { status: 400 });
// }