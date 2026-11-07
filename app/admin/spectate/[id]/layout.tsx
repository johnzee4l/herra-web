import { AppProvider } from "@/lib/state";
import { AppRoot } from "@/components/shell/AppRoot";
import { FarmerShell } from "@/components/shell/FarmerShell";
import { SPACES, USERS, mySpaces } from "@/lib/fixtures";

/* Spectate (blueprint F-41): an admin views a farmer's app read-only. The
   admin layout skips its own chrome for this path; this layout swaps in the
   farmer's account, its own AppRoot (so breakpoints measure this subtree) and
   the farmer shell, with `readonly` set so no mutation can run. */
export default async function SpectateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmer = USERS.find((u) => u.id === id) ?? USERS[0];
  const spaces = mySpaces(farmer.id);

  return (
    <AppProvider user={farmer} space={spaces[0] ?? SPACES[0]} spaces={spaces} readonly>
      <AppRoot>
        <FarmerShell base={`/admin/spectate/${id}`}>{children}</FarmerShell>
      </AppRoot>
    </AppProvider>
  );
}
