# New homepage color and hierarchy review

Local preview revision, 2026-11-17. Applies only to the modern homepage; no deployment.

The original blue-gray palette already meets WCAG AA for the core text pairs measured below. Its repeated gray section strips, borders, inactive tabs and toolbars flatten the hierarchy. Both revised themes use neutral structural colors, clear reading contrast and blue links. The final light revision removes the earlier warm-paper/teal direction in favor of the actual reading-site patterns below.

## Comparable-site evidence and light direction

- [Kakuyomu](https://kakuyomu.jp/): research inspection found white page backgrounds, `#222` text, `#666` secondary text and `#0081c2` links.
- [Shōsetsuka ni Narō](https://syosetu.com/): research inspection found `#f1f3f5` page backgrounds, white panels, `#333` text and `#1b8ef3` links.

These are measured reference-site colors, not proposed Open Scripts tokens. The Open Scripts light proposal uses approximately `#f0f1f2` page, `#f7f7f7` header/cards/banner surfaces, `#3d3d3d` primary text, `#666` secondary text, `#ddd` borders and `#444` selected controls/main action with `#f7f7f7` foreground. These softer endpoints reduce glare while preserving the reference sites’ reading hierarchy. Blue links use approximately `#006da3`, a darker variant of the reading-site blue that exceeds 4.5:1 on both softened cards and the selected-filter tint. Color is concentrated in links/focus rather than structural bands.

The topbar's former inline white-text mapping is overridden only inside the modern homepage using a light/dark `--band-foreground` role. The dark header and text-only hero title also use softened `#ddd` instead of hard white. Text-only banner tiles and the brand slide receive readable light foregrounds; artwork retains its own colors and white overlay text. Light/dark accent foregrounds match their filled accent surfaces.

## Comparable-site evidence and dark direction

The dark revision follows actual audio/creator-site color roles, rather than extending the light theme's teal across every dark surface:

- [SoundCloud production CSS](https://a-v2.sndcdn.com/assets/css/app-3c7028cb7e0129e2a78f.css): research inspection found `.theme-dark` page `#121212`, highlighted surface `#303030`, white primary text, `#999` secondary text, `#699fff` links, and white primary-action backgrounds with black text.
- [itch.io production CSS](https://static.itch.io/main.css?1794904860): research inspection found dark backgrounds `#111` / `#1b1b1b`, primary text `#eee`, secondary text `#ababab` and accent `#ff2449`. Its [homepage design article](https://itch.io/updates/a-new-homepage-for-2018) supplies creator-store context; the hex measurements above come from CSS, not that article.

Those are observed source values, not a claim that either site uses those colors in every context. The Open Scripts proposal combines their neutral surface hierarchy: `#212121` canvas, `#292929` header/brand panel/recommendation/menu surfaces, approximately `#323232` hover surfaces, quiet `#454545` borders, `#ddd` primary text, `#b2b2b2` secondary text, `#c9c9c9` selected actions with `#252525` text, and approximately `#699fff` links. It deliberately does not adopt itch.io's saturated pink brand accent. These proposed Open Scripts assignments are implementation decisions informed by the measured references.

The previous dark preview's blue/teal cast has been removed from every modern dark structural token, including `--band`, which the topbar remaps into its own local background. Ordinary work cards remain unboxed; white page thumbnails retain their original artwork, so those images can still appear bright against the softened chrome. Only compact recommendation cards receive a modest 10px radius and subtle shadow.

## Hierarchy and interaction

- Section names sit on the page with a thin divider instead of filled gray bars.
- Inactive category tabs are quiet; selected tabs retain a filled shape and bold type in addition to color. Dark selected controls are soft light gray with dark text; light controls are mid charcoal with off-white text.
- Search has a clear boundary and visible focus treatment, 40px desktop height and 44px narrow-screen/coarse-pointer height. Search is neutral at rest and blue on focus in both themes.
- Toolbar buttons/selects reach 44px on narrow screens/coarse pointers. Recommendation arrows are 40px on desktop and 44px on narrow screens. Banner pagination has been removed to reduce strip height; arrows, touch scrolling, autoplay and pause behavior remain.
- Display mode is a single current-mode button (標準/密集), with the next action named in its accessible label and tooltip; it uses the existing persisted state in both expanded and sticky toolbars.
- Applied filters use a tinted/raised state to distinguish current conditions from available filters.
- Recommendation copy uses the public caption scale instead of fixed 10/11px, with 144px cards to leave space for two-line text and Demo metadata. The modern default caption is 13px; explicit compact/comfortable/large preferences remain available.

## Measured contrast

WCAG relative luminance formula, solid semantic token pairs; values rounded to two decimals. “Before” means the original palette, not the rejected intermediate dark preview. Opacity blends, cover images, user-created cover text and every possible runtime component combination are outside this token-level measurement. This is not a claim of complete WCAG conformance.

| Text / surface | Light before | Light after | Dark before | Dark after |
| --- | ---: | ---: | ---: | ---: |
| Body / page | 12.08 | 9.61 | 11.65 | 11.86 |
| Secondary / card | 6.39 | 5.36 | 5.74 | 6.86 |
| Link / card | 7.72 | 5.28 | 7.09 | 5.54 |
| Selected text / primary | 6.00 | 9.09 | 7.23 | 9.26 |
| CTA text / CTA | 5.45 | 9.09 | 5.08 | 9.26 |
| Link / selected tint | 6.26 | 4.84 | 5.75 | 5.03 |

CTA text is white in the original palettes, off-white in revised light mode, and dark ink in revised dark mode. All measured text pairs exceed 4.5:1. WCAG's minimum for normal text is 4.5:1, and for large text 3:1. A card/page luminance difference is a visual hierarchy choice, not by itself a text-contrast failure. Decorative section dividers do not automatically require 3:1.

Standards references: [W3C contrast minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [Material color roles](https://m3.material.io/styles/color/the-color-system/).

## Isolation and verification

`app/homepage.css` provides the shared public palette on the root HTML element, including panels rendered through portals. The `.modern-homepage` wrapper scopes gallery-specific visual treatments.

Public and main TypeScript checks pass, along with 35 focused tests across six mode-toggle, layout, mobile-sheet, version-switch and banner behavior test files after the pagination/toggle refinement. Earlier palette verification also passed 54 tests across eight files. Browser acceptance covers both themes and mobile/desktop separately.
