import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// 必須放在 apps/public/ 底下：vi.mock("next/link") 需要能解析到 next，
// 而 next 16.3.1 起是巢狀安裝在 apps/public/node_modules，root 解析不到。
//
// 也必須自足、不可 import ../../src/*：apps/public/Dockerfile 只複製
// apps/public/ 與 packages/，不含 src/。
//
// apps/public/tsconfig.json 已排除測試檔，因此本檔不會進入正式建置的型別
// 檢查範圍（與 root tsconfig.json 排除測試檔的既有慣例一致）。

// jsdom 未實作 matchMedia，補 stub 讓呼叫 window.matchMedia() 的元件不致拋錯。
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * apps/public 專用的測試前置。
 *
 * 為什麼需要 mock next/link
 * ─────────────────────────
 * 這個 monorepo 有兩份 React：
 *   root  node_modules/react           18.3.1  （Vite 工作區 SPA）
 *   apps/public/node_modules/react     19.2.4  （Next 16 公開站）
 *
 * next 的 client 元件是 CJS，內部以 require("react") 解析，會繞過 Vite 的
 * resolve.alias 與 resolve.dedupe。因此 next/link 抓到 React 19，而 renderer
 * 是 root 的 react-dom 18：
 *
 *   next/dist/client/link.js  → apps/public/node_modules/react   (19)
 *   renderWithHooks           → node_modules/react-dom           (18)
 *
 * 結果是 `Cannot read properties of null (reading 'useContext')`。
 *
 * next 16.2.7 時 next 被提升到 root node_modules，安裝佈局讓兩邊剛好收斂；
 * 升到 16.3.1 後 next 改為巢狀安裝，分岔才浮現 —— 也就是說，先前能通過是
 * 安裝佈局的巧合，不是設計。
 *
 * 這裡沿用專案既有做法（PublicInfoMenu.test.tsx、PublicInfoPageShell.test.tsx
 * 已各自 mock next/link），改為集中處理避免逐檔重複。
 *
 * 真正的解法
 * ─────────
 * 統一 React 版本（root 升到 19），如此就只會有一份 React。阻擋項目是
 * react-helmet-async 不支援 React 19（src/main.tsx、src/components/common/
 * MetaTags.tsx 有使用），需先替換或移除。公開頁 SEO 已由 Next 接手，
 * 工作區 SPA 是否仍需要 helmet 值得重新評估。
 * 詳見 docs/engineering/dependency-audit.md。
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
