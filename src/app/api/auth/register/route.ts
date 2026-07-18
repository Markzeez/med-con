// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["PATIENT", "DOCTOR", "PHARMACIST", "NURSE", "LAB_SCIENTIST"]),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phone: data.phone || null,
        specialty: data.specialty || null,
        license_number: data.licenseNumber || null,
        is_verified: data.role === "PATIENT",
      })
      .select("id, name, email, role, is_verified")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}