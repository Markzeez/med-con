// src/lib/matching.ts
import { prisma } from "./prisma";
import { BookingType, Role } from "@/types";

// Map booking types to the professional roles that can serve them
const BOOKING_TYPE_ROLES: Record<BookingType, Role[]> = {
  CONSULTATION: ["DOCTOR"],
  HOME_VISIT: ["NURSE", "DOCTOR"],
  SAMPLE_COLLECTION: ["LAB_SCIENTIST", "NURSE"],
  PRESCRIPTION: ["PHARMACIST", "DOCTOR"],
};

interface MatchOptions {
  specialty?: string;
  bookingType: BookingType;
  urgency?: "normal" | "urgent" | "critical";
  patientLatitude?: number;
  patientLongitude?: number;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findBestMatch(options: MatchOptions) {
  const { specialty, bookingType, urgency = "normal", patientLatitude, patientLongitude } = options;
  const eligibleRoles = BOOKING_TYPE_ROLES[bookingType];

  const candidates = await prisma.user.findMany({
    where: {
      role: { in: eligibleRoles as any },
      isAvailable: true,
      isVerified: true,
      ...(specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      role: true,
      specialty: true,
      latitude: true,
      longitude: true,
      avatarUrl: true,
    },
  });

  if (candidates.length === 0) return null;

  // Score each candidate
  const scored = candidates.map((pro) => {
    let score = 100;

    // Distance scoring (if location available)
    if (patientLatitude && patientLongitude && pro.latitude && pro.longitude) {
      const distKm = haversineDistance(
        patientLatitude, patientLongitude,
        pro.latitude, pro.longitude
      );
      // Penalize by distance — closer is better
      score -= Math.min(distKm * 2, 60);
    }

    // Specialty match bonus
    if (specialty && pro.specialty?.toLowerCase().includes(specialty.toLowerCase())) {
      score += 20;
    }

    // Critical urgency boosts nearest available
    if (urgency === "critical" && pro.latitude && pro.longitude) {
      score += 30;
    }

    return { ...pro, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

export async function createChatRoom(patientId: string, professionalId: string) {
  // Check if active room already exists
  const existing = await prisma.chatRoom.findFirst({
    where: {
      patientId,
      professionalId,
      isActive: true,
    },
  });
  if (existing) return existing;

  return prisma.chatRoom.create({
    data: { patientId, professionalId },
    include: {
      patient: true,
      professional: true,
    },
  });
}
