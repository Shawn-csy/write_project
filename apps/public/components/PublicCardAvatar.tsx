import type { AvatarImageRenderer } from "@write/public-ui";
import { CardMediaImage } from "./CardMediaVisibility";

/** The shared card frame can stay framework-neutral while this host sizes avatars. */
export const publicCardAvatarRenderer: AvatarImageRenderer = ({ src, crop, organization }) => (
  <span
    className={`relative block h-4 w-4 shrink-0 overflow-hidden ${organization ? "rounded-md" : "rounded-full"}`}
    aria-hidden="true"
  >
    <CardMediaImage src={src} crop={crop} alt="" preset="avatar" fixedMediaWidth={48} fetchPriority="low" />
  </span>
);
