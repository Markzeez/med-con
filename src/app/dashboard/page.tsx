"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ROLE_COLORS: Record<string, string> = {
  PATIENT: "bg-blue-100 text-blue-700",
  DOCTOR: "bg-green-100 text-green-700",
  PHARMACIST: "bg-purple-100 text-purple-700",
  NURSE: "bg-pink-100 text-pink-700",
  LAB_SCIENTIST: "bg-amber-100 text-amber-700",
  ADMIN: "bg-gray-100 text-gray-700",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/booking")
        .then((r) => r.json())
        .then((data) => { setBookings(data); setLoadingBookings(false); })
        .catch(() => setLoadingBookings(false));
    }
  }, [session]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" /></div>;
  }

  if (!session) return null;

  const isPatient = session.user.role === "PATIENT";
  const isPro = !isPatient;

  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const activeBookings = bookings.filter((b) => b.status === "ACCEPTED");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">MedConnect</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[session.user.role] || "bg-gray-100 text-gray-700"}`}>
              {session.user.role.replace("_", " ")}
            </span>
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <button onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Good day, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isPatient ? "How can we help you today?" : "You have patients waiting for your expertise."}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {isPatient && (
            <>
              <Link href="/booking" className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl">🔍</div>
                <span className="text-sm font-semibold text-gray-800">Find a Doctor</span>
                <span className="text-xs text-gray-400">Consultation</span>
              </Link>
              <Link href="/booking?type=HOME_VISIT" className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🏠</div>
                <span className="text-sm font-semibold text-gray-800">Home Visit</span>
                <span className="text-xs text-gray-400">Nurse / Doctor</span>
              </Link>
              <Link href="/booking?type=SAMPLE_COLLECTION" className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🔬</div>
                <span className="text-sm font-semibold text-gray-800">Lab Sample</span>
                <span className="text-xs text-gray-400">Lab Scientist</span>
              </Link>
              <Link href="/ambulance" className="bg-white border border-red-100 rounded-2xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-2 pulse-btn">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">🚑</div>
                <span className="text-sm font-semibold text-red-600">Emergency</span>
                <span className="text-xs text-red-400">Ambulance</span>
              </Link>
            </>
          )}

          {isPro && (
            <>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-600">
                  {pendingBookings.length}
                </div>
                <span className="text-sm font-semibold text-gray-800">New Requests</span>
                <span className="text-xs text-gray-400">Awaiting response</span>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-2xl font-bold text-green-600">
                  {activeBookings.length}
                </div>
                <span className="text-sm font-semibold text-gray-800">Active Chats</span>
                <span className="text-xs text-gray-400">Ongoing sessions</span>
              </div>
            </>
          )}
        </div>

        {/* Bookings list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isPatient ? "My appointments" : "Patient requests"}
          </h2>

          {loadingBookings ? (
            <div className="text-center py-8 text-gray-400">Loading…</div>
          ) : bookings.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 text-sm">
                {isPatient ? "No appointments yet. Start by finding a professional." : "No patient requests yet."}
              </p>
              {isPatient && (
                <Link href="/booking" className="mt-4 inline-block text-sm text-sky-600 font-medium hover:underline">
                  Find a professional →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm">
                      {isPatient ? b.professional?.name?.[0] : b.patient?.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {isPatient ? b.professional?.name : b.patient?.name}
                      </p>
                      <p className="text-xs text-gray-400">{b.type.replace("_", " ")} · {b.status}</p>
                    </div>
                  </div>
                  {b.room && (
                    <Link href={`/chat/${b.room.id}`}
                      className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors font-medium">
                      Open chat
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
