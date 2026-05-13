import { addTagToScript } from "../api/scripts";
import { createTag, getTags } from "../api/tags";

interface TagObject { id: string; name: string; [key: string]: unknown; }

const normalizeTagKey = (value: unknown): string => String(value || "").trim().toLowerCase();

const parseTagText = (raw: unknown): string[] =>
  String(raw || "")
    .split(/[,，、#\n\t;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const parseImportTagNames = ({
  metadata = {} as Record<string, string>,
  customMetadata = [] as Array<{ key: string; value: string }>,
} = {}): string[] => {
  const collected: string[] = [];

  const metaTagValue = metadata?.Tags ?? metadata?.tags;
  if (metaTagValue) {
    collected.push(...parseTagText(metaTagValue));
  }

  (customMetadata || []).forEach((entry) => {
    const key = normalizeTagKey(entry?.key);
    if (key === "tags" || key === "tag" || key === "標籤") {
      collected.push(...parseTagText(entry?.value));
    }
  });

  const seen = new Set();
  return collected.filter((name) => {
    const key = normalizeTagKey(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const syncImportedTagsToScript = async ({
  scriptId,
  tagNames = [] as string[],
  getTagsFn = getTags,
  createTagFn = createTag,
  addTagToScriptFn = addTagToScript,
}: {
  scriptId: string;
  tagNames?: string[];
  getTagsFn?: () => Promise<TagObject[]>;
  createTagFn?: (name: string, color: string) => Promise<TagObject>;
  addTagToScriptFn?: (scriptId: string, tagId: string) => Promise<unknown>;
}): Promise<number> => {
  if (!scriptId || !Array.isArray(tagNames) || tagNames.length === 0) return 0;

  let availableTags: TagObject[] = [];
  try {
    const loaded = await getTagsFn();
    availableTags = Array.isArray(loaded) ? loaded : [];
  } catch {
    availableTags = [];
  }

  const byName = new Map<string, TagObject>(
    availableTags
      .map((tag): [string, TagObject] => [normalizeTagKey(tag?.name), tag])
      .filter(([key]) => Boolean(key))
  );
  const attached = new Set<string>();
  let attachedCount = 0;

  for (const name of tagNames) {
    const lower = normalizeTagKey(name);
    if (!lower) continue;
    let resolved: TagObject | undefined = byName.get(lower);

    if (!resolved) {
      try {
        resolved = await createTagFn(name, "bg-gray-500");
        if (resolved?.name) {
          byName.set(normalizeTagKey(resolved.name), resolved);
        }
      } catch {
        try {
          const latest = await getTagsFn();
          const latestList = Array.isArray(latest) ? latest : [];
          latestList.forEach((tag) => {
            const key = normalizeTagKey(tag?.name);
            if (key) byName.set(key, tag);
          });
          resolved = byName.get(lower);
        } catch {
          resolved = undefined;
        }
      }
    }

    if (!resolved?.id || attached.has(resolved.id)) continue;

    try {
      await addTagToScriptFn(scriptId, resolved.id);
      attached.add(resolved.id);
      attachedCount += 1;
    } catch {
      // Keep import flow alive even if single tag binding fails.
    }
  }

  return attachedCount;
};
