import crypto from "node:crypto";

type PaymentCustomer = {
  email?: string | null;
  name: string;
  phone?: string | null;
};

type PaymentUrlInput = {
  amountRub: number;
  customer: PaymentCustomer;
  description: string;
  failUrl?: string;
  orderNumber: number;
  successUrl?: string;
};

type PayformPrimitive = boolean | number | string | null;
export type PayformData = {
  [key: string]: PayformData | PayformData[] | PayformPrimitive;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
}

function getProdamusUrl() {
  return process.env.PRODAMUS_API_URL?.trim() || "https://prodamus.ru";
}

function appendIfDefined(
  params: URLSearchParams,
  key: string,
  value: number | string | undefined
) {
  if (value !== undefined) {
    params.set(key, String(value));
  }
}

export function createProdamusPaymentUrl(input: PaymentUrlInput) {
  const params = new URLSearchParams();
  const data: PayformData = {
    customer_extra: input.description,
    customer_name: input.customer.name,
    do: "pay",
    order_id: input.orderNumber,
    products: [
      {
        name: input.description,
        paymentMethod: "full_payment",
        paymentObject: "service",
        price: input.amountRub,
        quantity: 1
      }
    ]
  };
  const siteUrl = getSiteUrl();
  const customerEmail = clean(input.customer.email);
  const customerPhone = clean(input.customer.phone);
  const merchantId = clean(process.env.PRODAMUS_MERCHANT_ID);

  appendIfDefined(params, "do", "pay");
  appendIfDefined(params, "order_id", input.orderNumber);
  appendIfDefined(params, "customer_extra", input.description);
  appendIfDefined(params, "customer_email", customerEmail);
  appendIfDefined(params, "customer_phone", customerPhone);
  appendIfDefined(params, "customer_name", input.customer.name);
  appendIfDefined(params, "products[0][name]", input.description);
  appendIfDefined(params, "products[0][price]", input.amountRub);
  appendIfDefined(params, "products[0][quantity]", 1);
  appendIfDefined(params, "products[0][paymentMethod]", "full_payment");
  appendIfDefined(params, "products[0][paymentObject]", "service");
  appendIfDefined(
    params,
    "urlSuccess",
    input.successUrl ?? process.env.PRODAMUS_SUCCESS_URL
  );
  appendIfDefined(
    params,
    "urlReturn",
    input.failUrl ?? process.env.PRODAMUS_FAIL_URL
  );

  if (customerEmail) {
    data.customer_email = customerEmail;
  }

  if (customerPhone) {
    data.customer_phone = customerPhone;
  }

  const successUrl = input.successUrl ?? process.env.PRODAMUS_SUCCESS_URL;
  const failUrl = input.failUrl ?? process.env.PRODAMUS_FAIL_URL;

  if (successUrl) {
    data.urlSuccess = successUrl;
  }

  if (failUrl) {
    data.urlReturn = failUrl;
  }

  if (siteUrl) {
    const callbackUrl = `${siteUrl}/api/prodamus/webhook`;

    appendIfDefined(params, "urlNotification", callbackUrl);
    data.urlNotification = callbackUrl;
  }

  if (merchantId) {
    appendIfDefined(params, "merchant_id", merchantId);
    data.merchant_id = merchantId;
  }

  const secret = clean(process.env.PRODAMUS_SECRET_KEY);

  if (secret) {
    params.set("signature", signPayformData(data, secret));
  }

  return `${getProdamusUrl()}?${params.toString()}`;
}

export function getPayformSecret() {
  return (
    clean(process.env.PAYFORM_WEBHOOK_SECRET) ??
    clean(process.env.PAYFORM_SECRET_KEY)
  );
}

export function getProdamusSecret() {
  return (
    clean(process.env.PRODAMUS_WEBHOOK_SECRET) ??
    clean(process.env.PRODAMUS_SECRET_KEY)
  );
}

export function signPayformPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function signPayformData(data: PayformData, secret: string) {
  const prepared = sortPayformData(removeSignature(data));
  // Prodamus signs the result of PHP json_encode($data, JSON_UNESCAPED_UNICODE)
  // (NOT JSON_UNESCAPED_SLASHES), so forward slashes must be escaped as \/, and
  // the HMAC is taken over the raw JSON string (no base64).
  const json = JSON.stringify(prepared).replace(/\//g, "\\/");

  return signPayformPayload(json, secret);
}

export function verifyPayformSignature(
  payload: string,
  signature: string | null,
  secret: string,
  data?: PayformData
) {
  if (!signature) {
    return false;
  }

  const normalizedSignature = signature.trim();
  const hexSignature = signPayformPayload(payload, secret);
  const base64Signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
  const dataSignature = data ? signPayformData(data, secret) : undefined;

  return [dataSignature, hexSignature, base64Signature].some((candidate) => {
    if (!candidate) {
      return false;
    }

    const candidateBuffer = Buffer.from(candidate);
    const signatureBuffer = Buffer.from(normalizedSignature);

    return (
      candidateBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(candidateBuffer, signatureBuffer)
    );
  });
}

function removeSignature(data: PayformData): PayformData {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !["sign", "signature"].includes(key.toLowerCase()) &&
        value !== undefined &&
        value !== ""
    )
  ) as PayformData;
}

function sortPayformData(
  value: PayformData | PayformData[] | PayformPrimitive
): PayformData | PayformData[] | PayformPrimitive {
  if (Array.isArray(value)) {
    return value.map((item) => sortPayformData(item) as PayformData);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        // Match PHP ksort (byte-wise string comparison), not locale-aware order.
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, sortPayformData(item)])
    ) as PayformData;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  return value;
}
