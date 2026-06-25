import { VedicGiftRequestsPanel } from "@/components/vedic-gift-requests-panel";
import { requireAdminUser } from "@/server/auth";
import { getVedicGiftRequests } from "@/server/vedic-gifts";

export const dynamic = "force-dynamic";

export default async function AdminVedicGiftsPage() {
  await requireAdminUser("/admin/vedic-gifts");
  const requests = await getVedicGiftRequests();

  return (
    <div className="admin-grid">
      <VedicGiftRequestsPanel requests={requests} />
    </div>
  );
}
