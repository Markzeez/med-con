// src/lib/booking.ts
import { Booking, BookingType, BookingStatus } from "../types/booking";

// Types matching your Next.js API payloads
export interface CreateBookingInput {
  professionalId: string;
  type: BookingType;
  scheduledAt?: string;
  notes?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateBookingStatusInput {
  bookingId: string;
  status: BookingStatus;
}

/**
 * Service to handle booking API requests
 */
export const bookingService = {
  /**
   * Create a new booking (Patient only)
   */
  async create(data: CreateBookingInput): Promise<Booking> {
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create booking");
    }

    return response.json();
  },

  /**
   * Fetch all bookings for the authenticated user (Patient or Professional)
   */
  async getAll(): Promise<Booking[]> {
    const response = await fetch("/api/booking", {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch bookings");
    }

    return response.json();
  },

  /**
   * Update a booking status (Professional only)
   */
  async updateStatus(data: UpdateBookingStatusInput): Promise<Booking> {
    const response = await fetch("/api/booking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update booking status");
    }

    return response.json();
  },
};
