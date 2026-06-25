"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const BOOKING_TYPES = [
  { value: "CONSULTATION", label: "Consultation", icon: "🩺", desc: "Video or chat with a doctor" },
  { value: "HOME_VISIT", label: "Home Visit", icon: "🏠", desc: "Nurse or doctor comes to you" },
  { value: "SAMPLE_COLLECTION", label: "Lab Sample", icon: "🔬", desc: "Lab scientist collects samples" },
  { value: "PRESCRIPTION", label: "Prescription", icon: "💊", desc: "Pharmacist review" },
];

const SPECIALTIES = ["General Practice", "Cardiology", "Neurology", "Pediatrics", "Dermatology", "Orthopedics", "Oncology", "Psychiatry"];

export default function BookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookingType, setBookingType] = useState(searchParams.get("type") || "CONSULTATION");
  const [specialty, setSpecialty] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (session?.user.role !== "PATIENT" && status === "authenticated") router.push("/dashboard");
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let latitude: number | undefined;
    let longitude: number | undefined;

    // Try to get location for home visit / critical
    if (["HOME_VISIT", "SAMPLE_COLLECTION"].includes(bookingType) || urgency === "critical") {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // proceed without GPS
      }
    }

    const res = await fetch("/api/matching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingType, specialty, urgency, description, latitude, longitude }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No professional available. Please try again.");
      return;
    }

    router.push(`/chat/${data.room.id}`);
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">Find a professional</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking type */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">What kind of help do you need?</h2>
            <div className="grid grid-cols-2 gap-3">
              {BOOKING_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setBookingType(t.value)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    bookingType === t.value
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Specialty (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSpecialty("")}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!specialty ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                Any
              </button>
              {SPECIALTIES.map((s) => (
                <button key={s} type="button" onClick={() => setSpecialty(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${specialty === s ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
            <div className="flex gap-3">
              {[
                { value: "normal", label: "Normal", color: "sky" },
                { value: "urgent", label: "Urgent", color: "amber" },
                { value: "critical", label: "Critical", color: "red" },
              ].map((u) => (
                <button key={u.value} type="button" onClick={() => setUrgency(u.value as any)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    urgency === u.value
                      ? u.value === "critical"
                        ? "border-red-500 bg-red-50 text-red-600"
                        : u.value === "urgent"
                          ? "border-amber-500 bg-amber-50 text-amber-600"
                          : "border-sky-500 bg-sky-50 text-sky-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                  }`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address (for home visit) */}
          {["HOME_VISIT", "SAMPLE_COLLECTION"].includes(bookingType) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Your address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white"
                placeholder="123 Main Street, City" />
              <p className="text-xs text-gray-400 mt-1">We&apos;ll also try to get your GPS location for accuracy.</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Describe your situation</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white resize-none"
              placeholder="Briefly describe your symptoms or what you need help with…" />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Finding the best match…
              </span>
            ) : "Find & Connect Now"}
          </button>
        </form>
      </main>
    </div>
  );
}
