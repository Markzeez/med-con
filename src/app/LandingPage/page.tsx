"use client";

import Link from "next/link";

const services = [
  {
    title: "Hospital Treatment at Home",
    description:
      "Get professional medical care in the comfort of your home with qualified nurses and doctors.",
    icon: "🏥",
  },
  {
    title: "Sample Collection at Home",
    description:
      "Safe and convenient lab sample pickup and testing support without leaving home.",
    icon: "🧪",
  },
  {
    title: "Caretaker Support for Elders",
    description:
      "Compassionate care for elderly loved ones, including medication reminders and daily assistance.",
    icon: "👵",
  },
  {
    title: "Emergency Medical Assistance",
    description:
      "Fast support for urgent medical needs, ambulance coordination, and expert guidance.",
    icon: "🚑",
  },
];

const highlights = [
  "Qualified doctors and nurses",
  "Flexible home visits",
  "Trusted emergency response",
  "Easy booking and support",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_35%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col px-6 py-20 lg:px-8">
          <nav className="mb-16 flex items-center justify-between rounded-full border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-2xl">🩺</span>
              MedHome Care
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-200">
              <a href="#services" className="hover:text-white">Services</a>
              <a href="#about" className="hover:text-white">About</a>
              <Link href="/auth/login" className="rounded-full border border-cyan-400/40 bg-cyan-500/90 px-4 py-2 font-medium text-white transition hover:bg-cyan-400">
                Login
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
                Compassionate medical care at home
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Hospital-grade care, delivered to your home.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-300">
                From treatment and sample collection to elder care support, we make healthcare simpler, safer, and more comfortable for families.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/auth/login" className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-400">
                  Login to Continue
                </Link>
                <Link href="/auth/register" className="rounded-full border border-white/20 px-6 py-3 font-semibold text-slate-100 transition hover:bg-white/10">
                  Create Account
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-900/80 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Why families trust us</p>
                <ul className="mt-6 space-y-4 text-sm text-slate-300">
                  <li className="flex gap-3">
                    <span className="text-cyan-400">✓</span>
                    <span>Professional home visits for treatment, tests, and recovery support.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">✓</span>
                    <span>Fast sample pickup services for diagnostics and follow-up care.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">✓</span>
                    <span>Reliable caretaking support for elderly patients and family members.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">✓</span>
                    <span>24/7 access to emergency response and medical guidance.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Our services</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Everything you need for comfortable home-based care.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <div key={service.title} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-lg">
              <div className="text-4xl">{service.icon}</div>
              <h3 className="mt-4 text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Why choose us</p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                A trusted platform for modern, home-based healthcare.
              </h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                We connect patients and families with reliable support for treatment, diagnostics, elder care, and emergency needs—all from home.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-sm text-slate-300">
              <p className="font-semibold text-white">Designed for comfort and convenience</p>
              <ul className="mt-4 space-y-3">
                <li>• Easy appointment booking</li>
                <li>• Professional home healthcare services</li>
                <li>• Personalized senior support and companionship</li>
                <li>• Safe, coordinated medical assistance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
