import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataPersonaSync } from "./useScriptMetadataPersonaSync";

const setter = () => vi.fn();

const buildProps = (overrides = {}) => ({
  open: true,
  disablePersonaAutofill: false,
  identity: "persona:p1",
  personas: [
    {
      id: "p1",
      website: "https://persona.example",
      links: [{ label: "X", url: "https://x.com/p1" }],
      organizationIds: ["org-1", "org-2"],
      defaultLicenseCommercial: "allow",
      defaultLicenseDerivative: "allow",
      defaultLicenseNotify: "required",
      defaultLicenseSpecialTerms: ["署名"],
    },
  ],
  contact: "",
  contactFields: [],
  contactAutoFilledRef: { current: false },
  selectedOrgId: "",
  licenseCommercial: "",
  licenseDerivative: "",
  licenseNotify: "",
  licenseSpecialTerms: [],
  ensureList: vi.fn((value) => Array.isArray(value) ? value : []),
  setContactFields: setter(),
  setLicenseCommercial: setter(),
  setLicenseDerivative: setter(),
  setLicenseNotify: setter(),
  setLicenseSpecialTerms: setter(),
  setIdentity: setter(),
  setSelectedOrgId: setter(),
  ...overrides,
});

describe("useScriptMetadataPersonaSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-fills contact fields once from persona profile", async () => {
    const props = buildProps();
    renderHook(() => useScriptMetadataPersonaSync(props));

    await waitFor(() => {
      expect(props.setContactFields).toHaveBeenCalledTimes(1);
    });
    expect(props.setContactFields).toHaveBeenCalledWith([
      { id: "ct-1700000000000-web", key: "Website", value: "https://persona.example" },
      { id: "ct-1700000000000-0", key: "X", value: "https://x.com/p1" },
    ]);
    expect(props.contactAutoFilledRef.current).toBe(true);
  });

  it("does not auto-fill contacts when already filled or marked as auto-filled", async () => {
    const props = buildProps({
      contactAutoFilledRef: { current: true },
      contactFields: [{ id: "ct-1", key: "Email", value: "a@example.com" }],
    });
    renderHook(() => useScriptMetadataPersonaSync(props));

    await waitFor(() => {
      expect(props.setContactFields).not.toHaveBeenCalled();
    });
  });

  it("applies persona default license only when license is empty", async () => {
    const props = buildProps();
    renderHook(() => useScriptMetadataPersonaSync(props));

    await waitFor(() => {
      expect(props.setLicenseCommercial).toHaveBeenCalledWith("allow");
    });
    expect(props.setLicenseDerivative).toHaveBeenCalledWith("allow");
    expect(props.setLicenseNotify).toHaveBeenCalledWith("required");
    expect(props.ensureList).toHaveBeenCalledWith(["署名"]);
    expect(props.setLicenseSpecialTerms).toHaveBeenCalledWith(["署名"]);
  });

  it("resets identity/org when persona not found and aligns org when persona exists", async () => {
    const missingPersonaProps = buildProps({
      identity: "persona:not-found",
      personas: [{ id: "other", organizationIds: ["org-x"] }],
    });
    renderHook(() => useScriptMetadataPersonaSync(missingPersonaProps));

    await waitFor(() => {
      expect(missingPersonaProps.setIdentity).toHaveBeenCalledWith("");
    });
    expect(missingPersonaProps.setSelectedOrgId).toHaveBeenCalledWith("");

    const orgAlignProps = buildProps({
      selectedOrgId: "org-x",
    });
    renderHook(() => useScriptMetadataPersonaSync(orgAlignProps));

    await waitFor(() => {
      expect(orgAlignProps.setSelectedOrgId).toHaveBeenCalledWith("org-1");
    });
  });

  it("does not mutate identity/license/contact when persona autofill is disabled", async () => {
    const props = buildProps({
      disablePersonaAutofill: true,
      identity: "persona:not-found",
      personas: [],
    });
    renderHook(() => useScriptMetadataPersonaSync(props));

    await waitFor(() => {
      expect(props.setContactFields).not.toHaveBeenCalled();
      expect(props.setLicenseCommercial).not.toHaveBeenCalled();
      expect(props.setLicenseDerivative).not.toHaveBeenCalled();
      expect(props.setLicenseNotify).not.toHaveBeenCalled();
      expect(props.setLicenseSpecialTerms).not.toHaveBeenCalled();
      expect(props.setIdentity).not.toHaveBeenCalled();
      expect(props.setSelectedOrgId).not.toHaveBeenCalled();
    });
  });
});
