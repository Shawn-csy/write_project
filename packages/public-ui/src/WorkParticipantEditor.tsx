"use client";

import { PARTICIPATION_ROLE_LABELS as labels, type ParticipationRole } from "./participationRoles";
export type { ParticipationRole } from "./participationRoles";
export interface WorkParticipantInput {
  role: ParticipationRole;
  personaId?: string | null;
  creditedAs: string;
  sourceUrl?: string;
  sourceRole?: string;
}


export function WorkParticipantEditor({ value, onChange, identities, disabled = false }: {
  value: WorkParticipantInput[];
  onChange: (value: WorkParticipantInput[]) => void;
  identities?: Array<{ id: string; displayName?: string }>;
  disabled?: boolean;
}) {
  const update = (index: number, patch: Partial<WorkParticipantInput>) =>
    onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  const input = "w-full rounded-md border border-border bg-background px-2 py-2 text-sm";
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="mb-2 text-sm font-medium">參與者與職務</legend>
    <p className="text-xs text-muted-foreground">依作品署名填寫；同一人參與多個職務時可分別新增。</p>
    {value.map((item, index) => <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
      <label className="text-xs">職務 {index + 1}<select className={input} value={item.role} onChange={(event) => update(index, { role: event.target.value as ParticipationRole })}>
        {Object.entries(labels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
      </select></label>
      <label className="text-xs">作品署名 {index + 1}<input className={input} required maxLength={200} value={item.creditedAs} onChange={(event) => update(index, { creditedAs: event.target.value })} /></label>
      <label className="text-xs sm:col-span-2">署名來源連結 {index + 1}<input className={input} type="url" pattern="https://.*" placeholder="選填；未填時使用作品連結" value={item.sourceUrl || ""} onChange={(event) => update(index, { sourceUrl: event.target.value })} /></label>
      {identities && <label className="text-xs sm:col-span-2">連結身份 {index + 1}<select className={input} value={item.personaId || ""} onChange={(event) => update(index, { personaId: event.target.value || null })}>
        <option value="">待確認身份（保留署名）</option>
        {item.personaId && !identities.some((p) => p.id === item.personaId) && <option value={item.personaId}>已連結身份 {item.personaId}</option>}
        {identities.map((person) => <option key={person.id} value={person.id}>{person.displayName || "未命名"} · {person.id.slice(0, 8)}</option>)}
      </select>{!item.personaId && <span className="text-amber-700">尚未連結個人頁</span>}</label>}
      <button type="button" className="justify-self-start text-xs text-destructive" onClick={() => onChange(value.filter((_, i) => i !== index))}>移除參與者 {index + 1}</button>
    </div>)}
    <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" disabled={value.length >= 100} onClick={() => onChange([...value, { role: "scriptwriter", creditedAs: "", sourceUrl: "" }])}>新增參與職務</button>
  </fieldset>;
}
