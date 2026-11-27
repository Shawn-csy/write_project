export const kindNames = {
  script: "本站台本",
  external: "外部台本",
  audio: "音聲",
  game: "遊戲",
  soundtrack: "原聲帶",
  video: "影片",
  other: "其他作品",
} as const;

export type WorkKind = keyof typeof kindNames;

export interface WorkSummary {
  id: string;
  kind: WorkKind;
  title: string;
  cover?: string | null;
  gated?: boolean;
  primaryHref?: string;
}

export interface WorkLink {
  label: string;
  href: string;
}

export interface Credit {
  personaId?: string;
  role: string;
  name: string;
  href?: string;
  avatar?: string | null;
  source?: string;
}

export interface CatalogWork extends WorkSummary {
  summary?: string | null;
  subtitle?: string | null;
  isAdult?: boolean;
  isFree?: boolean;
  externalHref?: string;
  externalLabel?: string;
  links: WorkLink[];
  credits: Credit[];
  demos: WorkLink[];
}
