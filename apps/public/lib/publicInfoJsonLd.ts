import { BASE_URL } from "@/lib/seo";

export interface PublicInfoWebPageInput {
  path: string;
  name: string;
  description: string;
}

export function createPublicInfoWebPageJsonLd({
  path,
  name,
  description,
}: PublicInfoWebPageInput) {
  const url = new URL(path, BASE_URL).toString();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "zh-Hant",
    isPartOf: { "@id": `${BASE_URL}/#website` },
  };
}
