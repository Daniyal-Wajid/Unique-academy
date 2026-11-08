import { NextResponse } from "next/server";
import { getFeePendingRecipients, sendSmsNotification } from "@/lib/services/sms";

/**
 * Fee Reminder SMS Automation Endpoint
 *
 * Can be triggered:
 * 1. By Windows Task Scheduler / Cron (e.g. 5th or 10th of every month)
 * 2. By curl / webhook: POST /api/sms/cron/fee-reminders?secret=YOUR_CRON_SECRET
 * 3. By button click from the admin dashboard
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = searchParams.get("secret") || request.headers.get("x-cron-secret");

    // Optional secret check if configured in .env.local
    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    // 1. Fetch all students with pending fees
    // Students who paid this month are already automatically excluded!
    const pendingStudents = await getFeePendingRecipients();

    if (pendingStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students have pending fees for this month. 0 SMS sent.",
        totalPending: 0,
        sentCount: 0,
      });
    }

    const defaultFeeTemplate =
      "Respected Parent, fee of PKR {amount} for {name} is pending at Unique Academy. Kindly clear the dues at your earliest. Thank you.";

    const results = [];
    for (const s of pendingStudents) {
      const messageBody = defaultFeeTemplate
        .replace("{name}", s.fullName)
        .replace("{amount}", s.pendingDue.toLocaleString());

      const res = await sendSmsNotification({
        toPhone: s.parentPhone,
        body: messageBody,
        templateKey: "fee_reminder",
        studentId: s.studentId,
      });

      results.push({
        studentId: s.studentId,
        studentName: s.fullName,
        phone: s.parentPhone,
        amount: s.pendingDue,
        success: res.success,
        error: res.error,
      });
    }

    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      totalPending: pendingStudents.length,
      sentCount: successful,
      failedCount: pendingStudents.length - successful,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run fee reminder automation" },
      { status: 500 }
    );
  }
}

