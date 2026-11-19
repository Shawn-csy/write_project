import React, { useCallback } from "react";
import { createEmptyActivityDemoLink } from "../../lib/activityDemoLinks";
import type { CustomField, ContactField } from "./types";

interface InlineActionsState {
    customFields: CustomField[];
    setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
    contactFields: ContactField[];
    setContactFields: React.Dispatch<React.SetStateAction<ContactField[]>>;
    setActivityDemoLinks: React.Dispatch<React.SetStateAction<unknown[]>>;
    setLicenseSpecialTerms: React.Dispatch<React.SetStateAction<string[]>>;
    publishNewTerm: string;
    setPublishNewTerm: (v: string) => void;
    userEditedRef: React.MutableRefObject<boolean>;
    customIdRef: React.MutableRefObject<number>;
}

export function useScriptMetadataInlineActions({
    customFields, setCustomFields,
    contactFields, setContactFields,
    setActivityDemoLinks,
    setLicenseSpecialTerms,
    publishNewTerm, setPublishNewTerm,
    userEditedRef,
    customIdRef,
}: InlineActionsState) {

    const handleCustomFieldUpdate = useCallback((index: number, field: "key" | "value" | "type", value: string) => {
        userEditedRef.current = true;
        setCustomFields((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) return prev;
            if (field === "type") {
                if (value === "text" || value === "divider") {
                    next[index] = { ...current, type: value };
                }
                return next;
            }
            next[index] = { ...current, [field]: value };
            return next;
        });
    }, [setCustomFields, userEditedRef]);

    const handleContactFieldUpdate = useCallback((index: number, field: "key" | "value", value: string) => {
        userEditedRef.current = true;
        setContactFields((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) return prev;
            next[index] = { ...current, [field]: value };
            return next;
        });
    }, [setContactFields, userEditedRef]);

    const addCustomField = useCallback((key = "", value = "") => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key, value, type: "text" }]);
    }, [setCustomFields, customIdRef]);

    const addDivider = useCallback(() => {
        customIdRef.current += 1;
        setCustomFields((prev) => [...prev, { id: `cf-${customIdRef.current}`, key: `_sep_${Date.now()}`, value: "SECTION", type: "divider" }]);
    }, [setCustomFields, customIdRef]);

    const handleAddContactField = useCallback((preset: string) => {
        customIdRef.current += 1;
        setContactFields((prev) => [...prev, { id: `ct-${customIdRef.current}`, key: preset, value: "" }]);
    }, [setContactFields, customIdRef]);

    // Adapter variants for id-based external callers
    const handleContactFieldUpdateAdapter = useCallback((id: string, key: string, value: string) => {
        const index = contactFields.findIndex((f) => f.id === id);
        if (index !== -1) handleContactFieldUpdate(index, key as "key" | "value", value);
    }, [contactFields, handleContactFieldUpdate]);

    const handleCustomFieldUpdateAdapter = useCallback((id: string, key: string, value: string) => {
        const index = customFields.findIndex((f) => f.id === id);
        if (index !== -1) handleCustomFieldUpdate(index, key as "key" | "value" | "type", value);
    }, [customFields, handleCustomFieldUpdate]);

    const handleAddContactFieldAdapter = useCallback(() => {
        handleAddContactField("");
    }, [handleAddContactField]);

    // License special terms
    const addLicenseSpecialTerm = useCallback(() => {
        const value = String(publishNewTerm || "").trim();
        if (!value) return;
        setLicenseSpecialTerms((prev) => [...(prev || []), value]);
        setPublishNewTerm("");
    }, [publishNewTerm, setLicenseSpecialTerms, setPublishNewTerm]);

    const removeLicenseSpecialTerm = useCallback((index: number) => {
        setLicenseSpecialTerms((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next;
        });
    }, [setLicenseSpecialTerms]);

    // Activity demo links
    const handleAddActivityDemoLink = useCallback(() => {
        setActivityDemoLinks((prev) => [...(prev || []), createEmptyActivityDemoLink(`demo-${Date.now()}`)]);
    }, [setActivityDemoLinks]);

    const handleUpdateActivityDemoLink = useCallback((index: number, field: string, value: string) => {
        setActivityDemoLinks((prev) => {
            const next = [...(prev || [])] as Record<string, unknown>[];
            next[index] = { ...(next[index] || createEmptyActivityDemoLink(`demo-${index + 1}`)), [field]: value };
            return next;
        });
    }, [setActivityDemoLinks]);

    const handleRemoveActivityDemoLink = useCallback((index: number) => {
        setActivityDemoLinks((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next;
        });
    }, [setActivityDemoLinks]);

    return {
        handleCustomFieldUpdate,
        handleContactFieldUpdate,
        addCustomField,
        addDivider,
        handleAddContactField,
        handleContactFieldUpdateAdapter,
        handleCustomFieldUpdateAdapter,
        handleAddContactFieldAdapter,
        addLicenseSpecialTerm,
        removeLicenseSpecialTerm,
        handleAddActivityDemoLink,
        handleUpdateActivityDemoLink,
        handleRemoveActivityDemoLink,
    };
}
