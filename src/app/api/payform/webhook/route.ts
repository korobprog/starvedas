import { getPayformSecret } from "@/server/payform";
import { handlePaymentWebhook } from "@/server/payment-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handlePaymentWebhook({
    providerName: "PayForm",
    request,
    secret: getPayformSecret()
  });
}
