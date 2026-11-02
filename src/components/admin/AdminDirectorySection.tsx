import React from "react";
import { ArrowRightLeft, Building2, FileText, Loader2, Plus, Search, Trash2, UserCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SegmentedControl } from "../studio/SegmentedControl";
import { StatusPill } from "../studio/StatusPill";
import { useI18n } from "../../contexts/I18nContext";
import { getMediaCropStyle } from "../../lib/mediaCropRef";
import type { useAdminPageState } from "../../hooks/useAdminPageState";

type AdminState = ReturnType<typeof useAdminPageState>;
export type DirectoryKind = "voice-actors" | "scripts" | "orgs" | "personas" | "users";

/** Shared toolbar: filter input, optional extra control, reload and the "shown / total" count. */
export function AdminToolbar({
  value,
  onChange,
  placeholder,
  shown,
  total,
  children,
  trailing,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  shown: number;
  total: number;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 pl-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {children}
      <span className="text-xs tabular-nums text-muted-foreground sm:ml-auto">
        {t("adminConsole.showing").replace("{shown}", String(shown)).replace("{total}", String(total))}
      </span>
      {trailing}
    </div>
  );
}

export function AdminEmptyState({ loading }: { loading?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-40 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="loading" /> : t("adminConsole.empty")}
    </div>
  );
}

/** Table-like list surface: bordered container with divided rows. */
export function AdminRows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">{children}</ul>;
}

export function AdminRow({ icon, title, subtitle, badge, actions }: { icon: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; badge?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        {badge}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </li>
  );
}

function RowActions({ s, onTransfer, onDelete, onSettings, disableDelete }: { s: AdminState; onTransfer?: () => void; onDelete: () => void; onSettings?: () => void; disableDelete?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {onSettings ? (
        <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={onSettings}>{t("adminConsole.settings")}</Button>
      ) : null}
      {onTransfer ? (
        <Button variant="outline" size="sm" className="h-8" aria-label={t("adminConsole.transfer")} title={t("adminConsole.transfer")} onClick={onTransfer}>
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <Button variant="destructive" size="sm" className="h-8" aria-label={t("adminConsole.delete")} title={t("adminConsole.delete")} disabled={s.isDeleting || disableDelete} onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

export function AdminDirectorySection({ kind, s }: { kind: Exclude<DirectoryKind, "voice-actors">; s: AdminState }) {
  const { t } = useI18n();
  const owner = (id?: string) => `${t("adminConsole.owner")}: ${s.getOwnerLabel(id)}`;
  const reload = (
    <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => s.loadAllData(s.listQuery.trim())}>
      {s.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminConsole.reload")}
    </Button>
  );

  if (kind === "scripts") {
    const total = s.scripts.filter((sc) => sc.type !== "folder").length;
    return (
      <section>
        <AdminToolbar
          value={s.scriptFilter}
          onChange={s.setScriptFilter}
          placeholder={t("adminConsole.filterPlaceholder")}
          shown={s.filteredScripts.length}
          total={total}
          trailing={reload}
        >
          <SegmentedControl
            ariaLabel={t("adminConsole.tabs.scripts")}
            value={s.scriptStatusFilter as "all" | "Public" | "Private"}
            onChange={s.setScriptStatusFilter}
            options={[
              { value: "all", label: t("adminConsole.filterAll") },
              { value: "Public", label: t("adminConsole.filterPublic") },
              { value: "Private", label: t("adminConsole.filterPrivate") },
            ]}
          />
        </AdminToolbar>
        {s.isLoading || s.filteredScripts.length === 0 ? (
          <AdminEmptyState loading={s.isLoading} />
        ) : (
          <AdminRows>
            {s.filteredScripts.map((sc) => (
              <AdminRow
                key={sc.id}
                icon={<FileText className="h-4 w-4" />}
                title={sc.title || t("adminConsole.untitled")}
                subtitle={owner(sc.ownerId)}
                badge={sc.status === "Public" ? <StatusPill status="live">{t("transferAdmin.publicBadge")}</StatusPill> : undefined}
                actions={
                  <RowActions s={s} onSettings={() => s.handleOpenScriptSettings(sc)} onTransfer={() => s.handleOpenTransfer("script", sc)} onDelete={() => s.handleDeleteScript(sc)} />
                }
              />
            ))}
          </AdminRows>
        )}
      </section>
    );
  }

  if (kind === "orgs") {
    return (
      <section>
        <AdminToolbar value={s.orgFilter} onChange={s.setOrgFilter} placeholder={t("adminConsole.filterPlaceholder")} shown={s.filteredOrgs.length} total={s.orgs.length} trailing={reload}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (s.newOrgName) s.handleCreateOrg();
            }}
          >
            <Input
              className="h-9 w-full sm:w-48"
              aria-label={t("adminConsole.createOrgTitle")}
              placeholder={s.t("transferAdmin.orgNamePlaceholder")}
              value={s.newOrgName}
              onChange={(e) => s.setNewOrgName(e.target.value)}
            />
            <Button type="submit" size="sm" className="h-9 shrink-0" disabled={!s.newOrgName}>
              <Plus className="mr-1 h-4 w-4" />
              {s.t("transferAdmin.createOrg")}
            </Button>
          </form>
        </AdminToolbar>
        {s.isLoading || s.filteredOrgs.length === 0 ? (
          <AdminEmptyState loading={s.isLoading} />
        ) : (
          <AdminRows>
            {s.filteredOrgs.map((org) => (
              <AdminRow
                key={org.id}
                icon={<Building2 className="h-4 w-4" />}
                title={org.name}
                subtitle={owner(org.ownerId)}
                actions={<RowActions s={s} onTransfer={() => s.handleOpenTransfer("org", org)} onDelete={() => s.handleDeleteOrg(org)} />}
              />
            ))}
          </AdminRows>
        )}
      </section>
    );
  }

  if (kind === "personas") {
    return (
      <section>
        <AdminToolbar value={s.personaFilter} onChange={s.setPersonaFilter} placeholder={t("adminConsole.filterPlaceholder")} shown={s.filteredPersonas.length} total={s.authorPersonas.length} trailing={reload} />
        {s.isLoading || s.filteredPersonas.length === 0 ? (
          <AdminEmptyState loading={s.isLoading} />
        ) : (
          <AdminRows>
            {s.filteredPersonas.map((p) => {
              const crop = getMediaCropStyle(String(p.avatar || ""));
              return (
                <AdminRow
                  key={p.id}
                  icon={p.avatar ? <img src={crop.src} style={crop.style} alt={p.displayName || p.id} className="h-full w-full object-cover" /> : <UserCircle className="h-5 w-5" />}
                  title={p.displayName}
                  subtitle={owner(p.ownerId)}
                  actions={<RowActions s={s} onTransfer={() => s.handleOpenTransfer("persona", p)} onDelete={() => s.handleDeletePersona(p)} />}
                />
              );
            })}
          </AdminRows>
        )}
      </section>
    );
  }

  return (
    <section>
      <AdminToolbar value={s.userFilter} onChange={s.setUserFilter} placeholder={t("adminConsole.userFilterPlaceholder")} shown={s.filteredUsers.length} total={s.users.length} trailing={reload} />
      {s.isLoading || s.filteredUsers.length === 0 ? (
        <AdminEmptyState loading={s.isLoading} />
      ) : (
        <AdminRows>
          {s.filteredUsers.map((u) => (
            <AdminRow
              key={u.id}
              icon={<UserCircle className="h-5 w-5" />}
              title={u.displayName || u.handle || "-"}
              subtitle={`${u.email || "-"} | ${u.id}`}
              actions={<RowActions s={s} onDelete={() => s.handleDeleteUser(u)} disableDelete={u.id === s.currentUser?.uid} />}
            />
          ))}
        </AdminRows>
      )}
    </section>
  );
}
