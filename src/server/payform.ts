import crypto from "node:crypto";

type PaymentCustomer = {
  email?: string | null;
  name: string;
  phone?: string | null;
};

type PaymentProduct = {
  name: string;
  priceRub: number;
  quantity: number;
  vatTaxType?: number;
};

type PaymentUrlInput = {
  amountRub: number;
  customer: PaymentCustomer;
  description: string;
  failUrl?: string;
  paidContent?: string;
  products?: PaymentProduct[];
  receiptName: string;
  orderNumber: number;
  successUrl?: string;
  vatTaxType: number;
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

function isProdamusDemoModeEnabled() {
  const value = process.env.PRODAMUS_DEMO_MODE?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}

export function normalizeProdamusPaymentUrl(
  paymentUrl: string | null | undefined
) {
  if (!paymentUrl) {
    return null;
  }

  try {
    const originalUrl = new URL(paymentUrl);
    const currentUrl = new URL(getProdamusUrl());

    currentUrl.search = originalUrl.search;
    currentUrl.hash = originalUrl.hash;

    return currentUrl.toString();
  } catch {
    return paymentUrl;
  }
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
  const products = (
    input.products?.length
      ? input.products
      : [
          {
            name: input.receiptName,
            priceRub: input.amountRub,
            quantity: 1,
            vatTaxType: input.vatTaxType
          }
        ]
  ).map((product) => ({
    name: product.name,
    paymentMethod: 4,
    paymentObject: 4,
    price: product.priceRub,
    quantity: product.quantity,
    tax: {
      tax_type: product.vatTaxType ?? input.vatTaxType
    }
  }));
  const data: PayformData = {
    customer_extra: input.description,
    customer_name: input.customer.name,
    do: "pay",
    order_id: input.orderNumber,
    products
  };
  const siteUrl = getSiteUrl();
  const customerEmail = clean(input.customer.email);
  const customerPhone = clean(input.customer.phone);
  const merchantId = clean(process.env.PRODAMUS_MERCHANT_ID);
  const prodamusSys = clean(process.env.PRODAMUS_SYS);
  const demoMode = isProdamusDemoModeEnabled() ? 1 : undefined;

  appendIfDefined(params, "do", "pay");
  appendIfDefined(params, "order_id", input.orderNumber);
  appendIfDefined(params, "customer_extra", input.description);
  appendIfDefined(params, "paid_content", clean(input.paidContent));
  appendIfDefined(params, "customer_email", customerEmail);
  appendIfDefined(params, "customer_phone", customerPhone);
  appendIfDefined(params, "customer_name", input.customer.name);
  products.forEach((product, index) => {
    appendIfDefined(params, `products[${index}][name]`, product.name);
    appendIfDefined(params, `products[${index}][price]`, product.price);
    appendIfDefined(params, `products[${index}][quantity]`, product.quantity);
    appendIfDefined(
      params,
      `products[${index}][paymentMethod]`,
      product.paymentMethod
    );
    appendIfDefined(
      params,
      `products[${index}][paymentObject]`,
      product.paymentObject
    );
    appendIfDefined(
      params,
      `products[${index}][tax][tax_type]`,
      product.tax.tax_type
    );
  });
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

  const paidContent = clean(input.paidContent);

  if (paidContent) {
    data.paid_content = paidContent;
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

  if (prodamusSys) {
    appendIfDefined(params, "sys", prodamusSys);
    data.sys = prodamusSys;
  }

  appendIfDefined(params, "demo_mode", demoMode);

  if (demoMode) {
    data.demo_mode = demoMode;
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
  const rawPayloadSignatures = payload
    ? [
        signPayformPayload(payload, secret),
        crypto.createHmac("sha256", secret).update(payload).digest("base64")
      ]
    : [];
  const dataSignatures = data
    ? [data, removeOptionalWebhookFileFields(data)].map((candidate) =>
        signPayformData(candidate, secret)
      )
    : [];

  return [...dataSignatures, ...rawPayloadSignatures].some((candidate) => {
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

function removeOptionalWebhookFileFields(data: PayformData): PayformData {
  const rest = { ...data };

  delete rest.products;
  return rest;
}

function removeSignature(data: PayformData): PayformData {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !["sign", "sign_2", "signature"].includes(key.toLowerCase()) &&
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
