// src/app/api/ambulance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const dispatchSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  severity: z.enum(["mild", "moderate", "critical"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = dispatchSchema.parse(body);

    const dispatch = await prisma.ambulanceDispatch.create({
      data: {
        patientId: session.user.id,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        severity: data.severity,
        notes: data.notes,
        estimatedArrival: "8–12 minutes",
        status: "DISPATCHED",
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(dispatch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - get dispatch history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dispatches = await prisma.ambulanceDispatch.findMany({
    where: { patientId: session.user.id },
    orderBy: { dispatchedAt: "desc" },
  });

  return NextResponse.json(dispatches);
}

// PATCH - update dispatch status (admin/dispatcher)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dispatchId, status } = await req.json();

  const updated = await prisma.ambulanceDispatch.update({
    where: { id: dispatchId },
    data: {
      status,
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}
