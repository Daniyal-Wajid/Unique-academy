import { AppShell } from "@/components/layout/app-shell";
import { SmsHub } from "@/components/sms/sms-hub";
import { getCurrentProfile } from "@/lib/services/auth";
import {
  getAbsenteeRecipients,
  getFeePendingRecipients,
  getSmsLogs,
} from "@/lib/services/sms";
import { todayInKarachi } from "@/lib/utils";

export default async function SmsPage() {
  const [profile, absentees, feePending, logs] = await Promise.all([
    getCurrentProfile(),
    getAbsenteeRecipients(todayInKarachi()),
    getFeePendingRecipients(),
    getSmsLogs(50),
  ]);

  const gatewayEnabled = process.env.SMS_GATEWAY_ENABLED === "true";

  return (
    <AppShell title="SMS Service" profile={profile}>
      <SmsHub
        initialAbsentees={absentees}
        initialFeePending={feePending}
        initialLogs={logs}
        currentDate={todayInKarachi()}
        gatewayEnabled={gatewayEnabled}
      />
    </AppShell>
  );
}
