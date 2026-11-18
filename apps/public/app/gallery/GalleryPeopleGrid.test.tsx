import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./GalleryPeopleGrid";

const noopTag = () => {};
const noopReset = () => {};

// ─── GalleryAuthorGrid ────────────────────────────────────────────────────────

describe("GalleryAuthorGrid", () => {
  it("switches to an avatar grid while keeping profile links", async () => {
    const author = { id: "p1", displayName: "作者甲" };
    render(<GalleryAuthorGrid peopleStatus="loaded" onRetry={noopReset}
      authors={[author]} filteredAuthors={[author]}
      scripts={[{ id: "s1", title: "第一部作品", persona: author }]}
      allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByRole("link", { name: "前往作品：第一部作品" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "切換為密集顯示" }));
    expect(screen.getByRole("link", { name: /作者甲/ }).getAttribute("href")).toBe("/author/p1");
    expect(screen.getByText("1 部作品")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "前往作品：第一部作品" })).toBeNull();
  });

  it("sends author search input to the shared URL filter", async () => {
    const onSearchChange = vi.fn();
    render(<GalleryAuthorGrid peopleStatus="loaded" onRetry={noopReset}
      authors={[]} filteredAuthors={[]} allTags={[]} selectedTags={[]}
      onToggleTag={noopTag} onResetFilters={noopReset} onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "搜尋作者、作品或標籤" }), "方所長");
    expect(onSearchChange).toHaveBeenCalled();
  });

  it("idle → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="idle" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="loading" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="error" onRetry={retry} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入失敗")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("loaded + data → renders matched author cards", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[
          { id: "p1", displayName: "Author One", bio: "Bio" },
          { id: "p2", displayName: "Hidden Author" },
        ]}
        filteredAuthors={[{ id: "p1", displayName: "Author One" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByRole("link", { name: /Author One/ }).getAttribute("href")).toBe("/author/p1");
    expect(screen.queryByText("Hidden Author")).toBeNull();
  });

  it("shows only the author's linked scripts beneath the identity", () => {
    render(<GalleryAuthorGrid peopleStatus="loaded" onRetry={() => {}}
      authors={[{ id: "p1", displayName: "作者甲", workParticipations: [
        { id: "audio", title: "音聲台本", url: "https://example.com/audio", coverUrl: "", creditRole: "scriptwriter", creditedAs: "作者甲" },
        { id: "audio", title: "音聲台本", url: "https://example.com/audio", coverUrl: "", creditRole: "scriptwriter", creditedAs: "作者甲" },
        { id: "acting", title: "參演", url: "https://example.com/acting", coverUrl: "", creditRole: "voice_actor", creditedAs: "作者甲" },
      ] }]}
      filteredAuthors={[{ id: "p1", displayName: "作者甲" }]}
      scripts={[{ id: "s1", title: "本站台本", persona: { id: "p1", displayName: "作者甲" } }, { id: "s2", title: "別人的台本", persona: { id: "p2", displayName: "作者乙" } }]}
      externalScripts={[{ id: "e1", title: "外部台本", sourceUrl: "https://example.com/story", authorPersonaId: "p1", status: "published" }]}
      allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("3 部參與作品")).toBeTruthy();
    expect(screen.getByRole("link", { name: "前往作品：本站台本" }).getAttribute("href")).toBe("/read/s1");
    expect(screen.getByRole("link", { name: "前往作品：外部台本" }).getAttribute("href")).toBe("https://example.com/story");
    expect(screen.getAllByRole("link", { name: "前往作品：音聲台本" })).toHaveLength(1);
    expect(screen.queryByText("參演")).toBeNull();
    expect(screen.queryByText("別人的台本")).toBeNull();
  });

  it("external author cards resize local media avatars", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "external-1", displayName: "External Author", externalHref: "/author/external/external-author", avatar: "/media/author.jpg" }]}
        filteredAuthors={[{ id: "external-1", displayName: "External Author" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    const image = screen.getByRole("img", { name: "External Author" });
    expect(image.getAttribute("src")).toContain("/api/public-media/");
    expect(image.getAttribute("srcset")).toContain("?w=48 48w");
  });

  it("renders the saved script cover design when there is no uploaded image", () => {
    const author = { id: "p1", displayName: "作者甲" };
    render(<GalleryAuthorGrid
      peopleStatus="loaded" onRetry={noopReset}
      authors={[author]} filteredAuthors={[author]}
      scripts={[{
        id: "s1", title: "微小告白", persona: author, coverUrl: "",
        coverDesign: {
          bg: { type: "solid", colorA: "#e9bfaa" },
          title: {
            text: "自訂封面文字", direction: "horizontal", font: "serif", size: "md",
            letterSpacing: 0, effect: "none", color: "#222222", x: 0.5, y: 0.5,
          },
        },
      }]}
      allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset}
    />);
    const work = screen.getByRole("link", { name: "前往作品：微小告白" });
    expect(work.textContent).toContain("自訂封面文字");
    expect(work.getAttribute("href")).toBe("/read/s1");
  });

  it("shows the author's initial when an avatar image fails", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "broken", displayName: "海聶", avatar: "/media/missing.jpg" }]}
        filteredAuthors={[{ id: "broken", displayName: "海聶" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    fireEvent.error(screen.getByRole("img", { name: "海聶" }));
    expect(screen.queryByRole("img", { name: "海聶" })).toBeNull();
    expect(screen.getByText("海")).toBeTruthy();
  });

  it("never turns an unverified contact value into a relative link", async () => {
    render(<GalleryAuthorGrid peopleStatus="loaded" onRetry={() => {}}
      authors={[{ id: "p1", displayName: "作者甲", links: [
        { label: "其他", url: "what" }, { label: "Email", url: "person@example.com" },
        { label: "官網", url: "https://example.com" },
      ] }]}
      filteredAuthors={[{ id: "p1", displayName: "作者甲" }]}
      allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.queryByRole("link", { name: "作者甲的其他" })).toBeNull();
    expect(screen.getByText("其他：what")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "作者甲的Email" })).toBeNull();
    expect(screen.getByRole("link", { name: "作者甲的官網" }).getAttribute("href")).toBe("https://example.com/");
    await userEvent.click(screen.getByRole("button", { name: "顯示聯絡方式" }));
    expect(screen.getByRole("link", { name: "作者甲的Email" }).getAttribute("href")).toBe("mailto:person@example.com");
  });

  it("loaded + empty filteredAuthors → empty message", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "p1", displayName: "Author One" }]}
        filteredAuthors={[]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByText("找不到符合的作者")).toBeTruthy();
  });

  it("tag chips render and call onToggleTag on click", async () => {
    const toggle = vi.fn();
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "p1", displayName: "Author One", tags: ["配音"] }]}
        filteredAuthors={[{ id: "p1", displayName: "Author One" }]}
        allTags={["配音", "劇本"]}
        selectedTags={[]}
        onToggleTag={toggle}
        onResetFilters={noopReset}
      />
    );
    const chip = screen.getAllByRole("button", { name: "配音" })[0];
    await userEvent.click(chip);
    expect(toggle).toHaveBeenCalledWith("配音");
  });

  it("active tag chip shows clear-filter button", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[]}
        filteredAuthors={[]}
        allTags={["配音"]}
        selectedTags={["配音"]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByRole("button", { name: /清除篩選/ })).toBeTruthy();
  });
});

// ─── GalleryOrgGrid ───────────────────────────────────────────────────────────

describe("GalleryOrgGrid", () => {
  it("idle → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="idle" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="loading" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="error" onRetry={retry} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入失敗")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("loaded + data → renders matched org cards", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[
          { id: "o1", name: "Org One", description: "Description" },
          { id: "o2", name: "Hidden Org" },
        ]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByRole("link", { name: /Org One/ }).getAttribute("href")).toBe("/org/o1");
    expect(screen.queryByText("Hidden Org")).toBeNull();
  });

  it("external organization cards resize local media logos", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "external-org", name: "External Org", externalHref: "/org/external/external-org", logoUrl: "/media/org.png" }]}
        filteredOrgs={[{ id: "external-org", name: "External Org" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    const image = screen.getByRole("img", { name: "External Org" });
    expect(image.getAttribute("src")).toContain("/api/public-media/");
    expect(image.getAttribute("srcset")).toContain("?w=48 48w");
  });

  it("loaded + empty filteredOrgs → empty message", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One" }]}
        filteredOrgs={[]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByText("找不到符合的組織")).toBeTruthy();
  });

  it("tag chips render and call onToggleTag on click", async () => {
    const toggle = vi.fn();
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One", tags: ["活動"] }]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
        allTags={["活動"]}
        selectedTags={[]}
        onToggleTag={toggle}
        onResetFilters={noopReset}
      />
    );
    const chip = screen.getAllByRole("button", { name: "活動" })[0];
    await userEvent.click(chip);
    expect(toggle).toHaveBeenCalledWith("活動");
  });

  it("org card with website has no nested anchor inside org link", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One", website: "https://example.com" }]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    const orgLink = screen.getByRole("link", { name: /Org One/ });
    // website link must NOT be a descendant of the org anchor
    const nestedAnchors = orgLink.querySelectorAll("a");
    expect(nestedAnchors.length).toBe(0);
    // website link must exist as a sibling/cousin, not nested
    const websiteLink = screen.getByRole("link", { name: /example\.com/ });
    expect(websiteLink).toBeTruthy();
  });
});
