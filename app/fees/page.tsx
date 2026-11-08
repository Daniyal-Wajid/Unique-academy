import { AppShell } from "@/components/layout/app-shell";
import { FeesManager, type FeeStudentRow } from "@/components/fees/fees-manager";
import { getCurrentProfile } from "@/lib/services/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { todayInKarachi } from "@/lib/utils";

export default async function FeesPage() {
  const profile = await getCurrentProfile();
  const currentMonth = todayInKarachi().slice(0, 7);
  const billingPeriod = `${currentMonth}-01`;

  let initialRecords: FeeStudentRow[] = [];
  let initialSummary = {
    total: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalExpected: 0,
    totalCollected: 0,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const { data: students } = await supabase
      .from("students")
      .select("id, student_code, full_name, father_name, parent_phone, monthly_fee")
      .eq("is_active", true)
      .order("student_code", { ascending: true });

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, student_id, total_amount, paid_amount, status, updated_at")
      .eq("billing_period", billingPeriod);

    const invoiceMap = new Map((invoices ?? []).map((inv) => [inv.student_id, inv]));

    initialRecords = (students ?? []).map((s) => {
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

    initialSummary = {
      total: initialRecords.length,
      paidCount: initialRecords.filter((r) => r.isPaid).length,
      unpaidCount: initialRecords.filter((r) => !r.isPaid).length,
      totalExpected: initialRecords.reduce((sum, r) => sum + r.monthlyFee, 0),
      totalCollected: initialRecords.reduce((sum, r) => sum + (r.isPaid ? r.monthlyFee : r.paidAmount), 0),
    };
  }

  return (
    <AppShell title="Fees Management" profile={profile}>
      <FeesManager
        initialRecords={initialRecords}
        currentMonth={currentMonth}
        initialSummary={initialSummary}
      />
    </AppShell>
  );
}
