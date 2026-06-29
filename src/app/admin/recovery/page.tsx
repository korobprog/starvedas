import { OrderRecoveryPanel } from "@/components/order-recovery-panel";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminRecoveryPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  await requireAdminUser("/admin/recovery");

  return (
    <OrderRecoveryPanel
      basePath="/admin/recovery"
      searchParams={await searchParams}
    />
  );
}
