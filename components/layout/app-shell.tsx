import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import type { Profile } from "@/lib/types/database";

export function AppShell({
  title,
  profile,
  children,
}: {
  title: string;
  profile: Profile | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav title={title} profile={profile} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
