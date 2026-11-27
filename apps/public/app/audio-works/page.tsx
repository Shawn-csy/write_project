import { AudioWorksClient } from "./AudioWorksClient";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";

export const metadata = publicDirectoryMetadata(
  "/audio-works",
  `音聲｜${TITLE_SUFFIX}`,
  "依社團與頻道或全部作品探索音聲，查看演出與製作署名，並前往原始平台收聽。",
);

export default function AudioWorksPage() {
  return <AudioWorksClient />;
}
