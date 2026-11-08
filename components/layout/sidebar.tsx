import { GraduationCap } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { NavItems } from "@/components/layout/nav-items";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-sidebar-foreground/60">Academy Manager</p>
        </div>
      </div>
      <NavItems />
      <p className="px-5 pb-4 text-[11px] text-sidebar-foreground/45">Pakistan · Asia/Karachi</p>
    </aside>
  );
}
