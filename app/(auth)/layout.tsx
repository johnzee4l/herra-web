/* Auth and onboarding shell. These screens sit outside the farmer shell but
   still need the app context (settings, toasts, overlays) and the app root
   for breakpoints and theme. */

import { AppProvider } from "@/lib/state";
import { AppRoot } from "@/components/shell/AppRoot";
import { ME, SPACES, mySpaces } from "@/lib/fixtures";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const spaces = mySpaces(ME.id);
  return (
    <AppProvider user={ME} space={spaces[0] ?? SPACES[0]} spaces={spaces}>
      <AppRoot>{children}</AppRoot>
    </AppProvider>
  );
}
