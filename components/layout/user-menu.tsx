"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type StaffRole } from "@/lib/constants";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: StaffRole | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-secondary">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : "Staff"}</p>
        </div>
        <Avatar>
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p>{name}</p>
          <p className="text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
