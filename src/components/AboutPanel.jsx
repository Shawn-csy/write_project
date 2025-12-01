import React from "react";
import { aboutContent } from "../constants/aboutContent";

function AboutPanel({ accentStyle, onClose }) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm">
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="max-w-5xl mx-auto px-8 py-8 prose prose-sm dark:prose-invert space-y-4">
          {aboutContent.introHtml ? (
            <div
              className="prose prose-sm dark:prose-invert text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: aboutContent.introHtml }}
            />
          ) : (
            aboutContent.intro && (
              <p className="text-muted-foreground">{aboutContent.intro}</p>
            )
          )}
          {aboutContent.quickGuide?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold">30秒快速說明</h3>
              <ul className="list-disc pl-5 space-y-1">
                {aboutContent.quickGuide.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {aboutContent.copyright && (
            <>
              <h3 className="text-xl font-semibold">版權 / Copyright</h3>
              <p className="text-muted-foreground">{aboutContent.copyright}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AboutPanel;
