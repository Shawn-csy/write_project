/**
 * Integration tests for ReadWorkHeader.
 * Verifies the component renders correctly from a ReadWorkHeaderModel,
 * including title, author/org/tag links, series position, like action, and
 * license/rating metadata.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ReadWorkHeader } from "./ReadWorkHeader";
import type { ReadWorkHeaderModel } from "@/lib/readWorkHeaderModel";

const BASE_MODEL: ReadWorkHeaderModel = {
  title: "Test Script",
  synopsis: undefined,
  coverUrl: undefined,
  coverCrop: null,
  coverDesign: null,
  author: null,
  organization: null,
  series: null,
  views: 5,
  likes: 1,
  isLiked: false,
  durationMinutes: undefined,
  dialogueChars: undefined,
  tags: [],
  license: "",
  commercialUse: "",
  derivativeUse: "",
  notifyOnModify: "",
  licenseSpecialTerms: [],
  targetAudience: "",
  contentRating: "",
  prefaceItems: [],
  demoLinks: [],
  customFields: [],
};

const BASE_ACTIONS = {
  onLike: vi.fn(),
};

describe("ReadWorkHeader — title", () => {
  it("renders title", () => {
    render(<ReadWorkHeader model={BASE_MODEL} actions={BASE_ACTIONS} />);
    expect(screen.queryByText("Test Script")).not.toBeNull();
  });
});

describe("ReadWorkHeader — route-local CTA removal", () => {
  it("does not render a start-reading anchor", () => {
    render(<ReadWorkHeader model={BASE_MODEL} actions={BASE_ACTIONS} />);
    expect(screen.queryByRole("link", { name: /開始閱讀/ })).toBeNull();
  });

  it("does not render route-local share or text download buttons", () => {
    render(<ReadWorkHeader model={BASE_MODEL} actions={BASE_ACTIONS} />);
    expect(screen.queryByRole("button", { name: /分享/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /下載/i })).toBeNull();
  });
});

describe("ReadWorkHeader — like action", () => {
  it("like button calls onLike", async () => {
    const onLike = vi.fn();
    const user = userEvent.setup();
    render(
      <ReadWorkHeader
        model={BASE_MODEL}
        actions={{ onLike }}
      />
    );
    await user.click(screen.getByRole("button", { name: "喜歡" }));
    expect(onLike).toHaveBeenCalledTimes(1);
  });
});

describe("ReadWorkHeader — tag links", () => {
  it("renders tags as /tag/ links", () => {
    render(
      <ReadWorkHeader
        model={{ ...BASE_MODEL, tags: ["配音", "奇幻"] }}
        actions={BASE_ACTIONS}
      />
    );
    const link = screen.getByRole("link", { name: "配音" });
    expect(link.getAttribute("href")).toBe("/tag/%E9%85%8D%E9%9F%B3");
  });
});

describe("ReadWorkHeader — series position", () => {
  it("renders series link", () => {
    render(
      <ReadWorkHeader
        model={{
          ...BASE_MODEL,
          series: { name: "黑夜系列", href: "/series/%E9%BB%91%E5%A4%9C%E7%B3%BB%E5%88%97", order: 2 },
        }}
        actions={BASE_ACTIONS}
      />
    );
    const link = screen.getByRole("link", { name: "黑夜系列" });
    expect(link.getAttribute("href")).toContain("/series/");
  });

  it("seriesOrder 2 renders 第 2 部", () => {
    render(
      <ReadWorkHeader
        model={{
          ...BASE_MODEL,
          series: { name: "黑夜系列", href: "/series/test", order: 2 },
        }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("第 2 部")).not.toBeNull();
  });

  it("seriesOrder 0 renders 設定／背景", () => {
    render(
      <ReadWorkHeader
        model={{
          ...BASE_MODEL,
          series: { name: "黑夜系列", href: "/series/test", order: 0 },
        }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("設定／背景")).not.toBeNull();
  });

  it("no series → no series link", () => {
    render(<ReadWorkHeader model={BASE_MODEL} actions={BASE_ACTIONS} />);
    expect(screen.queryByText("黑夜系列")).toBeNull();
  });
});

describe("ReadWorkHeader — license / rating metadata", () => {
  it("renders targetAudience and contentRating when present", () => {
    render(
      <ReadWorkHeader
        model={{
          ...BASE_MODEL,
          targetAudience: "全年齡",
          contentRating: "普通",
        }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("全年齡")).not.toBeNull();
    expect(screen.queryByText("普通")).not.toBeNull();
  });

  it("hides audience card when targetAudience is empty", () => {
    render(
      <ReadWorkHeader
        model={{ ...BASE_MODEL, targetAudience: "", contentRating: "普通" }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("觀眾取向")).toBeNull();
    expect(screen.queryByText("普通")).not.toBeNull();
  });

  it("hides rating card when contentRating is empty", () => {
    render(
      <ReadWorkHeader
        model={{ ...BASE_MODEL, targetAudience: "全年齡", contentRating: "" }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("內容分級")).toBeNull();
    expect(screen.queryByText("全年齡")).not.toBeNull();
  });

  it("tags and license still render without audience/rating", () => {
    render(
      <ReadWorkHeader
        model={{
          ...BASE_MODEL,
          targetAudience: "",
          contentRating: "",
          tags: ["配音"],
          license: "CC BY 4.0",
        }}
        actions={BASE_ACTIONS}
      />
    );
    expect(screen.queryByText("觀眾取向")).toBeNull();
    expect(screen.queryByText("內容分級")).toBeNull();
    expect(screen.queryByText("配音")).not.toBeNull();
    expect(screen.queryByText("CC BY 4.0")).not.toBeNull();
  });
});
