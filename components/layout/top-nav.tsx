import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Profile } from "@/lib/types/database";

export function TopNav({ title, profile }: { title: string; profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">Academy operations · Pakistan</p>
        </div>
      </div>
      <UserMenu
        name={profile?.full_name || profile?.email || "Staff"}
        email={profile?.email ?? ""}
        role={profile?.role ?? null}
      />
    </header>
  );
}
