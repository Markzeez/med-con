"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";

type Severity = "mild" | "moderate" | "critical";
type Stage = "idle" | "dispatched" | "en_route" | "arrived";

export default function AmbulancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { emit, on } = useSocket();

  const [severity, setSeverity] = useState<Severity>("critical");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;

    const removeDispatched = on<any>("ambulance:dispatched", (data) => {
      setDispatchData(data);
      setStage("dispatched");
    });

    const removeUpdate = on<any>("ambulance:update", ({ status: s }) => {
      if (s === "EN_ROUTE") setStage("en_route");
      if (s === "ARRIVED") setStage("arrived");
    });

    return () => {
      removeDispatched?.();
      removeUpdate?.();
    };
  }, [session, on]);

  async function handleDispatch() {
    if (!session) return;
    setLocating(true);
    setError("");

    let lat = 0, lng = 0, address = "";

    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      setError("Could not get your location. Dispatching without GPS.");
    }

    setLocating(false);

    // Emit via socket for real-time
    emit("ambulance:dispatch", {
      patientId: session.user.id,
      location: { lat, lng, address },
      severity,
      roomId: undefined,
    });

    // Also persist via API
    await fetch("/api/ambulance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, severity, notes }),
    });

    setStage("dispatched");
  }

  const STAGES = [
    { key: "dispatched", label: "Dispatched", icon: "📡" },
    { key: "en_route", label: "En Route", icon: "🚑" },
    { key: "arrived", label: "Arrived", icon: "✅" },
  ];

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">Emergency Ambulance</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {stage === "idle" ? (
          <div className="space-y-6">
            {/* Warning banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">🚨</div>
              <p className="text-sm font-semibold text-red-700">Emergency Dispatch</p>
              <p className="text-xs text-red-500 mt-1">Use this only for medical emergencies. Our dispatch team will respond immediately.</p>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Condition severity</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: "mild" as Severity, label: "Mild", color: "green", desc: "Stable but needs help" },
                  { v: "moderate" as Severity, label: "Moderate", color: "amber", desc: "Needs urgent attention" },
                  { v: "critical" as Severity, label: "Critical", color: "red", desc: "Life-threatening" },
                ].map((s) => (
                  <button key={s.v} type="button" onClick={() => setSeverity(s.v)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      severity === s.v
                        ? s.color === "red"
                          ? "border-red-500 bg-red-50"
                          : s.color === "amber"
                            ? "border-amber-500 bg-amber-50"
                            : "border-green-500 bg-green-50"
                        : "border-gray-100 bg-white"
                    }`}>
                    <div className={`text-sm font-semibold ${
                      severity === s.v
                        ? s.color === "red" ? "text-red-600" : s.color === "amber" ? "text-amber-600" : "text-green-600"
                        : "text-gray-700"
                    }`}>{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Additional notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white resize-none"
                placeholder="Describe the emergency situation…" />
            </div>

            {error && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-lg">{error}</p>
            )}

            <button onClick={handleDispatch} disabled={locating}
              className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold rounded-2xl transition-all text-lg pulse-btn">
              {locating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Getting your location…
                </span>
              ) : "🚑 Dispatch Ambulance Now"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Your GPS location will be shared with our dispatch team
            </p>
          </div>
        ) : (
          <div className="text-center space-y-6">
            {/* Live status */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="text-5xl mb-4">
                {stage === "arrived" ? "✅" : "🚑"}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {stage === "dispatched" && "Ambulance Dispatched!"}
                {stage === "en_route" && "Ambulance En Route"}
                {stage === "arrived" && "Ambulance Has Arrived"}
              </h2>
              {dispatchData?.estimatedArrival && stage !== "arrived" && (
                <p className="text-sm text-gray-500 mt-2">
                  Estimated arrival: <strong>{dispatchData.estimatedArrival}</strong>
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                {STAGES.map((s, i) => {
                  const stageOrder = ["dispatched", "en_route", "arrived"];
                  const currentIdx = stageOrder.indexOf(stage);
                  const isDone = i <= currentIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <div className={`flex flex-col items-center gap-1`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${isDone ? "bg-red-100" : "bg-gray-100"}`}>
                          {s.icon}
                        </div>
                        <span className={`text-xs font-medium ${isDone ? "text-red-600" : "text-gray-400"}`}>{s.label}</span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={`w-8 h-0.5 mb-4 ${i < stageOrder.indexOf(stage) ? "bg-red-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-gray-500">Stay calm and keep this page open. Help is on the way.</p>

            <Link href="/dashboard" className="inline-block text-sm text-sky-600 font-medium hover:underline">
              Return to dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
