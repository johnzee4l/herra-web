import { AdminPage } from "@/components/shell/AdminShell";
import { SettingsPage } from "@/components/domain/Settings";

export default function Page() {
  return (
    <AdminPage title="Settings" sub="Personalized for your admin account.">
      <SettingsPage embedded />
    </AdminPage>
  );
}
