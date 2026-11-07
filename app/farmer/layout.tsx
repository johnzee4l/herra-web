import { AppProvider } from "@/lib/state";
import { AppRoot } from "@/components/shell/AppRoot";
import { FarmerShell } from "@/components/shell/FarmerShell";
import { ME, SPACES, mySpaces } from "@/lib/fixtures";

export const dynamic = 'force-dynamic';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const spaces = mySpaces(ME.id);
  return (
    <AppProvider user={ME} space={spaces[0] ?? SPACES[0]} spaces={spaces}>
      <AppRoot>
        <FarmerShell>{children}</FarmerShell>
      </AppRoot>
    </AppProvider>
  );
}
