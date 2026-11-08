import { GraduationCap } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; setup?: string }>;
}) {
  const params = await searchParams;
  const setupRequired = params.setup === "1" || !isSupabaseConfigured();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{APP_NAME}</p>
            <p className="text-sm text-primary-foreground/75">Academy Management System</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Run the academy from one desk.</h1>
          <p className="text-primary-foreground/80">
            Students, staff, MB460 attendance, fees, SMS, and reports for a single campus of up to 250 people.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">Local access on http://localhost:3000</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <p className="text-lg font-semibold">{APP_NAME}</p>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Principal and staff accounts only. Students do not log in.
            </p>
          </div>
          <LoginForm nextPath={params.next || "/"} setupRequired={setupRequired} />
        </div>
      </div>
    </div>
  );
}
