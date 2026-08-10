import { EmployeesView } from "@/components/employees/employees-view";
import { requirePageSession } from "@/lib/auth/session";

export default async function EmployeesPage() {
  const session = await requirePageSession();
  return <EmployeesView isAdmin={session.role === "admin"} />;
}
