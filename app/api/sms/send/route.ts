import { NextResponse } from "next/server";
import { sendSmsNotification } from "@/lib/services/sms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, templateKey, customMessage } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "No recipients provided" }, { status: 400 });
    }

    const results = [];
    for (const r of recipients) {
      const messageBody = customMessage
        ? customMessage.replace("{name}", r.fullName).replace("{amount}", r.pendingDue ? r.pendingDue.toLocaleString() : "0")
        : r.message;

      const res = await sendSmsNotification({
        toPhone: r.parentPhone,
        body: messageBody,
        templateKey: templateKey || "general",
        studentId: r.studentId,
      });

      results.push({
        studentId: r.studentId,
        phone: r.parentPhone,
        success: res.success,
        error: res.error,
      });
    }

    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successful > 0,
      sentCount: successful,
      totalCount: recipients.length,
      error: successful === 0 ? (results[0]?.error || "Failed to send SMS") : undefined,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process SMS" },
      { status: 500 }
    );
  }
}
