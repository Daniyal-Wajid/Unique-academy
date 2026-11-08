import { AppShell } from "@/components/layout/app-shell";
import { DeviceManager } from "@/components/device/device-manager";
import { getCurrentProfile } from "@/lib/services/auth";

export default async function DevicePage() {
  const profile = await getCurrentProfile();
  const serial = process.env.ZKTECO_DEVICE_SERIAL ?? "AF6P210960179";
  const ip = process.env.ZKTECO_IP ?? "";

  return (
    <AppShell title="Biometric Device" profile={profile}>
      <DeviceManager deviceSerial={serial} defaultIp={ip} />
    </AppShell>
  );
}
