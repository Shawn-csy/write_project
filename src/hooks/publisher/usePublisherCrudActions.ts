import { useState } from "react";
import { createOrganization, deleteOrganization, updateOrganization } from "../../lib/api/organizations";
import { createPersona, deletePersona, updatePersona } from "../../lib/api/personas";
import type { PersonaLike } from "../../types/persona";

interface PersonaDraft extends Partial<PersonaLike> {
  displayName: string;
  bio: string;
  website: string;
  links: Array<{ url?: string; label?: string }> | string;
  avatar: string;
  avatarCrop: { cx?: number; cy?: number; zoom?: number } | null;
  bannerUrl: string;
  bannerCrop: { cx?: number; cy?: number; zoom?: number } | null;
  organizationIds: string[];
  tags: string[];
  defaultLicenseCommercial: string;
  defaultLicenseDerivative: string;
  defaultLicenseNotify: string;
  defaultLicenseSpecialTerms: string[];
}

interface OrgDraft {
  id: string;
  name: string;
  description: string;
  website: string;
  logoUrl: string;
  logoCrop: { cx?: number; cy?: number; zoom?: number } | null;
  bannerUrl: string;
  bannerCrop: { cx?: number; cy?: number; zoom?: number } | null;
  tags: string[];
}

interface ToastLike {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface UsePublisherCrudActionsInput {
  selectedPersonaId: string | null;
  personaDraft: PersonaDraft;
  setSelectedPersonaId: (id: string | null) => void;
  setConfirmDeletePersonaOpen: (open: boolean) => void;
  orgDraft: OrgDraft;
  setSelectedOrgId: (id: string | null) => void;
  setConfirmDeleteOrgOpen: (open: boolean) => void;
  loadData: (silent?: boolean) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  toast: (options: ToastLike) => void;
}

export function usePublisherCrudActions({
  selectedPersonaId,
  personaDraft,
  setSelectedPersonaId,
  setConfirmDeletePersonaOpen,
  orgDraft,
  setSelectedOrgId,
  setConfirmDeleteOrgOpen,
  loadData,
  t,
  toast,
}: UsePublisherCrudActionsInput) {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const handleSaveProfile = async () => {
    if (!selectedPersonaId) return;
    setIsSavingProfile(true);
    try {
      await updatePersona(selectedPersonaId, personaDraft);
      await loadData(true);
      toast({ title: t("publisher.updatedPersona") });
    } catch (error) {
      console.error("Failed to update persona", error);
      toast({ title: t("publisher.updatePersonaFailed"), variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!orgDraft?.id) return;
    setIsSavingOrg(true);
    try {
      await updateOrganization(orgDraft.id, {
        name: orgDraft.name,
        description: orgDraft.description,
        website: orgDraft.website,
        logoUrl: orgDraft.logoUrl,
        logoCrop: orgDraft.logoCrop,
        bannerUrl: orgDraft.bannerUrl,
        bannerCrop: orgDraft.bannerCrop,
        tags: orgDraft.tags,
      });
      await loadData(true);
      toast({ title: t("publisher.updatedOrg") });
    } catch (error) {
      console.error("Failed to update org", error);
      toast({ title: t("publisher.updateOrgFailed"), variant: "destructive" });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!personaDraft.displayName.trim()) return;
    setIsCreatingPersona(true);
    try {
      const created = await createPersona(personaDraft);
      await loadData(true);
      setSelectedPersonaId(created?.id || null);
      toast({ title: t("publisher.createdPersona") });
    } catch (error) {
      console.error("Failed to create persona", error);
      toast({ title: t("publisher.createPersonaFailed"), variant: "destructive" });
    } finally {
      setIsCreatingPersona(false);
    }
  };

  const handleDeletePersona = async () => {
    if (!selectedPersonaId) return;
    try {
      await deletePersona(selectedPersonaId);
      await loadData(true);
      setConfirmDeletePersonaOpen(false);
      toast({ title: t("publisher.deletedPersona") });
    } catch (error) {
      console.error("Failed to delete persona", error);
      toast({ title: t("publisher.deletePersonaFailed"), variant: "destructive" });
    }
  };

  const handleCreateOrg = async () => {
    if (!orgDraft?.name?.trim()) return;
    setIsCreatingOrg(true);
    try {
      const created = await createOrganization({
        name: orgDraft.name,
        description: orgDraft.description,
        website: orgDraft.website,
        logoUrl: orgDraft.logoUrl,
        logoCrop: orgDraft.logoCrop,
        bannerUrl: orgDraft.bannerUrl,
        bannerCrop: orgDraft.bannerCrop,
        tags: orgDraft.tags,
      });
      await loadData(true);
      setSelectedOrgId(created?.id || null);
      toast({ title: t("publisher.createdOrg") });
    } catch (error) {
      console.error("Failed to create organization", error);
      toast({ title: t("publisher.createOrgFailed"), variant: "destructive" });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgDraft?.id) return;
    try {
      await deleteOrganization(orgDraft.id);
      await loadData(true);
      setConfirmDeleteOrgOpen(false);
      toast({ title: t("publisher.deletedOrg") });
    } catch (error) {
      console.error("Failed to delete organization", error);
      toast({ title: t("publisher.deleteOrgFailed"), variant: "destructive" });
    }
  };

  return {
    isSavingProfile,
    isSavingOrg,
    isCreatingPersona,
    isCreatingOrg,
    handleSaveProfile,
    handleSaveOrg,
    handleCreatePersona,
    handleDeletePersona,
    handleCreateOrg,
    handleDeleteOrg,
  };
}
