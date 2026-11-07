import { AppProvider } from "@/lib/state";
import { AdminChrome } from "@/components/shell/AdminChrome";
import { SPACES, USERS } from "@/lib/fixtures";

export const dynamic = 'force-dynamic';

/* Admin console layout. The signed-in admin is the seeded admin account; in
   the product this comes from the Supabase session and the role check happens
   in middleware (blueprint 6.1). Spectate routes bypass the admin chrome and
   supply their own AppRoot. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = USERS.find((u) => u.role === "admin")!;
  return (
    <AppProvider user={admin} space={SPACES[0]} spaces={SPACES}>
      <AdminChrome>{children}</AdminChrome>
    </AppProvider>
  );
}
