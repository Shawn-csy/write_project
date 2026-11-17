/** Roles describe work performed, not whether an identity is a person or studio.
 * recording_studio remains the persisted key for compatibility; its role is recording.
 */
export const PARTICIPATION_ROLE_LABELS = {
  scriptwriter: "台本師", voice_actor: "聲演", post_production: "後製", cover_art: "封面", recording_studio: "錄音",
} as const;
export type ParticipationRole = keyof typeof PARTICIPATION_ROLE_LABELS;
