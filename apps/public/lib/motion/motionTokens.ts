/**
 * Motion tokens — single source of truth for durations, easing, scale.
 * Components must not invent ad hoc timing values.
 */
export const PUBLIC_MOTION = {
  duration: {
    press: 120,
    settle: 220,
    panel: 260,
    success: 480,
  },
  scale: {
    press: 0.96,
    pop: 1.03,
  },
  easing: {
    settle: "cubicBezier(0.22, 1, 0.36, 1)",
    press: "cubicBezier(0.4, 0, 0.2, 1)",
    pop: "spring(1, 80, 10, 0)",
  },
} as const;
