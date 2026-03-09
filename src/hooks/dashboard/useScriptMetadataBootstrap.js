import { useEffect, useRef } from "react";
import { getPersonas } from "../../lib/api/personas";
import { getOrganizations, getOrganization } from "../../lib/api/organizations";
import { getUserProfile } from "../../lib/api/user";
import { fetchUserThemes } from "../../services/settingsApi";
import { normalizeOrgIds } from "./scriptMetadataUtils";
import { isDefaultLikeTheme } from "../../lib/themeNameUtils";
import { buildAffiliatedOrganizations } from "../../lib/orgAffiliation";

export function useScriptMetadataBootstrap({
  open,
  currentUser,
  currentProfile,
  t,
  loadTags,
  setPersonas,
  setOrgs,
  setMarkerThemes,
  setShowPersonaSetupDialog,
}) {
  const initializedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      return;
    }
    loadTags();
  }, [open, loadTags]);

  useEffect(() => {
    if (!open || !currentUser) return;
    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;
    let cancelled = false;

    const loadBootstrapData = async () => {
      try {
        const [pData, oData, tData] = await Promise.all([
          getPersonas(),
          getOrganizations(),
          fetchUserThemes(currentUser),
        ]);

        const normalizedPersonas = (pData || []).map((persona) => ({
          ...persona,
          organizationIds: normalizeOrgIds(persona?.organizationIds),
        }));

        let profile = currentProfile;
        if (!profile) {
          try {
            profile = await getUserProfile();
          } catch {
            profile = null;
          }
        }

        const dedupedOrgs = await buildAffiliatedOrganizations({
          ownedOrgs: oData || [],
          profile,
          personas: normalizedPersonas,
          fetchOrganizationById: getOrganization,
        });

        if (cancelled) return;

        setPersonas(normalizedPersonas);
        setOrgs(dedupedOrgs);
        setShowPersonaSetupDialog(Array.isArray(normalizedPersonas) && normalizedPersonas.length === 0);

        const userThemes = tData || [];
        const customThemes = userThemes.filter((theme) => !isDefaultLikeTheme(theme));
        setMarkerThemes([{ id: "default", name: t("scriptMetadataDialog.defaultTheme") }, ...customThemes]);
      } catch (error) {
        console.error("Failed to bootstrap script metadata dialog", error);
      }
    };

    loadBootstrapData();

    return () => {
      cancelled = true;
    };
  }, [currentProfile, currentUser, open, setMarkerThemes, setOrgs, setPersonas, setShowPersonaSetupDialog, t]);
}
