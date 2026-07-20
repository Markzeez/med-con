// src/lib/matching.ts
import { supabase } from "./supabase";
import type { BookingType, Role } from "@/types";

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
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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

  let query = supabase
    .from("users")
    .select("id, name, role, specialty, latitude, longitude, avatar_url")
    .in("role", eligibleRoles)
    .eq("is_available", true)
    .eq("is_verified", true);

  if (specialty) {
    query = query.ilike("specialty", `%${specialty}%`);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length === 0) return null;

  const scored = candidates.map((pro) => {
    let score = 100;
    if (patientLatitude && patientLongitude && pro.latitude && pro.longitude) {
      const distKm = haversineDistance(
        patientLatitude,
        patientLongitude,
        pro.latitude,
        pro.longitude
      );
      score -= Math.min(distKm * 2, 60);
    }
    if (specialty && pro.specialty?.toLowerCase().includes(specialty.toLowerCase())) {
      score += 20;
    }
    if (urgency === "critical" && pro.latitude && pro.longitude) {
      score += 30;
    }
    return {
      id: pro.id,
      name: pro.name,
      role: pro.role,
      specialty: pro.specialty,
      latitude: pro.latitude,
      longitude: pro.longitude,
      avatarUrl: pro.avatar_url,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

export async function createChatRoom(patientId: string, professionalId: string) {
  // Check if active room already exists
  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("patient_id", patientId)
    .eq("professional_id", professionalId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) return existing;

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({ patient_id: patientId, professional_id: professionalId })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create chat room: ${error.message}`);
  return room;
}
