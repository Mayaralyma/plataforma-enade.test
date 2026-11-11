import { getCurrentUser } from "@/lib/session";
import { Dashboard } from "@/components/dashboard";
import { AuthScreen } from "@/components/auth-screen";

export default async function Home() {
  const user = await getCurrentUser();
  return user ? <Dashboard user={{ name: user.name, email: user.email, role: user.role }} /> : <AuthScreen />;
}
