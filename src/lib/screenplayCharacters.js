// 角色色塊與焦點模式的 DOM 操作
export const makeCharacterColorGetter = (themePalette, cacheRef) => (name) => {
  if (!name) return "hsl(0 0% 50%)";
  const key = name.toUpperCase();
  if (cacheRef?.current?.has(key)) return cacheRef.current.get(key);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % (themePalette?.length || 1);
  const color = themePalette?.[colorIndex] || "160 84% 39%";
  cacheRef?.current?.set?.(key, color);
  return color;
};

const applyBlockClass = (nodes, highlightCharacters) => {
  nodes.forEach((n) => {
    n.classList.add("character-block");
    if (highlightCharacters) {
      n.classList.remove("no-highlight");
    } else {
      n.classList.add("no-highlight");
    }
  });
};

const pruneBundle = (nodes, focusContentMode) => {
  if (focusContentMode !== "dialogue") return nodes;
  const allowed = nodes.filter(
    (n) => n.classList.contains("dialogue") || n.classList.contains("character")
  );
  nodes.forEach((n) => {
    if (!allowed.includes(n)) n.remove();
  });
  return allowed;
};

export const applyCharacterBlocks = (doc, options) => {
  const {
    highlightCharacters = true,
    themePalette = [],
    colorCache,
    focusMode,
    filterCharacter,
    focusEffect = "hide",
    focusContentMode = "all",
  } = options || {};

  const getCharacterColor = makeCharacterColorGetter(themePalette, colorCache);

  if (!focusMode || !filterCharacter || filterCharacter === "__ALL__") {
    const markBundle = (nodes) => {
      // 角色名稱可能在 .character 或 h4
      let charNode = nodes.find((n) => n.classList.contains("character"));
      if (!charNode) {
        const heading = nodes.find((n) => n.tagName === "H4");
        if (heading) {
          heading.classList.add("character");
          charNode = heading;
        }
      }
      const name = charNode?.textContent?.trim();
      const color = getCharacterColor(name);
      applyBlockClass(nodes, highlightCharacters);
      nodes.forEach((n) => n.style.setProperty("--char-color", color));
    };

    const characters = Array.from(doc.querySelectorAll(".character, .dialogue > h4"));
    characters.forEach((charNode) => {
      const bundle = [charNode];
      let sibling = charNode.nextElementSibling;
      while (
        sibling &&
        (sibling.classList.contains("dialogue") || sibling.classList.contains("parenthetical"))
      ) {
        bundle.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      markBundle(bundle);
    });

    // 孤立對話防禦
    doc.querySelectorAll(".dialogue").forEach((dlg) => {
      if (dlg.classList.contains("character-block")) return;
      const h4 = dlg.querySelector("h4");
      if (h4) {
        const name = h4.textContent.trim();
        const color = getCharacterColor(name);
        dlg.classList.add("character-block");
        dlg.style.setProperty("--char-color", color);
      }
    });
    return;
  }

  // 順讀模式
  const target = filterCharacter.toUpperCase();
  const handleBundle = (isTarget, nodes) => {
    applyBlockClass(nodes, highlightCharacters);
    const pruned = pruneBundle(nodes, focusContentMode);
    if (!pruned.length) return;
    if (focusEffect === "hide") {
      if (isTarget) {
        pruned.forEach((n) => n.classList.add("highlight"));
      } else {
        pruned.forEach((n) => n.remove());
      }
    } else {
      pruned.forEach((n) => {
        if (isTarget) {
          n.classList.add("highlight");
        } else {
          n.classList.add("muted");
        }
      });
    }
  };

  const characters = Array.from(doc.querySelectorAll(".character, .dialogue > h4"));
  characters.forEach((charNode) => {
    if (!charNode.classList.contains("character")) {
      charNode.classList.add("character");
    }
    const name = charNode.textContent?.trim().toUpperCase();
    const isTarget = name && name === target;
    const bundle = [charNode];
    let sibling = charNode.nextElementSibling;
    while (
      sibling &&
      (sibling.classList.contains("dialogue") || sibling.classList.contains("parenthetical"))
    ) {
      bundle.push(sibling);
      sibling = sibling.nextElementSibling;
    }
    handleBundle(isTarget, bundle);
  });

  doc.querySelectorAll(".dialogue").forEach((dlg) => {
    const h4 = dlg.querySelector("h4");
    const name = h4?.textContent?.trim().toUpperCase();
    const isTarget = name && name === target;
    handleBundle(isTarget, [dlg]);
  });
};
