import { headers } from "next/headers";
import {
  chintamaniSiteBrandName,
  defaultSiteBrandName
} from "@/lib/site-branding";
import {
  getSourceDomainFromHeaders,
  type SourceDomain
} from "@/server/source-domain";

export type SiteBrand = {
  name: string;
  sourceDomain: SourceDomain;
};

export function getSiteBrandForSourceDomain(
  sourceDomain: SourceDomain
): SiteBrand {
  return {
    name:
      sourceDomain === "chintamanidhama.ru"
        ? chintamaniSiteBrandName
        : defaultSiteBrandName,
    sourceDomain
  };
}

export async function getRequestSiteBrand() {
  const headerStore = await headers();

  return getSiteBrandForSourceDomain(getSourceDomainFromHeaders(headerStore));
}
