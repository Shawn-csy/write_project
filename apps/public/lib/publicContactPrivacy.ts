/**
 * Contact-privacy policy for public author / organization pages.
 *
 * Email and Discord handles are personal contact details. They are never
 * rendered on the page by default; a visitor has to press "顯示聯絡方式", and
 * only entries the owner explicitly marked public (`isPublic === true` or
 * `public === true`) are shown without that extra click.
 */

export interface ContactLike {
  label?: string;
  url?: string;
  value?: string;
  isPublic?: boolean;
  public?: boolean;
}

const PRIVATE_LABEL = /e-?mail|電子郵件|信箱|郵件|discord|\bdc\b/i;
const PRIVATE_VALUE = /^mailto:|^[^\s@]+@[^\s@]+\.[^\s@]+$|discord(?:app)?\.(?:com|gg)|^discord:/i;

export function isPrivateContact(item: ContactLike): boolean {
  const label = String(item.label || "").trim();
  const value = String(item.url ?? item.value ?? "").trim();
  return PRIVATE_LABEL.test(label) || PRIVATE_VALUE.test(value);
}

export function isExplicitlyPublicContact(item: ContactLike): boolean {
  return item.isPublic === true || item.public === true;
}

/** Splits contacts into entries shown directly and entries behind the reveal control. */
export function partitionContacts<T extends ContactLike>(items: T[]): { visible: T[]; hidden: T[] } {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const item of items) {
    if (isPrivateContact(item) && !isExplicitlyPublicContact(item)) hidden.push(item);
    else visible.push(item);
  }
  return { visible, hidden };
}
