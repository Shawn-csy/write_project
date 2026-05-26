import { useEffect } from "react";
import type { PersonaLike } from "../../types/persona";
import type { ContactField, LicenseSpecialTerm } from "./types";

export function useScriptMetadataPersonaSync({
  open,
  disablePersonaAutofill = false,
  identity,
  personas,
  contact,
  contactFields,
  contactAutoFilledRef,
  selectedOrgId,
  licenseCommercial,
  licenseDerivative,
  licenseNotify,
  licenseSpecialTerms,
  ensureList,
  setContactFields,
  setLicenseCommercial,
  setLicenseDerivative,
  setLicenseNotify,
  setLicenseSpecialTerms,
  setIdentity,
  setSelectedOrgId,
}: {
  open: boolean;
  disablePersonaAutofill?: boolean;
  identity: string;
  personas: PersonaLike[];
  contact: string;
  contactFields: ContactField[];
  contactAutoFilledRef: { current: boolean };
  selectedOrgId: string | null;
  licenseCommercial: string;
  licenseDerivative: string;
  licenseNotify: string;
  licenseSpecialTerms: LicenseSpecialTerm[];
  ensureList: (v: unknown) => unknown[];
  setContactFields: (v: ContactField[]) => void;
  setLicenseCommercial: (v: string) => void;
  setLicenseDerivative: (v: string) => void;
  setLicenseNotify: (v: string) => void;
  setLicenseSpecialTerms: (v: LicenseSpecialTerm[]) => void;
  setIdentity: (v: string) => void;
  setSelectedOrgId: (v: string | null) => void;
}) {
  useEffect(() => {
    if (disablePersonaAutofill) return;
    if (!open) return;
    if (contactAutoFilledRef.current) return;
    if (!identity || !identity.startsWith("persona:")) return;
    if (contact || (contactFields && contactFields.length > 0)) return;
    const personaId = identity.split(":")[1];
    const persona = personas.find((item) => item.id === personaId);
    if (!persona) return;

    const next: Array<{ id: string; key: string; value: string }> = [];
    if (persona.website) {
      next.push({ id: `ct-${Date.now()}-web`, key: "Website", value: persona.website });
    }
    (Array.isArray(persona.links) ? persona.links : []).forEach((link, index) => {
      if (!link?.url) return;
      next.push({
        id: `ct-${Date.now()}-${index}`,
        key: link.label || "Link",
        value: link.url,
      });
    });
    if (next.length > 0) {
      setContactFields(next);
      contactAutoFilledRef.current = true;
    }
  }, [disablePersonaAutofill, open, identity, personas, contact, contactFields, contactAutoFilledRef, setContactFields]);

  useEffect(() => {
    if (disablePersonaAutofill) return;
    if (!identity || !identity.startsWith("persona:")) return;
    const personaId = identity.split(":")[1];
    const persona = personas.find((item) => item.id === personaId);
    if (!persona) return;
    if (!licenseCommercial?.trim() && persona.defaultLicenseCommercial) setLicenseCommercial(persona.defaultLicenseCommercial);
    if (!licenseDerivative?.trim() && persona.defaultLicenseDerivative) setLicenseDerivative(persona.defaultLicenseDerivative);
    if (!licenseNotify?.trim() && persona.defaultLicenseNotify) setLicenseNotify(persona.defaultLicenseNotify);
    if ((licenseSpecialTerms || []).length === 0 && Array.isArray(persona.defaultLicenseSpecialTerms) && persona.defaultLicenseSpecialTerms.length > 0) {
      setLicenseSpecialTerms(ensureList(persona.defaultLicenseSpecialTerms) as LicenseSpecialTerm[]);
    }
  }, [
    disablePersonaAutofill,
    identity,
    personas,
    licenseCommercial,
    licenseDerivative,
    licenseNotify,
    licenseSpecialTerms,
    ensureList,
    setLicenseCommercial,
    setLicenseDerivative,
    setLicenseNotify,
    setLicenseSpecialTerms,
  ]);

  useEffect(() => {
    if (disablePersonaAutofill) return;
    if (!identity || !identity.startsWith("persona:")) return;
    if (personas.length === 0) return;

    const personaId = identity.split(":")[1];
    const persona = personas.find((item) => item.id === personaId);
    if (!persona) {
      setIdentity("");
      setSelectedOrgId("");
      return;
    }
    const orgIds = persona?.organizationIds || [];
    if (orgIds.length === 0) {
      setSelectedOrgId("");
      return;
    }
    if (!orgIds.includes(selectedOrgId || "")) {
      setSelectedOrgId(orgIds[0]);
    }
  }, [disablePersonaAutofill, identity, personas, selectedOrgId, setIdentity, setSelectedOrgId]);
}
