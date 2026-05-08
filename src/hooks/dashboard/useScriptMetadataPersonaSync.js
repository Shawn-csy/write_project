import { useEffect } from "react";

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

    const next = [];
    if (persona.website) {
      next.push({ id: `ct-${Date.now()}-web`, key: "Website", value: persona.website });
    }
    (persona.links || []).forEach((link, index) => {
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
      setLicenseSpecialTerms(ensureList(persona.defaultLicenseSpecialTerms));
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
    if (!orgIds.includes(selectedOrgId)) {
      setSelectedOrgId(orgIds[0]);
    }
  }, [disablePersonaAutofill, identity, personas, selectedOrgId, setIdentity, setSelectedOrgId]);
}
