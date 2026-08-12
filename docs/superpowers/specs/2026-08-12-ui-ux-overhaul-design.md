# UI/UX Overhaul — Nova SS Asset Manager

## Goal
Elevate the Assets experience (dashboard, header, detail sheet, forms, sticker dialog) from a functional data-table app to a polished, premium-feeling enterprise tool, without changing brand identity, data model, or scope outside Assets-related components + shared UI primitives + header.

## Decisions
- **Motion**: add `framer-motion` for layout animations (sliding nav pill, staggered list entrance, animated result counts). Radix's own `animate-in`/`animate-out` (via `tw-animate-css`) stays for Dialog/Sheet — not replaced.
- **Dropdown menu**: hand-built (`useState` + click-outside + Escape), no new Radix package. Matches existing a11y patterns (focus-visible rings, Escape-to-close) used elsewhere.
- **Sticker canvas**: `renderStickerCanvas` (`src/lib/stickers/render.ts`) is NOT modified — it's a pixel-exact, 1:1 port of the physical printed label layout (340×150 at 4x scale, QR payload, brand header). Only the dialog chrome around it changes.
- Scope: Assets pages, header, shared `components/ui` primitives, sticker dialog. Employees/Access pages untouched.

## 1. Design tokens (`globals.css`)
- `.glass` utility: translucent bg + `backdrop-blur` for header and sticky dialog/sheet headers.
- Gradient utilities for primary/gold surfaces (`navy → navy-2`, `gold → gold-2`).
- `.hover-lift` utility: `translateY(-2px)` + shadow transition, used on cards.
- `shimmer` keyframe for skeletons. Existing `shake` keyframe is reused (form validation, sticker label errors), not duplicated.
- Focus-visible rings get a transition so they animate in smoothly instead of snapping.

## 2. New shared primitives (`src/components/ui`)
- `skeleton.tsx` — `Skeleton` block with shimmer animation, sizing via `className`.
- `empty-state.tsx` — `EmptyState` with inline SVG illustration, title, description, CTA slot. Two callsite variants: "no assets yet" (admin CTA to add first asset) vs "no matches for filters" (clear-filters CTA).
- `dropdown-menu.tsx` — custom `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem`, absolute-positioned under trigger, closes on outside click / Escape / item select.
- `alert.tsx` — small callout component (icon + text) for permanent-action warnings, using `--warn`/`--gold-soft` tokens. Used by the sticker dialog.

## 3. `assets-view.tsx`
- Loading: `Skeleton`-built table mimicking stat tiles + filter bar + rows, replaces "Loading…" text.
- Empty: `EmptyState` replaces the plain empty message, with the two variants above.
- Filter row: restyled into a cohesive pill bar; animated "N results" count via `AnimatePresence`.
- Desktop table: sticky header (offset below the 60px app header), `hover:bg-muted/50` row highlight.
- Mobile (`< sm`): table replaced by a new `asset-card.tsx` card-list component (code, name, category badge, status badge, holder, location; tap opens detail sheet), staggered entrance via `framer-motion`.
- Stat tiles: `.hover-lift` + mount stagger.

## 4. `header.tsx`
- `motion.div` with `layoutId` slides behind the active tab; desktop nav and mobile bottom bar use separate `layoutId`s so each animates independently.
- Inline email/role/sign-out text replaced by an avatar-triggered `DropdownMenu` (email, role badge, sign out action wrapping existing `SignOutButton`).
- Header background gets a subtle gradient via the new `.glass`/gradient utilities; shadow stays as-is (already good).

## 5. `asset-detail-sheet.tsx`
- New hero block at the top: name, brand/model, prominent status + category badges, code, on a gradient-tinted strip.
- The flat `dl` becomes three labeled sections (Overview, Specs & Value, Assignment & Lifecycle) with small uppercase headings; existing `Kv` component unchanged underneath.

## 6. `asset-form-dialog.tsx`
- Fields grouped under section headings (Identity, Specs & Vendor, Value, Assignment & Notes) instead of one flat grid.
- Required-field validation moves from `toast.error` to inline: red border + `shake` animation + helper text under the field. Toasts stay reserved for server/network errors.

## 7. `sticker-dialog.tsx` — priority polish
This is the highest-stakes flow in the app: each (asset, label) pair can be generated exactly once, ever — no regenerate, only re-download. The UI must make that permanence unmistakable and give confidence before commit.
- **Live preview**: as the admin types a label, debounce-render into a preview pane using the *unmodified* `renderStickerCanvas`, shown inside a mock physical-label frame (subtle shadow/slight rotation) so they see the exact output before generating anything.
- **Permanence callout**: replace the plain paragraph with the new `Alert` component (warning-styled, icon) stating the label is permanent.
- **Confirm step**: clicking "Generate" reveals an inline confirm chip ("Generate '<label>' — this can't be undone. Confirm / Cancel") instead of firing immediately. No browser `confirm()`.
- **Gallery polish**: thumbnails use `Skeleton` while loading instead of "Loading…" text; hover-lift + border highlight on thumbnail cards; a small "340×150 print size" caption for physical-printing context.
- **Empty state**: "No stickers yet" gets the compact `EmptyState` treatment instead of plain text.
- Duplicate-label errors (409 from `createSticker`) surface inline near the input, not just as a toast, since retrying with a different label is the expected next action.

## 8. `button.tsx` / `card.tsx`
- `primary`/`gold` button variants get subtle gradient backgrounds + `active:scale-[0.98]` press feedback.
- `Card` gains an optional hoverable style for interactive use (stat tiles, asset cards, sticker thumbnails).

## Dependencies
- Add: `framer-motion`.
- No other new packages.

## Out of scope
- Employees and Admin/Access pages.
- `renderStickerCanvas` internals / physical label layout.
- Backend/API changes — this is a client-side presentation pass only.
