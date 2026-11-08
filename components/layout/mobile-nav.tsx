"use client";

import { useState } from "react";
import { GraduationCap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavItems } from "@/components/layout/nav-items";
import { APP_NAME } from "@/lib/constants";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="sr-only">{APP_NAME} navigation</SheetTitle>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{APP_NAME}</p>
            <p className="text-xs text-sidebar-foreground/60">Academy Manager</p>
          </div>
        </div>
        <NavItems onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
