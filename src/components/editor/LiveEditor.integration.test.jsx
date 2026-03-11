import React, { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LiveEditor from "./LiveEditor";

const handleManualSaveMock = vi.fn();
const exportDocxMock = vi.fn(async () => {});

vi.mock("@uiw/react-codemirror", () => ({
  default: () => <div data-testid="codemirror" />,
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

vi.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    theme: "light",
    markerConfigs: [],
    hiddenMarkerIds: [],
    toggleMarkerVisibility: vi.fn(),
    fontSize: 16,
    bodyFontSize: 16,
    dialogueFontSize: 16,
    lineHeight: 1.6,
    accentConfig: { accent: "#000000" },
  }),
}));

vi.mock("../../hooks/useEditorSync", () => ({
  useEditorSync: () => ({
    previewRef: { current: null },
    editorViewRef: { current: null },
    scrollSyncExtension: [],
    highlightExtension: [],
    handleViewUpdate: vi.fn(),
    handleEditorScroll: vi.fn(),
    setEditorReady: vi.fn(),
    scrollEditorToLine: vi.fn(),
    highlightEditorLine: vi.fn(),
    clearHighlightLine: vi.fn(),
  }),
}));

vi.mock("../../hooks/editor/useLiveEditorPersistence", () => ({
  useLiveEditorPersistence: () => ({
    handleChange: vi.fn(),
    handleTitleUpdate: vi.fn(),
    handleBack: vi.fn(),
    handleManualSave: handleManualSaveMock,
  }),
}));

vi.mock("../../hooks/usePreviewLineNavigation", () => ({
  usePreviewLineNavigation: () => ({
    handleLocateText: vi.fn(),
    handlePreviewLineClick: vi.fn(),
  }),
}));

vi.mock("../../components/dashboard/ScriptMetadataDialog", () => ({
  ScriptMetadataDialog: () => null,
}));

vi.mock("./EditorHeader", () => ({
  EditorHeader: ({ onManualSave, downloadOptions = [] }) => (
    <div>
      <button type="button" onClick={onManualSave}>
        manual-save
      </button>
      <button
        type="button"
        onClick={() => downloadOptions.find((opt) => opt.id === "docx")?.onClick?.()}
      >
        download-docx
      </button>
    </div>
  ),
}));

vi.mock("../../hooks/useEditableTitle", () => ({
  useEditableTitle: (title) => ({
    isEditing: false,
    editTitle: title,
    setEditTitle: vi.fn(),
    startEditing: vi.fn(),
    submitTitle: vi.fn(),
  }),
}));

vi.mock("./PreviewPanel", () => ({
  PreviewPanel: React.forwardRef(function MockPreviewPanel(props, ref) {
    useEffect(() => {
      if (props.onProcessedHtml) {
        props.onProcessedHtml("<article>rendered-html</article>");
      }
    }, [props.onProcessedHtml]);
    return (
      <div ref={ref} data-testid="preview-panel">
        preview
      </div>
    );
  }),
}));

vi.mock("./MarkerRulesPanel", () => ({
  MarkerRulesPanel: () => null,
}));

vi.mock("../statistics/StatisticsPanel", () => ({
  StatisticsPanel: () => null,
}));

vi.mock("../common/SpotlightGuideOverlay", () => ({
  SpotlightGuideOverlay: () => null,
}));

vi.mock("../../lib/scriptExportLoader", () => ({
  loadBasicScriptExport: vi.fn(async () => ({
    exportScriptAsFountain: vi.fn(),
    exportScriptAsDocx: exportDocxMock,
    exportScriptAsCsv: vi.fn(),
  })),
  loadXlsxScriptExport: vi.fn(async () => ({
    exportScriptAsXlsx: vi.fn(),
  })),
}));

describe("LiveEditor integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("triggers manual save handler from header action", () => {
    render(
      <MemoryRouter>
        <LiveEditor scriptId="s-1" initialData={{ id: "s-1", title: "測試標題", content: "INT. ROOM - DAY" }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "manual-save" }));
    expect(handleManualSaveMock).toHaveBeenCalledTimes(1);
  });

  it("exports docx with rendered html from preview capture flow", async () => {
    render(
      <MemoryRouter>
        <LiveEditor
          scriptId="s-2"
          initialData={{ id: "s-2", title: "匯出測試", content: "INT. ROOM - DAY" }}
          defaultShowPreview={false}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "download-docx" }));

    await waitFor(() => {
      expect(exportDocxMock).toHaveBeenCalledTimes(1);
    });

    const [title, payload] = exportDocxMock.mock.calls[0];
    expect(title).toBe("匯出測試");
    expect(payload.text).toBe("INT. ROOM - DAY");
    expect(typeof payload.renderedHtml).toBe("string");
  });
});
