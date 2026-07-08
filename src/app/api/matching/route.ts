// src/app/api/matching/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findBestMatch, createChatRoom } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const matchSchema = z.object({
  bookingType: z.enum(["CONSULTATION", "HOME_VISIT", "SAMPLE_COLLECTION", "PRESCRIPTION"]),
  specialty: z.string().optional(),
  urgency: z.enum(["normal", "urgent", "critical"]).default("normal"),
  description: z.string().optional(),
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
    const matchRequest = await prisma.matchRequest.create({
      data: {
        patientId: session.user.id,
        specialty: data.specialty ?? "",
        bookingType: data.bookingType,
        urgency: data.urgency,
        description: data.description,
      },
    });

    // Find best professional
    const matched = await findBestMatch({
      specialty: data.specialty,
      bookingType: data.bookingType,
      urgency: data.urgency,
      patientLatitude: data.latitude,
      patientLongitude: data.longitude,
    });

    if (!matched) {
      await prisma.matchRequest.update({
        where: { id: matchRequest.id },
        data: { status: "rejected" },
      });
      return NextResponse.json(
        { error: "No available professionals found. Please try again shortly." },
        { status: 404 }
      );
    }

    // Create private chat room
    const room = await createChatRoom(session.user.id, matched.id);

    // Update match request
    await prisma.matchRequest.update({
      where: { id: matchRequest.id },
      data: { status: "matched", assignedProId: matched.id },
    });

    // Create a booking record
    const booking = await prisma.booking.create({
      data: {
        patientId: session.user.id,
        professionalId: matched.id,
        roomId: room.id,
        type: data.bookingType,
        notes: data.description,
        status: "PENDING",
      },
    });

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

// GET - list available professionals by type
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const specialty = searchParams.get("specialty");

  const professionals = await prisma.user.findMany({
    where: {
      role: role ? (role as any) : { in: ["DOCTOR", "PHARMACIST", "NURSE", "LAB_SCIENTIST"] },
      isAvailable: true,
      isVerified: true,
      ...(specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      role: true,
      specialty: true,
      avatarUrl: true,
      isAvailable: true,
    },
  });

  return NextResponse.json(professionals);
}
