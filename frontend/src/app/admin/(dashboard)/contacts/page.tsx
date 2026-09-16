import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ContactsTable } from "./ContactsTable";

interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
}

export default async function ContactsAdminPage() {
  const session = await requireTenantAdmin();
  const contacts = await adminGet<Contact[]>({ token: session.token }, "/admin/contacts");
  return (
    <div>
      <h1 className="text-2xl font-bold">Contact Submissions</h1>
      <ContactsTable contacts={contacts} />
    </div>
  );
}
