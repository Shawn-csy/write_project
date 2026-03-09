# Color Token Guide

## Purpose
This project uses semantic color tokens so light/dark themes stay consistent and maintainable.

## Source Of Truth
1. `src/index.css`: defines CSS variables in `:root` and `.dark`.
2. `tailwind.config.js`: maps semantic Tailwind color names to CSS variables.

## Core Semantic Tokens
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--muted`, `--muted-foreground`
- `--border`
- `--primary`, `--primary-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`

Domain tokens (feature-level):
- `--license-filter-*`
- `--license-selected-*`
- `--license-term-*`
- `--morandi-tone-*`
- `--marker-color-*`

## Required Usage Rules
1. Prefer semantic Tailwind classes first:
   - `bg-primary`, `text-primary`, `border-primary`
   - `bg-muted`, `text-muted-foreground`
   - `bg-destructive`, `text-destructive-foreground`
2. For custom CSS variable tokens in arbitrary values, always use explicit color type:
   - Good: `text-[color:var(--license-term-fg)]`
   - Good: `bg-[color:var(--license-filter-bg)]`
   - Good: `border-[color:var(--license-filter-border)]`
   - Avoid: `text-[var(--...)]`, `bg-[var(--...)]`, `border-[var(--...)]`
3. If color comes from runtime data (`#hex`, `rgb()`, `hsl()`, `var(...)`), use inline style:
   - `style={{ backgroundColor: value }}`
4. Do not introduce hardcoded palette classes for product UI states:
   - Avoid `text-amber-700`, `bg-emerald-50`, `border-blue-300`, etc.
   - Use semantic tokens instead.

## Light/Dark Requirements
Every newly added token must be defined in both:
- `:root` (light mode)
- `.dark` (dark mode)

If a token is missing in either side, UI may appear black/white or lose contrast.

## Migration Checklist
1. Add token in `src/index.css` (`:root` + `.dark`).
2. If used as semantic class (`bg-primary` etc.), map in `tailwind.config.js`.
3. Replace any old usage:
   - `text-[var(--x)]` -> `text-[color:var(--x)]`
   - `bg-[var(--x)]` -> `bg-[color:var(--x)]`
   - `border-[var(--x)]` -> `border-[color:var(--x)]`
4. Verify:
   - `npm test`
   - `npm run build`
   - Manual check in light/dark mode for key pages (`/dashboard`, `/studio`, `/`).
