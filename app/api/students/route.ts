import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("student_code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      fatherName,
      parentPhone,
      studentCode,
      zkUserId,
      monthlyFee,
    } = body;

    if (!fullName || !parentPhone) {
      return NextResponse.json({ error: "Name and parent phone are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const code = studentCode || `STU-${Date.now().toString().slice(-4)}`;
    const admissionNo = `ADM-${Date.now().toString().slice(-4)}`;
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("students")
      .insert({
        student_code: code,
        admission_number: admissionNo,
        full_name: fullName.trim(),
        father_name: (fatherName || "").trim(),
        parent_phone: parentPhone.trim(),
        zk_user_id: zkUserId ? String(zkUserId).trim() : null,
        monthly_fee: monthlyFee ? String(monthlyFee) : "0",
        admission_date: today,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create student" },
      { status: 500 }
    );
  }
}
