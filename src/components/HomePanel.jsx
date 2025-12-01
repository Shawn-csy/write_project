import React from "react";
import { Button } from "./ui/button";
import { homeContent } from "../constants/homeContent";

function HomePanel({ accentStyle, onClose }) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm">
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="max-w-5xl mx-auto px-8 py-8 prose prose-sm dark:prose-invert space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${accentStyle.label}`}>
                {homeContent.label}
              </p>
              <h2 className="text-2xl font-semibold">{homeContent.title}</h2>
            </div>
            <Button variant="secondary" onClick={onClose}>
              關閉
            </Button>
          </div>
          {homeContent.introHtml && (
            <div
              className="prose prose-sm dark:prose-invert text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: homeContent.introHtml }}
            />
          )}
          {homeContent.quickGuide?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold">快速導覽</h3>
              <ul className="list-disc pl-5 space-y-1">
                {homeContent.quickGuide.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {homeContent.demo && (
            <>
              <h3 className="text-xl font-semibold">示範</h3>
              <pre>
                <code>{homeContent.demo}</code>
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePanel;
