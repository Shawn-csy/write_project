# Release Version Map After v0.5.0

Status: draft inventory only. No git tags have been created.

Base tag: `v0.5.0`
Head reviewed: `d6047028 Sync brand hero copy`

## Suggested Release Lanes

| Suggested version | Commit range | Release type | Summary |
| --- | --- | --- | --- |
| `0.5.1` | `70d7d237..96b3f7d3` | Patch | Settings/theme fixes, policy pages, SEO metadata fixes, tag attach fix. |
| `0.5.2` | `6a357b06..57ae0a5b` | Patch | Publisher studio loading/covers, deploy image rollback, cover designer resize, export metadata selection. |
| `0.5.3` | `874f9387..4101da53` | Patch | Next.js public frontend scaffold, SSR public read/author/org/series/gallery pages, shared script engine, public reader parity. |
| `0.5.4` | `8f7debc6..47b41a37` | Patch | Public standalone deployment fixes, shared public UI, gallery architecture, homepage banner API. |
| `0.5.5` | `eeb77e91..72a72018` | Patch | Retire Vite public gallery surface, unify public navigation, public series aggregation, publisher series editor workflows. |
| `0.5.6` | `a3009640..4a4cd28e` | Patch | Public SEO/read page model, canonical series chapter navigation, public reader PDF export. |
| `0.5.7` | `93cc083d..9f0a953d` | Patch | Shared reader-export metadata depth, marker-based reader presentation. |
| `0.5.8` | `1e4aa954..1bea52ca` | Patch | Public SEO alignment, gallery UX refinements, appearance preferences/layout. |
| `0.5.9` | `990f1442..5f5433be` | Patch | Remove public backward compatibility routes, legacy metadata runtime support, User-to-Persona fallback. |
| `0.5.10` | `8aef0f04..23e191ed` | Patch | Editorial redesign for gallery and read page, workspace login entry, Next-native public primitives. |
| `0.5.11` | `c190e239..4e1a5f06` | Patch | Public media presets, focal-point editor, hero art direction pipeline, image URL hardening. |
| `0.6.0` | `1e3e9b55..d6047028` | Minor | Hero placement, motion system, SEO completion, perf hardening, info pages, security, mobile shell. |

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
| `874f9387` | `0.5.3` | feat | Next.js 16 public frontend scaffold. |
| `6033a2bf` | `0.5.3` | feat | SSR `/read/[id]` with ISR and revalidation. |
| `9c05fdfc` | `0.5.3` | fix | Next public read deployment. |
| `73473c3d` | `0.5.3` | feat | SSR author/org/series pages. |
| `50af9f80` | `0.5.3` | feat | Static public privacy/terms/about pages. |
| `cf9783a3` | `0.5.3` | feat | SSR homepage gallery tabs. |
| `029f4cd9` | `0.5.3` | fix | Rollback safety, cache invalidation, nginx routing. |
| `40b1e6a8` | `0.5.3` | fix | Guard metadataBase build env. |
| `3c647a5a` | `0.5.3` | feat | Shared script engine integration for public pages. |
| `39afdce1` | `0.5.3` | refactor | Script engine package contract. |
| `07d3b59e` | `0.5.3` | refactor | Converge render callers on script engine. |
| `dd45a5cf` | `0.5.3` | feat | Shared script render model. |
| `a39f43f4` | `0.5.3` | feat | Public reader via render model. |
| `3f7ebd23` | `0.5.3` | feat | Vite render block adapter. |
| `7b509ced` | `0.5.3` | refactor | Import preview uses render model. |
| `863c12b9` | `0.5.3` | refactor | Import examples use render model. |
| `d54ba9ee` | `0.5.3` | refactor | Simplified viewer pipeline. |
| `c801a14a` | `0.5.3` | feat | Shared marker theme tokens. |
| `37e83630` | `0.5.3` | feat | Next public reader marker blocks. |
| `214bc1a6` | `0.5.3` | feat | Shared script reader renderer package. |
| `cd73eeba` | `0.5.3` | feat | Shared reader UI controls. |
| `b5cd613f` | `0.5.3` | feat | Shared public reader toolbar controls. |
| `256a91bb` | `0.5.3` | refactor | Centralized reader state model. |
| `fff32e23` | `0.5.3` | feat | Public reader parity features. |
| `4101da53` | `0.5.3` | release-readiness | Public reader replacement readiness. |
| `8f7debc6` | `0.5.4` | fix | Public standalone runtime deployment. |
| `d2069290` | `0.5.4` | refactor/feat | Shared public UI across Vite and Next. |
| `149037d3` | `0.5.4` | refactor/feat | Public gallery architecture. |
| `ba1c8ad8` | `0.5.4` | fix | Restore hero banner and gallery spacing. |
| `c750839c` | `0.5.4` | fix | Tailwind package content scan. |
| `365dfb37` | `0.5.4` | docs | Public homepage architecture. |
| `88eeaeb7` | `0.5.4` | feat | Public gallery URL state model. |
| `27b9d151` | `0.5.4` | chore | Remove production banner placeholders. |
| `d49bd266` | `0.5.4` | refactor | Public homepage model and topbar. |
| `1c3c8d7c` | `0.5.4` | docs/feat | Public discovery navigation policy. |
| `3f67822c` | `0.5.4` | fix | Public gallery people loading. |
| `46d62fa2` | `0.5.4` | docs | Frontend runtime boundary spec. |
| `3216f3d9` | `0.5.4` | fix | Public card overlay click behavior. |
| `47b41a37` | `0.5.4` | feat | Homepage banner in public bundle. |
| `527fdca3` | `0.5.4` | docs | Vite public surface audit. |
| `eeb77e91` | `0.5.5` | migration | Retire Vite public gallery surface. |
| `55933849` | `0.5.5` | docs | Public route QA. |
| `2eb38dbc` | `0.5.5` | fix | Public topbar view links. |
| `0c16a755` | `0.5.5` | feat | Public author and org discovery. |
| `93e92e06` | `0.5.5` | fix | Topbar stacking and nav unification. |
| `c5ec540f` | `0.5.5` | fix | Public navigation through `openPublicPath`. |
| `00bfefd5` | `0.5.5` | fix | Remaining public navigation calls. |
| `476d14de` | `0.5.5` | refactor | Publisher works navigation contract. |
| `18465459` | `0.5.5` | feat | Radix menu for public shell actions. |
| `b71ca1e2` | `0.5.5` | refine | Public gallery shell and filters. |
| `3f213ab8` | `0.5.5` | refine | Public shell theme selector. |
| `3be91617` | `0.5.5` | refine | Gallery card policy and filters. |
| `1c0f264b` | `0.5.5` | docs | Public series aggregation plan. |
| `21bceef3` | `0.5.5` | feat | Public series aggregation model. |
| `bd036f48` | `0.5.5` | feat | Series aggregation across gallery and reader. |
| `60afe4e7` | `0.5.5` | feat | Public series reading progress. |
| `0da049c2` | `0.5.5` | feat | Publisher series editing model. |
| `de33778d` | `0.5.5` | refactor | Publisher series editor UI decomposition. |
| `58591975` | `0.5.5` | refactor | Publisher series editor state. |
| `a17440f8` | `0.5.5` | docs | Series batch reorder plan. |
| `72d4fe14` | `0.5.5` | feat | Series batch reorder endpoint. |
| `f06e0ae4` | `0.5.5` | feat | Series chapter move controls. |
| `4fd67459` | `0.5.5` | feat | Publisher series editor panels. |
| `804471be` | `0.5.5` | fix | Protect unsaved series drafts. |
| `41e2f372` | `0.5.5` | feat | Publisher series drag reorder. |
| `070c7123` | `0.5.5` | refactor | Series attach dialog extraction. |
| `0110747e` | `0.5.5` | feat | Publisher series create workspace. |
| `31a79ba1` | `0.5.5` | refactor | Script metadata series section. |
| `9f100212` | `0.5.5` | refactor | Series page public entity design. |
| `72a72018` | `0.5.5` | migration | Remove retired Vite public routes. |
| `a3009640` | `0.5.6` | docs | Archive completed planning docs. |
| `5b0ea230` | `0.5.6` | feat | Public SEO metadata/crawler visibility. |
| `8ce08478` | `0.5.6` | refine | Public reader series UI. |
| `10c2c0e8` | `0.5.6` | refactor | Read page SEO model. |
| `171bae93` | `0.5.6` | feat | Read work header model. |
| `35ea12a3` | `0.5.6` | feat | Canonical series chapter navigation. |
| `4a4cd28e` | `0.5.6` | feat | Public reader PDF export pipeline. |
| `93cc083d` | `0.5.7` | fix | Light theme PDF/print export. |
| `72ccdd2d` | `0.5.7` | feat | Shared export metadata depth. |
| `fde9b1e8` | `0.5.7` | fix | Complete metadata depth. |
| `e5bed528` | `0.5.7` | fix | Metadata depth follow-ups. |
| `a34d1cda` | `0.5.7` | fix | Legacy event demo link fallback in export. |
| `a40ee5ae` | `0.5.7` | test | Event demo link metadata coverage. |
| `0e89daf2` | `0.5.7` | fix | PDF metadata projection alignment. |
| `9f0a953d` | `0.5.7` | feat | Marker-based reader presentation. |
| `1e4aa954` | `0.5.8` | feat/refactor | Public SEO and reader metadata projection alignment. |
| `3a1ab9bc` | `0.5.8` | refine | Public homepage and reader ergonomics. |
| `3c843b3c` | `0.5.8` | refine | Public gallery filters and hero readability. |
| `c8a99892` | `0.5.8` | feat | Reader toolbar title slot. |
| `3e82752b` | `0.5.8` | feat | Gallery card summaries and outline previews. |
| `390e7c6e` | `0.5.8` | refine | Gallery card hover previews. |
| `25bb44d9` | `0.5.8` | fix | Gallery view mode toggle. |
| `10ef1156` | `0.5.8` | feat | Public shell actions and appearance preferences. |
| `cc478183` | `0.5.8` | feat | Shared appearance preferences with reader. |
| `a171c84b` | `0.5.8` | refine | Appearance and reader toolbar boundaries. |
| `fda40871` | `0.5.8` | feat | Public homepage appearance scale model. |
| `4e3ddf3d` | `0.5.8` | refine | Typography tokens for gallery cards. |
| `1bea52ca` | `0.5.8` | refine | Homepage appearance and sidebar layout. |
| `990f1442` | `0.5.9` | compatibility-removal | Remove public backward compatibility routes. |
| `2a220af2` | `0.5.9` | compatibility-removal | Remove public legacy metadata runtime support. |
| `5f5433be` | `0.5.9` | compatibility-removal | Remove remaining public legacy fallbacks. |
| `8aef0f04` | `0.5.10` | refactor | Extract useMarkerTooltip hook; restore tooltip in presentation renderer. |
| `cc80d992` | `0.5.10` | fix | Remove audience/rating tag sync; use canonical DB fields. |
| `525bbe50` | `0.5.10` | feat | Gallery homepage dynamic visual effects. |
| `690fe107` | `0.5.10` | feat | Gallery UI editorial design language. |
| `bb9695e9` | `0.5.10` | feat | Extend editorial design language to read page. |
| `d17acc8d` | `0.5.10` | feat | Hero reveal, sliding tab indicator, sidebar collapse fix. |
| `444eb3ea` | `0.5.10` | fix | P1/P2 findings from gallery effects review. |
| `25b72101` | `0.5.10` | refine | Public frontend navigation and appearance. |
| `c5d79ffc` | `0.5.10` | refine | Public frontend navigation and loading states. |
| `a42b7e72` | `0.5.10` | feat | Workspace login entry flow. |
| `23e191ed` | `0.5.10` | refactor | Adopt Next-native public frontend primitives. |
| `c190e239` | `0.5.11` | feat | Public media presentation presets. |
| `d6fa4bdd` | `0.5.11` | feat | Non-destructive focal-point adjust for dashboard image fields. |
| `5d751eaf` | `0.5.11` | fix | Homepage banner crop support and next/image /media/ path resolution. |
| `37f17f64` | `0.5.11` | fix | Resolve next/image /media/ paths to absolute backend URLs. |
| `367e2926` | `0.5.11` | fix | Constrain public image media resolution. |
| `ca691b4b` | `0.5.11` | fix | Public media URL boundaries. |
| `8d30dde7` | `0.5.11` | feat | Hero art direction and image renderer slot (phases 8–10). |
| `8c8ce7e5` | `0.5.11` | fix | Close Phase 10 hero art direction data/renderer loop. |
| `f2d67032` | `0.5.11` | feat | Hero art direction renderer. |
| `7506e85f` | `0.5.11` | fix | Respect hero crop zoom. |
| `b1606972` | `0.5.11` | fix | Contain injected hero images. |
| `dc2b81d2` | `0.5.11` | feat | Lane URL param, unified hero pipeline, lane model refactor. |
| `9b3c2cb3` | `0.5.11` | refine | Homepage hero slide background contract. |
| `a6002379` | `0.5.11` | fix | Preserve public preface metadata for export. |
| `4e1a5f06` | `0.5.11` | fix | Avoid functional update for license terms hydration. |
| `1e3e9b55` | `0.6.0` | docs/feat | Hero banner placement editor contract. |
| `d104a830` | `0.6.0` | refine | Hero placement preview parity and transform model extraction. |
| `a99ae740` | `0.6.0` | docs | Phase 5 done; manual QA checklist. |
| `6b335c0e` | `0.6.0` | test | Phase 6 ultra-wide hero edge QA spec. |
| `0e501b60` | `0.6.0` | fix | Phase 6 ultra-wide smoke test reliability. |
| `96cb9698` | `0.6.0` | fix | Brand hero ultra-wide backdrop. |
| `5d9d6898` | `0.6.0` | feat | Public motion system foundation. |
| `015b16f6` | `0.6.0` | feat | Public text scale tokens for gallery shell. |
| `98acb5b3` | `0.6.0` | feat | Complete public SEO site contract. |
| `78fbb808` | `0.6.0` | chore | Finalize public SEO completion audit. |
| `8c3d06ec` | `0.6.0` | chore | Harden public quality: a11y, perf, phases 5–6. |
| `414b26c5` | `0.6.0` | perf | Harden public frontend performance baseline. |
| `fceb5f69` | `0.6.0` | feat | Unify public info page shell. |
| `38b29b89` | `0.6.0` | test/docs | Public info shell tests and stability plan. |
| `ded71359` | `0.6.0` | fix | Stabilize public info menu and refresh diffing. |
| `a3f29062` | `0.6.0` | perf | Prewarm public motion after idle. |
| `d65dca21` | `0.6.0` | perf | Reduce public font payload. |
| `7b61ef45` | `0.6.0` | refactor | Use server topbar for public info pages. |
| `68ed9817` | `0.6.0` | perf | Optimize public info page render path. |
| `dd2c7bb7` | `0.6.0` | refine | Public SEO indexing and hero motion. |
| `ef6d1f30` | `0.6.0` | security | Harden production security boundaries. |
| `262f02b5` | `0.6.0` | refine | Public info SEO checks. |
| `986e9c55` | `0.6.0` | docs | Document dependency audit exceptions. |
| `aba7d1c9` | `0.6.0` | security | Harden public image fallback referrers. |
| `6d83cf6e` | `0.6.0` | test | Security regression check. |
| `79aaad49` | `0.6.0` | feat | Public mobile shell behavior. |
| `5448edd6` | `0.6.0` | feat | Public mobile overlay interactions. |
| `ac6fdb4f` | `0.6.0` | feat | Redesign public mobile shell navigation. |
| `df93f4c2` | `0.6.0` | refine | Mobile gallery controls. |
| `d6047028` | `0.6.0` | chore | Sync brand hero copy. |

## Notes

- This is a planning map, not an applied release history.
- Merge commits are included for completeness but should usually not receive standalone release notes.
- `0.5.3`–`0.5.11` are intermediate patch releases between v0.5.0 and v0.6.0.
- `0.6.0` is the stable milestone release covering all work since v0.5.0.
- `0.5.9` removes backward compatibility — treat as a breaking patch within the 0.5.x series.
