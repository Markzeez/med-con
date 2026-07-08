// src/types/index.ts

export type Role =
  | "PATIENT"
  | "DOCTOR"
  | "PHARMACIST"
  | "NURSE"
  | "LAB_SCIENTIST"
  | "ADMIN";

export type BookingType =
  | "CONSULTATION"
  | "HOME_VISIT"
  | "SAMPLE_COLLECTION"
  | "PRESCRIPTION";

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";

export type AmbulanceStatus =
  | "REQUESTED"
  | "DISPATCHED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  specialty?: string;
  licenseNumber?: string;
  isVerified: boolean;
  isAvailable: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  patientId: string;
  professionalId: string;
  isActive: boolean;
  patient: User;
  professional: User;
  messages: Message[];
  booking?: Booking;
  createdAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "file" | "system";
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface Booking {
  id: string;
  patientId: string;
  professionalId: string;
  roomId?: string;
  room?: {
    id: string;
  };
  type: BookingType;
  status: BookingStatus;
  scheduledAt?: string;
  notes?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  patient?: User;
  professional?: User;
  createdAt: string;
}

export interface MatchRequest {
  id: string;
  patientId: string;
  specialty: string;
  bookingType: BookingType;
  urgency: "normal" | "urgent" | "critical";
  description?: string;
  assignedProId?: string;
  status: "pending" | "matched" | "rejected";
  createdAt: string;
}

export interface AmbulanceDispatch {
  id: string;
  patientId: string;
  latitude: number;
  longitude: number;
  address?: string;
  severity: "mild" | "moderate" | "critical";
  status: AmbulanceStatus;
  dispatchedAt: string;
  estimatedArrival?: string;
  completedAt?: string;
  notes?: string;
  patient?: User;
}

export interface SocketEvents {
  // User presence
  "user:online": { userId: string; role: Role };
  "users:online_count": number;

  // Room
  "room:join": { roomId: string; userId: string; role: Role };
  "room:leave": { roomId: string; userId: string };
  "room:user_joined": { userId: string; role: Role };
  "room:user_left": { userId: string };

  // Messages
  "message:send": { roomId: string; message: Partial<Message> };
  "message:receive": Message;

  // Typing
  "typing:start": { roomId: string; userId: string; name: string };
  "typing:stop": { roomId: string; userId: string };
  "typing:update": { userId: string; name?: string; isTyping: boolean };

  // Ambulance
  "ambulance:dispatch": {
    patientId: string;
    location: { lat: number; lng: number; address?: string };
    severity: string;
    roomId?: string;
  };
  "ambulance:dispatched": AmbulanceDispatch;
  "ambulance:en_route": AmbulanceDispatch;
  "ambulance:status_update": { dispatchId: string; status: AmbulanceStatus };
  "ambulance:update": { dispatchId: string; status: AmbulanceStatus };

  // Booking
  "booking:created": { professionalId: string; booking: Booking };
  "booking:accepted": { patientId: string; booking: Booking; roomId: string };
  "booking:declined": { patientId: string; reason: string };
  "booking:new_request": Booking;
  "booking:confirmed": { booking: Booking; roomId: string };
}
