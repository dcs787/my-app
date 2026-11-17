# Components: my-app

Specs for every component in `recon.md` -> Components, plus the states the
recon didn't show but the app needs. Tokens are role names from
`tokens.json` (colours camelCased in code: `surfaceRaised`, `textMuted`, ...).
Code lives in `src/ui/`; the live gallery is the `/design` route.

Global rules
- Dark UI only (photos are the content; the chrome stays out of the way).
- Every pressable: min 44 x 44 hit area, `accessibilityRole`, `accessibilityState`
  (disabled / busy / selected), a visible focus ring for keyboard and switch
  control users: 2px `focus` outline with a 2px `bg` gap.
- Pressed feedback: opacity 0.7 within `motion.fast`; light haptic on
  primary actions and selection changes (iOS).
- Respect Reduce Motion: sheets and toasts fade instead of slide.
- All copy is ours; no strings taken from the original.

---

Text
  roles     caption, footnote, sm, base, title, xl, display (tokens.type)
  colours   text (default), textMuted, danger, success, onAccent
  font      Inter 400/500/600/700/800 (OFL); weight comes from the role
  a11y      scales with Dynamic Type up to 1.4x; `header` role for titles

Button
  variants  primary (accent bg, onAccent text), secondary (surfaceRaised bg,
            text), ghost (no bg, text), danger (surfaceRaised bg, danger text)
  sizes     sm 32px (hit area padded to 44), md 44px, lg 52px; full-width option
  shape     radius pill; padding x 16 (sm 12, lg 20); gap 8 with a leading icon
  states    default, pressed (0.7), focus-visible (ring), disabled (0.4, no
            press), loading (spinner replaces icon, label kept and read as busy)
  type      sm/600 (lg: base/600)
  a11y      role button; loading sets busy; disabled sets disabled
  used on   S01, S02, S03 empty state, S04 bottom bar, S13

IconButton
  variants  overlay (round, overlay bg at 70% over photos), plain (no bg),
            solid (surfaceRaised)
  sizes     36 / 44 visual, always 44 hit area
  states    default, pressed, focus-visible, selected (accent ring), disabled
  a11y      `accessibilityLabel` required (no visible label)
  used on   S04 top bar + right rail, S06 top bar, S09

Chip
  variants  action (icon + label, surfaceRaised), toggle (selected = accent bg,
            onAccent text), tag (static, border only)
  size      32px tall, radius pill, padding x 12, caption/600 type
  states    default, pressed, selected, focus-visible, disabled
  a11y      toggle chips use role `togglebutton` with `selected` state
  used on   S05 (text, comment, mention), S13 tags, unit switch

Tabs (segmented)
  variants  underline (text tabs, 2px accent bar under selected, used for
            Activity / Totals / Gear), pill (rounded segments, selected =
            surfaceRaised bg, used for small filters)
  states    selected, default, pressed, focus-visible
  layout    equal widths; underline variant has a 1px border below
  a11y      role tablist / tab with selected state; arrow keys move selection on web
  used on   S05, S06, S11

Sheet (bottom sheet)
  variants  half (60% of screen), full (92%)
  parts     grabber 36 x 5 (radius pill, border colour), optional title row,
            scroll body
  tokens    surface bg, radius xl on top corners, shadow sheet
  states    opening / open / closing; backdrop black at 50% closes on tap
  motion    slide up `motion.sheet` with ease; fade only with Reduce Motion
  a11y      traps focus while open, Escape / back closes, title is the header
  used on   S05 template sheet, colour + font pickers, confirm dialogs

TemplateTile
  shows     a live preview of a template rendered with the current activity
  size      square, 2-column grid, gap 8, radius md, surface bg
  states    default, pressed, focus-visible, disabled (needs data the activity
            lacks: 0.35 opacity + reason under it, e.g. "No route"), copied
            (check badge for 1.2 s)
  a11y      label = template name + what it shows ("Distance and pace")
  used on   S05, S06

StatBlock
  layout    1 to 6 stats in a grid (1, 2 or 3 columns); label above value
  type      label caption/500 textMuted uppercase tracking 0.5; value title/700
            (or xl/700 for the hero stat); unit in the label or as suffix
  states    value missing shows an en dash, never "0"
  used on   S04 editor stats, S12, activity detail

ListRow (activity row)
  parts     leading sport icon in a 40px surfaceRaised circle, title (base/600),
            subtitle (footnote, textMuted: date, source), trailing value
            (sm/600: distance) and chevron
  states    default, pressed, focus-visible; swipe to delete later
  a11y      whole row is one button: "Morning run, 6.2 miles, Tuesday"
  used on   S03, settings lists

TextField
  parts     label (footnote/500), input 44px, helper or error text
  tokens    surface bg, 1px borderInput, radius md; focus = 2px focus border
  states    default, focus, filled, error (danger border + message),
            disabled, read-only
  a11y      label linked to the input; error announced
  used on   manual entry, rename activity, settings

EmptyState
  parts     icon in a 56px surfaceRaised circle, title (title/600), body
            (sm, textMuted, max 300px), up to two buttons stacked
  used on   S03 no activities, S06 no totals yet

Toast
  placement bottom, above the tab bar / sheet, max width 360
  tokens    surfaceRaised bg, text sm/600, radius pill, optional leading icon
  timing    1.6 s; one at a time, newest replaces
  a11y      announced politely (live region)
  used on   S06 "Copied", saves, sync results

Swatches (colour picker)
  layout    horizontal row of 32px circles, 44px hit area, 1px border for
            dark colours, selected = 2px ring with gap
  values    white, black and 8 hues defined with the brand (replica-brand)
  used on   S04 colour tool, S06 top bar

Still to spec with the editor (M1/M2): canvas element selection handles,
font picker ("Aa" cycles fonts with a preview), layers list, share bar.
