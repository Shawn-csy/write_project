import type { RefObject } from "react";
import type { Nav } from "../hooks/useAppNavigation";

export type { Nav };

export interface NavProps {
  nav: Nav;
  contentScrollRef?: RefObject<HTMLElement | null>;
  handleLocateText?: (text: string) => void;
  /** @deprecated use handleLocateText */
  onLocateText?: (text: string) => void;
}
