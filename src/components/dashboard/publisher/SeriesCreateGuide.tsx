import React from "react";

export function SeriesCreateGuide(): React.JSX.Element {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 space-y-1">
      <p className="text-sm font-semibold">新系列草稿</p>
      <p className="text-xs text-muted-foreground">
        建立後會進入系列工作區，可加入既有作品並調整章節順序。摘要與封面可稍後補齊。
      </p>
    </div>
  );
}
