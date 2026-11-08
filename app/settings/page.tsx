import { AppShell } from "@/components/layout/app-shell";
import { HostingPanel } from "@/components/hosting/hosting-panel";
import { getCurrentProfile } from "@/lib/services/auth";

export const metadata = { title: "Settings & Hosting — Unique Academy" };

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  return (
    <AppShell title="Settings & Hosting" profile={profile}>
      <HostingPanel />
    </AppShell>
  );
}
