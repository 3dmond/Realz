import { Outlet } from "react-router-dom";
import { useAdminAuth } from "@/lib/admin-auth";

export default function ProtectedRoute() {
  const { isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="realz-logo text-4xl leading-none">
            Rea<span className="lz text-primary">lz</span>
          </div>
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Loading Operations Dashboard…
          </p>
        </div>
      </div>
    );
  }

  // Instant direct access to admin dashboard
  return <Outlet />;
}
