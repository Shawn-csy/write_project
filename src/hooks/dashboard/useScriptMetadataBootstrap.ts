import { useEffect, useRef } from "react";
import { getPersonas } from "../../lib/api/personas";
import { getOrganizations, getOrganization } from "../../lib/api/organizations";
import { getUserProfile } from "../../lib/api/user";
import { fetchUserThemes } from "../../services/settingsApi";
import { normalizeOrgIds } from "./scriptMetadataUtils";
import { isDefaultLikeTheme } from "../../lib/themeNameUtils";
import { buildAffiliatedOrganizations } from "../../lib/orgAffiliation";
import type { CurrentUserLike } from "../../types/user";
import type { PersonaLike, OrgData } from "../../types/persona";

interface MarkerTheme { id: string; name: string; [key: string]: unknown }

export interface BootstrapPreloadedData {
  personas?: PersonaLike[];
  orgs?: OrgData[];
  markerThemes?: MarkerTheme[];
}

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
  preloadedData,
}: {
  open: boolean;
  currentUser: CurrentUserLike | null | undefined;
  currentProfile: Record<string, unknown> | null | undefined;
  t: (key: string, fallback?: string) => string;
  loadTags: () => void;
  setPersonas: (v: PersonaLike[]) => void;
  setOrgs: (v: OrgData[]) => void;
  setMarkerThemes: (v: MarkerTheme[]) => void;
  setShowPersonaSetupDialog: (v: boolean) => void;
  preloadedData?: BootstrapPreloadedData;
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

    // Fast path: apply any data the caller already has in memory, then only
    // fetch whatever is still missing. PublisherDashboard provides personas and
    // orgs; markerThemes are optional (fetched if not supplied).
    const preloadedPersonas = preloadedData?.personas;
    const preloadedOrgs = preloadedData?.orgs;
    const preloadedThemes = preloadedData?.markerThemes;

    if (Array.isArray(preloadedPersonas)) {
      setPersonas(preloadedPersonas);
      setShowPersonaSetupDialog(preloadedPersonas.length === 0);
    }
    if (Array.isArray(preloadedOrgs)) {
      setOrgs(preloadedOrgs);
    }
    if (Array.isArray(preloadedThemes)) {
      setMarkerThemes(preloadedThemes);
    }

    const needPersonas = !Array.isArray(preloadedPersonas);
    const needOrgs = !Array.isArray(preloadedOrgs);
    const needThemes = !Array.isArray(preloadedThemes);

    if (!needPersonas && !needOrgs && !needThemes) return;

    let cancelled = false;

    const loadBootstrapData = async () => {
      try {
        const ownerId = currentUser?.uid;
        const [pData, oData, tData] = await Promise.all([
          needPersonas ? getPersonas(ownerId) : Promise.resolve(null),
          needOrgs ? getOrganizations(ownerId) : Promise.resolve(null),
          needThemes ? fetchUserThemes(currentUser) : Promise.resolve(null),
        ]);

        const normalizedPersonas = needPersonas
          ? (pData || []).map((persona) => ({
              ...persona,
              organizationIds: normalizeOrgIds(persona?.organizationIds),
            }))
          : preloadedPersonas!;

        if (needOrgs || needPersonas) {
          let profile = currentProfile;
          if (!profile) {
            try {
              profile = await getUserProfile();
            } catch {
              profile = null;
            }
          }

          const dedupedOrgs = needOrgs
            ? await buildAffiliatedOrganizations({
                ownedOrgs: oData || [],
                profile,
                personas: normalizedPersonas,
                fetchOrganizationById: getOrganization,
              })
            : preloadedOrgs!;

          if (cancelled) return;

          if (needPersonas) {
            setPersonas(normalizedPersonas);
            setShowPersonaSetupDialog(Array.isArray(normalizedPersonas) && normalizedPersonas.length === 0);
          }
          if (needOrgs) setOrgs(dedupedOrgs);
        }

        if (needThemes) {
          if (cancelled) return;
          const userThemes = tData || [];
          const customThemes = userThemes.filter((theme) => !isDefaultLikeTheme(theme));
          setMarkerThemes([{ id: "default", name: t("scriptMetadataDialog.defaultTheme") }, ...customThemes] as MarkerTheme[]);
        }
      } catch (error) {
        console.error("Failed to bootstrap script metadata dialog", error);
      }
    };

    loadBootstrapData();

    return () => {
      cancelled = true;
    };
  // preloadedData deliberately omitted: bootstrap identity is determined once per open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile, currentUser, open, setMarkerThemes, setOrgs, setPersonas, setShowPersonaSetupDialog, t]);
}
