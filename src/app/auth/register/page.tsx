"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLES = [
  { value: "PATIENT", label: "Patient", icon: "👤" },
  { value: "DOCTOR", label: "Doctor", icon: "🩺" },
  { value: "PHARMACIST", label: "Pharmacist", icon: "💊" },
  { value: "NURSE", label: "Nurse", icon: "🏥" },
  { value: "LAB_SCIENTIST", label: "Lab Scientist", icon: "🔬" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState("PATIENT");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", specialty: "", licenseNumber: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPro = role !== "PATIENT";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    router.push("/auth/login?registered=1");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MedConnect</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Create your account</h2>

          {/* Role selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                    role === r.value
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="Jane Doe" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required minLength={8} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="Min 8 chars" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="+1 555 0100" />
              </div>

              {isPro && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <input type="text" value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                      placeholder="e.g. Cardiology" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License No.</label>
                    <input type="text" value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                      placeholder="License number" />
                  </div>
                </>
              )}
            </div>

            {isPro && (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                Professional accounts require admin verification before you can receive patients.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-sky-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
