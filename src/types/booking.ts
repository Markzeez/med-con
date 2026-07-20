// src/types/booking.ts

export type BookingType = "CONSULTATION" | "HOME_VISIT" | "SAMPLE_COLLECTION" | "PRESCRIPTION";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface BookingUserMinimal {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

export interface BookingProfessionalMinimal extends BookingUserMinimal {
  role: string;
  specialty: string;
}

export interface BookingRoomMinimal {
  id: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  patient_id: string;
  professional_id: string;
  type: BookingType;
  status: BookingStatus;
  scheduled_at: string | null;
  notes: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  
  // Optional relations populated by Supabase joins
  patient?: BookingUserMinimal;
  professional?: BookingProfessionalMinimal;
  room?: BookingRoomMinimal | null;
}
