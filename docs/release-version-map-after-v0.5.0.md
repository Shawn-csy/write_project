# Release Version Map After v0.5.0

Status: draft inventory only. No git tags have been created.

Base tag: `v0.5.0`
Head reviewed: `5f5433be Remove remaining public legacy fallbacks`

## Suggested Release Lanes

| Suggested version | Commit range | Release type | Summary |
| --- | --- | --- | --- |
| `0.5.1` | `70d7d237..96b3f7d3` | Patch | Settings/theme fixes, policy pages, SEO metadata fixes, tag attach fix. |
| `0.5.2` | `6a357b06..57ae0a5b` | Minor candidate | Publisher studio loading/covers, deploy image rollback, cover designer resize, export metadata selection. |
| `0.6.0` | `874f9387..4101da53` | Minor | Next.js public frontend scaffold, SSR public read/author/org/series/gallery pages, shared script engine, public reader parity. |
| `0.6.1` | `8f7debc6..47b41a37` | Patch/minor | Public standalone deployment fixes, shared public UI, gallery architecture, homepage banner API. |
| `0.7.0` | `eeb77e91..72a72018` | Minor with migration impact | Retire Vite public surface, unify public navigation, add public series aggregation and publisher series editor workflows. |
| `0.7.1` | `a3009640..4a4cd28e` | Patch/minor | Public SEO/read page model, canonical series chapter navigation, public reader PDF export. |
| `0.8.0` | `93cc083d..9f0a953d` | Minor | Shared reader-export metadata depth and marker-based reader presentation. |
| `0.8.1` | `1e4aa954..1bea52ca` | Patch/minor | Public SEO alignment, gallery UX refinements, appearance preferences/layout. |
| `0.9.0` | `990f1442..5f5433be` | Minor with compatibility removal | Remove public backward compatibility routes, remove legacy metadata runtime support, remove User-to-Persona fallback. |

## Commit Classification

| Commit | Suggested version | Type | Notes |
| --- | --- | --- | --- |
| `70d7d237` | `0.5.1` | fix | Theme-scoped column mode and settings tests. |
| `d998dc98` | `0.5.1` | feat | Privacy and terms pages. |
| `5c28f8d1` | `0.5.1` | feat | Gallery footer links for privacy/terms. |
| `410ecc54` | `0.5.1` | chore | SEO metadata and verification links. |
| `1a65d832` | `0.5.1` | chore | Public title and static verification footer. |
| `c5152c4d` | `0.5.1` | fix | Tag attach 500 and public preface display. |
| `bcba7d38` | `0.5.1` | fix | Preserve active editor theme. |
| `96b3f7d3` | `0.5.1` | fix | Absolute SEO image URLs. |
| `b9208cf1` | `0.5.1` | merge | Merge commit, no separate release note. |
| `6a357b06` | `0.5.2` | feat | Publisher studio covers/loading improvements. |
| `83c11035` | `0.5.2` | fix | Public series lookup via structured series fields. |
| `83e7405e` | `0.5.2` | feat | Docker image versioning and rollback mechanism. |
| `0f7f1351` | `0.5.2` | feat | Figma-style cover designer resize handles. |
| `e46442c0` | `0.5.2` | merge | Merge commit, no separate release note. |
| `4a42da2c` | `0.5.2` | perf/feat | Publisher studio loading optimization. |
| `932af37e` | `0.5.2` | merge | Merge commit, no separate release note. |
| `bed9cab1` | `0.5.2` | i18n | Footer privacy/terms translations. |
| `57ae0a5b` | `0.5.2` | feat | Export metadata selection dialog. |
| `874f9387` | `0.6.0` | feat | Next.js 16 public frontend scaffold. |
| `6033a2bf` | `0.6.0` | feat | SSR `/read/[id]` with ISR and revalidation. |
| `9c05fdfc` | `0.6.0` | fix | Next public read deployment. |
| `73473c3d` | `0.6.0` | feat | SSR author/org/series pages. |
| `50af9f80` | `0.6.0` | feat | Static public privacy/terms/about pages. |
| `cf9783a3` | `0.6.0` | feat | SSR homepage gallery tabs. |
| `029f4cd9` | `0.6.0` | fix | Rollback safety, cache invalidation, nginx routing. |
| `40b1e6a8` | `0.6.0` | fix | Guard metadataBase build env. |
| `3c647a5a` | `0.6.0` | feat | Shared script engine integration for public pages. |
| `39afdce1` | `0.6.0` | refactor | Script engine package contract. |
| `07d3b59e` | `0.6.0` | refactor | Converge render callers on script engine. |
| `dd45a5cf` | `0.6.0` | feat | Shared script render model. |
| `a39f43f4` | `0.6.0` | feat | Public reader via render model. |
| `3f7ebd23` | `0.6.0` | feat | Vite render block adapter. |
| `7b509ced` | `0.6.0` | refactor | Import preview uses render model. |
| `863c12b9` | `0.6.0` | refactor | Import examples use render model. |
| `d54ba9ee` | `0.6.0` | refactor | Simplified viewer pipeline. |
| `c801a14a` | `0.6.0` | feat | Shared marker theme tokens. |
| `37e83630` | `0.6.0` | feat | Next public reader marker blocks. |
| `214bc1a6` | `0.6.0` | feat | Shared script reader renderer package. |
| `cd73eeba` | `0.6.0` | feat | Shared reader UI controls. |
| `b5cd613f` | `0.6.0` | feat | Shared public reader toolbar controls. |
| `256a91bb` | `0.6.0` | refactor | Centralized reader state model. |
| `fff32e23` | `0.6.0` | feat | Public reader parity features. |
| `4101da53` | `0.6.0` | release-readiness | Public reader replacement readiness. |
| `8f7debc6` | `0.6.1` | fix | Public standalone runtime deployment. |
| `d2069290` | `0.6.1` | refactor/feat | Shared public UI across Vite and Next. |
| `149037d3` | `0.6.1` | refactor/feat | Public gallery architecture. |
| `ba1c8ad8` | `0.6.1` | fix | Restore hero banner and gallery spacing. |
| `c750839c` | `0.6.1` | fix | Tailwind package content scan. |
| `365dfb37` | `0.6.1` | docs | Public homepage architecture. |
| `88eeaeb7` | `0.6.1` | feat | Public gallery URL state model. |
| `27b9d151` | `0.6.1` | chore | Remove production banner placeholders. |
| `d49bd266` | `0.6.1` | refactor | Public homepage model and topbar. |
| `1c3c8d7c` | `0.6.1` | docs/feat | Public discovery navigation policy. |
| `3f67822c` | `0.6.1` | fix | Public gallery people loading. |
| `46d62fa2` | `0.6.1` | docs | Frontend runtime boundary spec. |
| `3216f3d9` | `0.6.1` | fix | Public card overlay click behavior. |
| `47b41a37` | `0.6.1` | feat | Homepage banner in public bundle. |
| `527fdca3` | `0.6.1` | docs | Vite public surface audit. |
| `eeb77e91` | `0.7.0` | migration | Retire Vite public gallery surface. |
| `55933849` | `0.7.0` | docs | Public route QA. |
| `2eb38dbc` | `0.7.0` | fix | Public topbar view links. |
| `0c16a755` | `0.7.0` | feat | Public author and org discovery. |
| `93e92e06` | `0.7.0` | fix | Topbar stacking and nav unification. |
| `c5ec540f` | `0.7.0` | fix | Public navigation through `openPublicPath`. |
| `00bfefd5` | `0.7.0` | fix | Remaining public navigation calls. |
| `476d14de` | `0.7.0` | refactor | Publisher works navigation contract. |
| `18465459` | `0.7.0` | feat | Radix menu for public shell actions. |
| `b71ca1e2` | `0.7.0` | refine | Public gallery shell and filters. |
| `3f213ab8` | `0.7.0` | refine | Public shell theme selector. |
| `3be91617` | `0.7.0` | refine | Gallery card policy and filters. |
| `1c0f264b` | `0.7.0` | docs | Public series aggregation plan. |
| `21bceef3` | `0.7.0` | feat | Public series aggregation model. |
| `bd036f48` | `0.7.0` | feat | Series aggregation across gallery and reader. |
| `60afe4e7` | `0.7.0` | feat | Public series reading progress. |
| `0da049c2` | `0.7.0` | feat | Publisher series editing model. |
| `de33778d` | `0.7.0` | refactor | Publisher series editor UI decomposition. |
| `58591975` | `0.7.0` | refactor | Publisher series editor state. |
| `a17440f8` | `0.7.0` | docs | Series batch reorder plan. |
| `72d4fe14` | `0.7.0` | feat | Series batch reorder endpoint. |
| `f06e0ae4` | `0.7.0` | feat | Series chapter move controls. |
| `4fd67459` | `0.7.0` | feat | Publisher series editor panels. |
| `804471be` | `0.7.0` | fix | Protect unsaved series drafts. |
| `41e2f372` | `0.7.0` | feat | Publisher series drag reorder. |
| `070c7123` | `0.7.0` | refactor | Series attach dialog extraction. |
| `0110747e` | `0.7.0` | feat | Publisher series create workspace. |
| `31a79ba1` | `0.7.0` | refactor | Script metadata series section. |
| `9f100212` | `0.7.0` | refactor | Series page public entity design. |
| `72a72018` | `0.7.0` | migration | Remove retired Vite public routes. |
| `a3009640` | `0.7.1` | docs | Archive completed planning docs. |
| `5b0ea230` | `0.7.1` | feat | Public SEO metadata/crawler visibility. |
| `8ce08478` | `0.7.1` | refine | Public reader series UI. |
| `10c2c0e8` | `0.7.1` | refactor | Read page SEO model. |
| `171bae93` | `0.7.1` | feat | Read work header model. |
| `35ea12a3` | `0.7.1` | feat | Canonical series chapter navigation. |
| `4a4cd28e` | `0.7.1` | feat | Public reader PDF export pipeline. |
| `93cc083d` | `0.8.0` | fix | Light theme PDF/print export. |
| `72ccdd2d` | `0.8.0` | feat | Shared export metadata depth. |
| `fde9b1e8` | `0.8.0` | fix | Complete metadata depth. |
| `e5bed528` | `0.8.0` | fix | Metadata depth follow-ups. |
| `a34d1cda` | `0.8.0` | fix | Legacy event demo link fallback in export. |
| `a40ee5ae` | `0.8.0` | test | Event demo link metadata coverage. |
| `0e89daf2` | `0.8.0` | fix | PDF metadata projection alignment. |
| `9f0a953d` | `0.8.0` | feat | Marker-based reader presentation. |
| `1e4aa954` | `0.8.1` | feat/refactor | Public SEO and reader metadata projection alignment. |
| `3a1ab9bc` | `0.8.1` | refine | Public homepage and reader ergonomics. |
| `3c843b3c` | `0.8.1` | refine | Public gallery filters and hero readability. |
| `c8a99892` | `0.8.1` | feat | Reader toolbar title slot. |
| `3e82752b` | `0.8.1` | feat | Gallery card summaries and outline previews. |
| `390e7c6e` | `0.8.1` | refine | Gallery card hover previews. |
| `25bb44d9` | `0.8.1` | fix | Gallery view mode toggle. |
| `10ef1156` | `0.8.1` | feat | Public shell actions and appearance preferences. |
| `cc478183` | `0.8.1` | feat | Shared appearance preferences with reader. |
| `a171c84b` | `0.8.1` | refine | Appearance and reader toolbar boundaries. |
| `fda40871` | `0.8.1` | feat | Public homepage appearance scale model. |
| `4e3ddf3d` | `0.8.1` | refine | Typography tokens for gallery cards. |
| `1bea52ca` | `0.8.1` | refine | Homepage appearance and sidebar layout. |
| `990f1442` | `0.9.0` | compatibility-removal | Remove public backward compatibility routes. |
| `2a220af2` | `0.9.0` | compatibility-removal | Remove public legacy metadata runtime support. |
| `5f5433be` | `0.9.0` | compatibility-removal | Remove remaining public legacy fallbacks. |

## Notes

- This is a planning map, not an applied release history.
- Merge commits are included for completeness but should usually not receive standalone release notes.
- `0.9.0` is marked as minor with compatibility removal because this project appears to use `0.x` semver. If treating compatibility removals more strictly, this lane can be promoted to `1.0.0`.
