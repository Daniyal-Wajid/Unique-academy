import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { todayInKarachi } from "@/lib/utils";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || todayInKarachi().slice(0, 7);
  const billingPeriod = `${month}-01`;

  const supabase = await createClient();

  // Get active students
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, student_code, full_name, father_name, parent_phone, monthly_fee, is_active")
    .eq("is_active", true)
    .order("student_code", { ascending: true });

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  // Get existing invoices for the billing period
  const { data: invoices, error: iErr } = await supabase
    .from("invoices")
    .select("id, student_id, total_amount, paid_amount, status, notes, updated_at")
    .eq("billing_period", billingPeriod);

  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  const invoiceMap = new Map((invoices ?? []).map((inv) => [inv.student_id, inv]));

  const records = (students ?? []).map((s) => {
    const inv = invoiceMap.get(s.id);
    const monthlyFee = Number(s.monthly_fee ?? 0);
    const isPaid = inv ? inv.status === "paid" : false;
    const paidAmount = inv ? Number(inv.paid_amount ?? 0) : 0;
    const pendingDue = isPaid ? 0 : inv ? Math.max(0, Number(inv.total_amount ?? monthlyFee) - paidAmount) : monthlyFee;

    return {
      studentId: s.id,
      studentCode: s.student_code,
      fullName: s.full_name,
      fatherName: s.father_name,
      parentPhone: s.parent_phone,
      monthlyFee,
      isPaid,
      paidAmount,
      pendingDue,
      invoiceId: inv?.id ?? null,
      updatedAt: inv?.updated_at ?? null,
    };
  });

  return NextResponse.json({
    month,
    billingPeriod,
    summary: {
      total: records.length,
      paidCount: records.filter((r) => r.isPaid).length,
      unpaidCount: records.filter((r) => !r.isPaid).length,
      totalExpected: records.reduce((sum, r) => sum + r.monthlyFee, 0),
      totalCollected: records.reduce((sum, r) => sum + (r.isPaid ? r.monthlyFee : r.paidAmount), 0),
    },
    records,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { studentId, month, isPaid, notes } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const targetMonth = month || todayInKarachi().slice(0, 7);
    const billingPeriod = `${targetMonth}-01`;
    const dueDate = `${targetMonth}-10`;

    const supabase = await createClient();

    // Fetch student monthly fee
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id, monthly_fee")
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const feeAmount = Number(student.monthly_fee ?? 0);

    // Upsert invoice for this student and billing period
    const { data: existingInv } = await supabase
      .from("invoices")
      .select("id")
      .eq("student_id", studentId)
      .eq("billing_period", billingPeriod)
      .single();

    let result;
    if (existingInv) {
      // Update
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: isPaid ? "paid" : "unpaid",
          paid_amount: isPaid ? String(feeAmount) : "0",
          total_amount: String(feeAmount),
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingInv.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          student_id: studentId,
          billing_period: billingPeriod,
          due_date: dueDate,
          subtotal: String(feeAmount),
          total_amount: String(feeAmount),
          paid_amount: isPaid ? String(feeAmount) : "0",
          status: isPaid ? "paid" : "unpaid",
          notes: notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: `Fee marked as ${isPaid ? "Paid" : "Unpaid"} for ${targetMonth}`,
      invoice: result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update fee status" },
      { status: 500 }
    );
  }
}
