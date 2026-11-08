import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { todayInKarachi, formatPkr } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export type AbsenteeRecipient = {
  studentId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  parentPhone: string;
  attendanceDate: string;
  lastSmsSentAt?: string | null;
};

export type FeeRecipient = {
  studentId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  parentPhone: string;
  monthlyFee: number;
  pendingDue: number;
  lastSmsSentAt?: string | null;
};

export type SmsLogItem = {
  id: string;
  toPhone: string;
  templateKey: string | null;
  body: string;
  status: "pending" | "queued" | "sent" | "failed";
  provider: string;
  errorMessage?: string | null;
  sentAt: string | null;
  studentName?: string;
  createdAt: string;
};

/* ---------------------------------------------------------------------------
 * SMS Gateway Configuration
 *
 * Supports the following Android SMS Gateway apps:
 *   1. "SMS Gateway for Android" (smsgateway.me)  — POST /api/v4/message/send
 *   2. "SMS Gateway" by simplesmsgateway          — POST /v1/message
 *   3. Any HTTP gateway that accepts { phone, message } via POST
 *
 * The gateway URL, auth token, and device ID are read from env variables.
 * When SMS_GATEWAY_ENABLED=false the SMS is only logged to the database.
 * --------------------------------------------------------------------------- */

function getSmsGatewayConfig() {
  return {
    enabled: process.env.SMS_GATEWAY_ENABLED === "true",
    url: process.env.SMS_GATEWAY_URL ?? "",
    deviceId: process.env.SMS_GATEWAY_DEVICE_ID ?? "",
    authToken: process.env.SMS_GATEWAY_AUTH_TOKEN ?? "",
  };
}

/**
 * Normalize a Pakistani phone number to standard local mobile format: 03XXXXXXXXX (11 digits).
 * On Android SMS gateways running on Pakistani SIMs, local carriers (Jazz, Zong, Telenor, Ufone)
 * require national format (03XXXXXXXXX). Passing raw '923XXXXXXXXX' without '+' causes network rejection.
 *
 * Handles:
 *   - 03001234567   → 03001234567
 *   - +923001234567 → 03001234567
 *   - 923001234567  → 03001234567
 *   - 00923001234567→ 03001234567
 *   - 3001234567    → 03001234567
 */
export function normalizePakistaniPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");

  // 00923XXXXXXXXX (14 digits) → 03XXXXXXXXX
  if (cleaned.startsWith("0092") && cleaned.length === 14) {
    cleaned = "0" + cleaned.slice(4);
  }
  // 923XXXXXXXXX (12 digits) → 03XXXXXXXXX
  else if (cleaned.startsWith("92") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  }
  // 3XXXXXXXXX (10 digits) → 03XXXXXXXXX
  else if (cleaned.length === 10 && cleaned.startsWith("3")) {
    cleaned = "0" + cleaned;
  }
  // 03XXXXXXXXX (11 digits) → already correct

  return cleaned;
}

/**
 * Build authorization headers for SMS Gateway.
 * Supports:
 *   - Basic Auth (if token contains ':' e.g. "admin:password" or base64)
 *   - Bearer Token (if single alphanumeric token)
 */
function buildAuthHeader(authToken: string): Record<string, string> {
  if (!authToken) return {};
  if (authToken.includes(":")) {
    const encoded = Buffer.from(authToken).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  if (authToken.toLowerCase().startsWith("basic ") || authToken.toLowerCase().startsWith("bearer ")) {
    return { Authorization: authToken };
  }
  return { Authorization: `Bearer ${authToken}` };
}

/**
 * Send an SMS via the Android SMS Gateway HTTP API.
 * Supports:
 *   1. "SMS Gateway" by Capcom6 (POST /message or POST /api/v1/message with { phoneNumbers, message })
 *   2. Simple SMS Gateway (POST /v1/message or POST /message)
 *   3. Generic JSON POST gateways (POST / with { phone, message, to })
 *   4. MacroDroid Webhook (GET /trigger?id=send_sms&phone=...&message=...)
 *
 * Returns { success, providerMessageId, error }
 */
async function sendViaGateway(phone: string, message: string): Promise<{
  success: boolean;
  providerMessageId?: string;
  error?: string;
}> {
  const config = getSmsGatewayConfig();

  if (!config.enabled) {
    // Gateway disabled — log only (demo / dry-run mode)
    return {
      success: true,
      providerMessageId: `DEMO-${Date.now()}`,
    };
  }

  if (!config.url) {
    return { success: false, error: "SMS_GATEWAY_URL is not set in .env.local" };
  }

  const normalizedPhone = normalizePakistaniPhone(phone);
  const rawBaseUrl = config.url.replace(/\/+$/, "");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildAuthHeader(config.authToken),
  };

  // Comprehensive payload matching Capcom6 SMS Gateway, SimpleSMS, and generic apps
  const postBody = JSON.stringify({
    // Capcom6 "SMS Gateway" format:
    phoneNumbers: [normalizedPhone],
    message: message,
    // Generic / other gateway formats:
    phone_number: normalizedPhone,
    phone: normalizedPhone,
    number: normalizedPhone,
    to: normalizedPhone,
    text: message,
    body: message,
    // Optional device identification:
    ...(config.deviceId ? { device_id: config.deviceId, device: config.deviceId } : {}),
  });

  // Endpoints to try in order of most common Android SMS Gateway apps:
  // 1) Exactly what's in config (if user entered full path like http://ip:8080/message)
  // 2) /message (Capcom6 SMS Gateway default)
  // 3) / (Root endpoint)
  // 4) /v1/message (Simple SMS Gateway)
  // 5) /api/v1/message
  // 6) /send
  const candidateUrls: string[] = [rawBaseUrl];
  if (!rawBaseUrl.endsWith("/message")) candidateUrls.push(`${rawBaseUrl}/message`);
  if (!rawBaseUrl.endsWith("/v1/message")) candidateUrls.push(`${rawBaseUrl}/v1/message`);
  if (!rawBaseUrl.endsWith("/api/v1/message")) candidateUrls.push(`${rawBaseUrl}/api/v1/message`);
  if (!rawBaseUrl.endsWith("/send")) candidateUrls.push(`${rawBaseUrl}/send`);

  let lastError = "";

  // Try POST candidate URLs
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: postBody,
        signal: AbortSignal.timeout(5000), // 5s timeout per candidate
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: true,
          providerMessageId:
            data.id || data.message_id || data.messageId || data.uuid || `GW-${Date.now()}`,
        };
      } else {
        const errorText = await res.text().catch(() => "");
        lastError = `Gateway (${new URL(url).pathname}) returned ${res.status}: ${errorText.slice(0, 150)}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Connection failed";
    }
  }

  // Fallback: MacroDroid Webhook (GET format)
  try {
    const macrodroidUrl = `${rawBaseUrl}/trigger?id=send_sms&phone=${encodeURIComponent(normalizedPhone)}&message=${encodeURIComponent(message)}`;
    const macroRes = await fetch(macrodroidUrl, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });

    if (macroRes.ok) {
      return {
        success: true,
        providerMessageId: `MACRO-${Date.now()}`,
      };
    }
  } catch {
    // MacroDroid fallback didn't work
  }

  return {
    success: false,
    error: lastError || "Failed to connect to SMS Gateway. Verify phone IP and app server status.",
  };
}

/**
 * Get all students marked 'absent' for a given date
 */
export async function getAbsenteeRecipients(date = todayInKarachi()): Promise<AbsenteeRecipient[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  // 1. Get daily attendance marked absent
  const { data: absents } = await supabase
    .from("daily_attendance")
    .select("student_id, attendance_date")
    .eq("person_type", "student")
    .eq("attendance_date", date)
    .eq("status", "absent");

  if (!absents || absents.length === 0) return [];

  const studentIds = absents
    .map((a) => a.student_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // 2. Fetch student details with parent phones
  const { data: students } = await supabase
    .from("students")
    .select("id, student_code, full_name, father_name, parent_phone")
    .in("id", studentIds)
    .eq("is_active", true);

  if (!students) return [];

  // 3. Fetch any SMS sent today to these students
  const { data: recentSms } = await supabase
    .from("sms_logs")
    .select("student_id, sent_at")
    .in("student_id", studentIds)
    .eq("template_key", "absence_alert")
    .gte("created_at", `${date}T00:00:00+05:00`);

  const smsMap = new Map((recentSms ?? []).map((s) => [s.student_id, s.sent_at]));

  return students.map((s) => ({
    studentId: s.id,
    studentCode: s.student_code,
    fullName: s.full_name,
    fatherName: s.father_name,
    parentPhone: s.parent_phone,
    attendanceDate: date,
    lastSmsSentAt: smsMap.get(s.id) ?? null,
  }));
}

/**
 * Get all students with pending fees for current billing month.
 * If an invoice exists for the current month and is 'paid', the student has 0 pending due
 * and will NOT receive fee reminders.
 */
export async function getFeePendingRecipients(): Promise<FeeRecipient[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const thisMonth = todayInKarachi().slice(0, 7);
  const billingPeriod = `${thisMonth}-01`;

  // Query all invoices for this month
  const { data: invoices } = await supabase
    .from("invoices")
    .select("student_id, total_amount, paid_amount, status, billing_period")
    .eq("billing_period", billingPeriod);

  // Also query all active students
  const { data: students } = await supabase
    .from("students")
    .select("id, student_code, full_name, father_name, parent_phone, monthly_fee")
    .eq("is_active", true);

  if (!students) return [];

  // Map invoices by student_id
  const invoiceMap = new Map((invoices ?? []).map((inv) => [inv.student_id, inv]));

  // Get recent fee reminders sent this month
  const { data: recentSms } = await supabase
    .from("sms_logs")
    .select("student_id, sent_at")
    .eq("template_key", "fee_reminder")
    .gte("created_at", `${thisMonth}-01T00:00:00+05:00`);

  const smsMap = new Map((recentSms ?? []).map((s) => [s.student_id, s.sent_at]));

  return students
    .map((s) => {
      const inv = invoiceMap.get(s.id);
      let pendingDue = Number(s.monthly_fee ?? 0);

      if (inv) {
        if (inv.status === "paid") {
          pendingDue = 0;
        } else {
          pendingDue = Math.max(0, Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0));
        }
      }

      return {
        studentId: s.id,
        studentCode: s.student_code,
        fullName: s.full_name,
        fatherName: s.father_name,
        parentPhone: s.parent_phone,
        monthlyFee: Number(s.monthly_fee ?? 0),
        pendingDue,
        lastSmsSentAt: smsMap.get(s.id) ?? null,
      };
    })
    .filter((s) => s.pendingDue > 0);
}

/**
 * Send an SMS message via the Android gateway and log to sms_logs.
 *
 * Flow:
 * 1. Validate phone number
 * 2. Try sending via SMS gateway (if enabled)
 * 3. Log result to sms_logs table regardless of success/failure
 */
export async function sendSmsNotification({
  toPhone,
  body,
  templateKey,
  studentId,
}: {
  toPhone: string;
  body: string;
  templateKey: "absence_alert" | "fee_reminder" | "general";
  studentId?: string;
}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = await createClient();

  // Clean phone number
  const cleanedPhone = toPhone.trim().replace(/[^0-9+]/g, "");

  if (!cleanedPhone) {
    return { success: false, error: "Invalid phone number" };
  }

  // Attempt to send via gateway
  const gatewayResult = await sendViaGateway(cleanedPhone, body.trim());

  const config = getSmsGatewayConfig();
  const provider = config.enabled ? "android_gateway" : "local_demo";
  const status = gatewayResult.success ? "sent" : "failed";
  const now = new Date().toISOString();

  // Log the SMS to the database regardless of outcome
  const { data, error } = await supabase
    .from("sms_logs")
    .insert({
      to_phone: normalizePakistaniPhone(cleanedPhone),
      template_key: templateKey,
      body: body.trim(),
      status,
      error_message: gatewayResult.success ? null : (gatewayResult.error ?? "Gateway delivery failed"),
      provider,
      provider_message_id: gatewayResult.providerMessageId ?? `ERR-${Date.now()}`,
      student_id: studentId ?? null,
      sent_at: gatewayResult.success ? now : null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!gatewayResult.success) {
    return { success: false, error: gatewayResult.error ?? "Gateway failed" };
  }

  return { success: true, logId: data?.id };
}

/**
 * Fetch recent SMS history logs
 */
export async function getSmsLogs(limit = 50): Promise<SmsLogItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("sms_logs")
    .select(`
      id,
      to_phone,
      template_key,
      body,
      status,
      error_message,
      provider,
      sent_at,
      created_at,
      student_id,
      students ( full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((item: any) => ({
    id: item.id,
    toPhone: item.to_phone,
    templateKey: item.template_key,
    body: item.body,
    status: item.status,
    errorMessage: item.error_message ?? null,
    provider: item.provider,
    sentAt: item.sent_at,
    studentName: item.students?.full_name ?? undefined,
    createdAt: item.created_at,
  }));
}

/**
 * Generate formatted Absentee SMS text
 */
export function formatAbsenteeSms(studentName: string, date: string): string {
  return `Respected Parent, your child ${studentName} was marked ABSENT today (${date}) at ${APP_NAME}. Please contact the academy office if this was unintentional.`;
}

/**
 * Generate formatted Fee Status SMS text
 */
export function formatFeeStatusSms(studentName: string, amount: number): string {
  return `Respected Parent, fee of PKR ${amount.toLocaleString()} for ${studentName} is pending at ${APP_NAME}. Kindly deposit dues at the academy office. Thank you.`;
}
