"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Contact,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Users,
  Contact,
  BookOpen,
  ClipboardCheck,
  Wallet,
  MessageSquare,
  BarChart3,
  Fingerprint,
  Settings,
};

export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
