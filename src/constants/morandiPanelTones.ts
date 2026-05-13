const buildToneVars = (toneKey) => ({
  "--morandi-tone-trigger-bg": `var(--morandi-tone-${toneKey}-trigger-bg)`,
  "--morandi-tone-trigger-fg": `var(--morandi-tone-${toneKey}-trigger-fg)`,
  "--morandi-tone-helper-border": `var(--morandi-tone-${toneKey}-helper-border)`,
  "--morandi-tone-helper-bg": `var(--morandi-tone-${toneKey}-helper-bg)`,
  "--morandi-tone-helper-fg": `var(--morandi-tone-${toneKey}-helper-fg)`,
  "--morandi-tone-panel-border": `var(--morandi-tone-${toneKey}-panel-border)`,
  "--morandi-tone-panel-bg": `var(--morandi-tone-${toneKey}-panel-bg)`,
});

export const MORANDI_STUDIO_TONE_VARS = {
  works: buildToneVars("works"),
  profile: buildToneVars("profile"),
  org: buildToneVars("org"),
  series: buildToneVars("series"),
};

export const SETTINGS_TAB_MORANDI_TONE = {
  display: "works",
  transfer: "series",
  media: "org",
  markers: "profile",
  profile: "profile",
};
