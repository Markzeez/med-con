// src/app/api/booking/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    const booking = await prisma.booking.create({
      data: {
        patientId: session.user.id,
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        professional: { select: { id: true, name: true, role: true, specialty: true } },
      },
    });

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

  const bookings = await prisma.booking.findMany({
    where: isPatient
      ? { patientId: session.user.id }
      : { professionalId: session.user.id },
    include: {
      patient: { select: { id: true, name: true, avatarUrl: true } },
      professional: { select: { id: true, name: true, role: true, specialty: true, avatarUrl: true } },
      room: { select: { id: true, isActive: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}

// PATCH - update booking status (professional only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, status } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.professionalId !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: { patient: true, professional: true },
  });

  return NextResponse.json(updated);
}
