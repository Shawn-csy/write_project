import { addTagToScript } from "../api/scripts";
import { createTag, getTags } from "../api/tags";

const normalizeTagKey = (value) => String(value || "").trim().toLowerCase();

const parseTagText = (raw) =>
  String(raw || "")
    .split(/[,，、#\n\t;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const parseImportTagNames = ({ metadata = {}, customMetadata = [] } = {}) => {
  const collected = [];

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
  tagNames = [],
  getTagsFn = getTags,
  createTagFn = createTag,
  addTagToScriptFn = addTagToScript,
}) => {
  if (!scriptId || !Array.isArray(tagNames) || tagNames.length === 0) return 0;

  let availableTags = [];
  try {
    const loaded = await getTagsFn();
    availableTags = Array.isArray(loaded) ? loaded : [];
  } catch {
    availableTags = [];
  }

  const byName = new Map(
    availableTags.map((tag) => [normalizeTagKey(tag?.name), tag]).filter(([key]) => key)
  );
  const attached = new Set();
  let attachedCount = 0;

  for (const name of tagNames) {
    const lower = normalizeTagKey(name);
    if (!lower) continue;
    let resolved = byName.get(lower);

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
          resolved = null;
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
