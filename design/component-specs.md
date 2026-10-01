# Tippla component specifications

Approved direction: **Banking Clarity**. Source of truth: `tokens.json`, version `1.0.1`, and `icons.md`. These specifications add component rules without changing the token schema.

All dimensions are CSS px. PNG sheets are rendered at 2× using Inter. Light is the left column; dark is the right. Sheet titles, state labels, template annotations and specimen frames are documentation, not app UI. The three ScoreRing sizes are shown at their actual relative sizes.

Braced text in a sheet denotes a data-binding template, not customer-facing copy. Jess's supplied values are used unchanged. These early reusable examples intentionally contain bindings where facts had not yet been supplied. Later exact Marcus and Jess fixtures, including the Healthy→Thriving threshold of 750, are in `screens.md`. Only Jess's StageScale marker has a numeric position. Do not ship placeholder strings or invent missing scoring thresholds.

## Shared implementation contract

| Concern | Specification |
| --- | --- |
| Theme aliases used below | `C = color[theme]`; `S = color.stage[theme]`; `CH = color.chart[theme]`. Each alias resolves separately for `light` and `dark`. These are documentation aliases, not new JSON keys. |
| Brand surface, both themes | `linear-gradient(118deg in srgb, color.stage.light.steadying, color.stage.light.thriving)`. All content on this fixed gradient uses `color.light.onAccent`. Do not substitute dark-mode `onAccent` here. Correct schema order is `color.stage.light.*`. |
| Mobile sizing | `layout.mobileWidth` = 390; `layout.gutter` = 20. Full-width components are 350 wide at that viewport. Use fluid width with no horizontal clipping. |
| Spacing | `space[1]` = 4, `[2]` = 8, `[3]` = 12, `[4]` = 16, `[5]` = 20, `[6]` = 24, `[7]` = 32, `[8]` = 48. Zero-based indexing. |
| Font | Display headings use `font.display`; prose uses `font.body`; scores, amounts and factor values use `font.numeric` with `font.numeric.features` = `tnum`. All resolve to Inter plus the supplied system fallbacks. Apply the complete `type.*` record, including line height, weight and letter spacing. |
| Targets and focus | Every button/link has at least `layout.minTap` = 44 × 44. Use `focusRing.width` = 2, `focusRing.offset` = 3, `C.focus`. Keep focus visible and unobscured. Brand-surface controls use a `color.light.onAccent` focus outline instead. |
| Icons | Lucide; `icons.strokeWidth` = 2. Inline chevrons use `icons.sizes[1]` = 20; status icons use `icons.sizes[2]` = 24. Preserve round caps/joins and no fill. Decorative SVGs are `aria-hidden`. |
| Text scaling | Heights in the tables are default-size references or minimums. At 200% text scaling, wrap and grow vertically. Never shrink fonts, truncate essential amounts, or overlap the trailing chevron. Factor value may move below the title; StageScale may become a labelled vertical list. |
| Press / hover | Neutral surface targets use `C.surface2`; accent-soft targets retain `C.accentSoft` and gain a 2 px `C.accent` inset outline. Filled accent buttons retain their colours and gain a 2 px `C.onAccent` inset outline. No opacity reduction of text/icons. |
| Motion | Colour transitions: `motion.fast`; sheet transitions: `motion.slow`, using `motion.easing`. No score count-up, overshoot, bouncing, pulsing warnings or celebratory animation. Reduced motion removes nonessential movement. |
| Sheets | Open a bottom sheet on mobile; `radius.xl` at its top corners, `C.surface`, `C.scrim` behind it, `elevation[theme][3]`. Trap focus, support Escape and an explicit close button, and restore focus to the triggering control. |
| Status semantics | Colour never carries the sole meaning. No red for scores, borrowing, spending or shortfalls. `positive` is not used in these components. `line` and empty tracks are decorative; essential state information has visible text. |

## 1. ScoreRing

![ScoreRing — hero, medium and small; normal, loading, null and override; light left, dark right](score-ring-states.png)

### Anatomy, dimensions and typography

| Element | Size / padding / gap | Typography | Colour and state behaviour | Interaction / semantics |
| --- | --- | --- | --- | --- |
| Host | No mandatory card. Neutral host `C.surface`; a focused hero may use the brand surface. Host padding `space[5]`, radius `radius.lg` when a card is used. | — | Brand treatment is available for normal only in this handoff; loading/null/override use neutral surfaces. | The inspection-sheet frames are not fixed app component dimensions. The ring itself is not an invisible button. |
| Hero ring | 200 × 200; stroke `space[3]` = 12; centre radius 94. | Number `type.figureL`; stage `type.small`. | Normal brand: arc `color.light.onAccent`; track `color.stage.light.building`; both centre labels `color.light.onAccent`. Normal neutral: arc `S[currentStage]`, track `CH.ringTrack`, labels `C.text`. | Keep the path prominent; do not use `type.figureXL` for the score here. |
| Hero next-stage block | `space[4]` below the ring; `space[2]` between distance and endpoints; centred. | Distance `type.h2`; endpoints `type.caption`. | Brand: both `color.light.onAccent`. Neutral: distance `C.text`, endpoints `C.textMuted`. | Jess: “128 points to Healthy”; endpoints “450 → 600”. |
| Medium ring | 112 × 112; stroke `space[2]` = 8; centre radius 52. | Number `type.h1`; stage `type.small`; distance `type.h3`; “to Healthy” `type.small`. | Arc `S[currentStage]`; track `CH.ringTrack`; number/stage/distance `C.text`; supporting text `C.textMuted`. | Put stage and distance below the circle with `space[3]` and `space[4]` gaps, or beside it in a fluid dashboard row. |
| Small ring | 48 × 48; stroke `space[1]` = 4; centre radius 22. No text inside. | Adjacent number `type.bodyStrong`; stage and distance `type.small`. | Arc `S[currentStage]`; track `CH.ringTrack`; number/distance `C.text`; stage `C.textMuted`. | Text sits beside the ring, separated by `space[3]`; stage follows number by `space[1]`. Distance sits `space[3]` below that row. |
| Loading graphic | Reserve the requested diameter to avoid layout shift. Keep the neutral empty track; hero/medium may show a 56 × 16, `radius.xs` centre skeleton. | “Updating your SmartScore”: `type.small`. | Track `CH.ringTrack`; skeleton `C.surface2`; message `C.textMuted`. No stage, score or filled arc. | `aria-busy=true`, polite status text. Static skeleton is the default; never animate a numerical arc as a loader. |
| Null graphic/message | Reserve ring area; remove the ring. Centre Lucide `Info` at 24 px in a 48 px hero or 40 px medium/small neutral disc. | “Not enough history yet”: `type.small`. | Disc `C.neutralSoft`; icon `C.neutral`; message `C.text`. | No numeric meter, stage, distance or zero. Null means insufficient history, not a poor result. |
| Override graphic/message | Same reserved area and neutral icon treatment as null. | “Your SmartScore isn't available”: `type.small`; “See details”: `type.small`. | Disc `C.neutralSoft`; icon `C.neutral`; message `C.text`; action `C.accent`. | No score/stage/arc. “See details” is an explicit ≥44 px target opening the score-availability sheet, using approved explanatory copy from the scoring service. |
| Terminal stage | Retain score and the supplied Thriving progress; omit next-stage distance/endpoints. | “Thriving” `type.small`. | Normal current-stage palette. | No invented fifth stage or “0 points to go”. Upper bound is 1,000; stage start must come from configuration. |

### State and calculation rules

- Precedence: override → loading → insufficient history → normal. Test null explicitly: a valid score of 0 is not missing data.
- Valid normal data includes score, current stage, stage start and the next-stage threshold. For Jess, `score = 472`, `stageStart = 450`, `nextStageStart = 600`.
- Stage progress is `(472 − 450) / (600 − 450) = 22 / 150 = 0.146666…`; distance is `600 − 472 = 128`. Do not divide by 599, use the overall score percentage, round the rendered fraction to 15%, or impose a minimum arc.
- Render clockwise from 12 o'clock. For diameter `d` and stroke `s`, `r = (d − s) / 2`, circumference `2πr`, dash length `circumference × progress`. Round caps are stroke geometry; do not add them to the data percentage. At exact zero progress, hide the arc entirely so a rounded zero-length dash does not appear as earned progress.
- At a stage threshold, update the stage, range and distance atomically. At 600, Jess enters Healthy; never leave the old Steadying ring full while showing the Healthy label.
- Normal accessible meter: `aria-valuemin=stageStart`, `aria-valuemax=nextStageStart`, `aria-valuenow=score`, and value text “SmartScore 472. Steadying. 128 points to Healthy.” The graphic is hidden from assistive technology; announce the value once. Null/override are text groups, not meters.
- Invalid or inconsistent service data must not be repaired into a plausible score. Use the neutral unavailable presentation and record the validation failure outside customer UI.

## 2. StageScale

![StageScale — Building, Steadying, Healthy and Thriving; light left, dark right](stage-scale-states.png)

| Element / state | Size / padding / gap | Typography | Colour token, light and dark | Interaction / semantics |
| --- | --- | --- | --- | --- |
| Container | 350 wide at the reference viewport; min-height 196; padding `space[5]`; radius `radius.md`; no shadow. | — | `C.surface`. | Render only when a valid score and stage configuration are available. ScoreRing owns loading/null/override messaging; do not show a guessed scale underneath it. |
| Current stage + score | One row with `space[3]` minimum separation; wrap score beneath stage at large text sizes. | Both `type.h3`; score uses `font.numeric`. | Both `C.text` in every stage. | Current stage is explicit text; selecting another stage for information does not change this row. |
| Four stage segments | Four equal widths, 8 px high (`space[2]`), `space[1]` gap, `radius.pill`. On a 310 px inner width: `(310 − 3 × 4) / 4 = 74.5` px each. | — | Building `S.building`; Steadying `S.steadying`; Healthy `S.healthy`; Thriving `S.thriving`. No opacity fading. | This is an ordinal path through stages, not a proportional 0–1,000 axis. Keep all four named stages visible. |
| Marker | 14 px outer diameter; 2 px border; 4 px centre dot. Centre on the segment's midline. Allow overflow at segment endpoints. | — | Fill `C.surface`, border and centre `C.text`. | Set from score-derived progress. Non-draggable; never use slider semantics. Marker and current label together identify position. |
| Stage labels | `space[3]` below the strip; each label centred in its segment width. Each segment+label has a ≥44 px tall target. | `type.caption`. | Current label `C.text`; other labels `C.textMuted`. Current underline: 2 px `C.text`, `space[2]` below the text line. | Four named buttons open “About [stage]” sheets. Apply `aria-current="step"` only to the actual current stage; retain it while an information sheet is open. |
| Next-stage distance | `space[5]` after the label/underline group; target height ≥44; Lucide `ChevronRight` 20 px at the trailing edge; text/icon gap `space[3]`. | `type.h2`; long content wraps. Template bindings in the image use smaller `type.h3` for annotation readability only. | Text `C.text`; chevron `C.accent`. | Jess: “128 points to Healthy”. Opens the Healthy-stage sheet explaining the next threshold and factors with room to move. |
| Building current | Same geometry; current label and marker within Building. | Same tokens. | Marker `C.text`/`C.surface`; segment `S.building`; other segments retain their own colours. | Next stage is Steadying. Values and position come from score configuration; no invented fixture. |
| Steadying current | Same geometry; Jess's position is 22/150 through the second segment. | Same tokens. | Current segment `S.steadying`; all labels use text tokens. | Next stage Healthy at 600; distance 128. |
| Healthy current | Same geometry; marker within Healthy when valid data is supplied. | Same tokens. | Current segment `S.healthy`. | Next stage Thriving at 750 in the later supplied fixture. Marcus is 612, Healthy, with 138 points to go; progress is 12/150. Production thresholds still come from configuration. |
| Thriving current | Same geometry; terminal row says “Your current stage”; no next-distance value. | Terminal row `type.h3`. | Current segment `S.thriving`; row `C.text`, chevron `C.accent`. | Row opens “About Thriving”. Marker uses the configured Thriving start and score maximum 1,000. |
| Focus / press | Stage targets keep their segment colours. Focus follows the shared contract; press adds a `C.surface2` target background behind the label. | Unchanged. | `C.focus`; label foreground unchanged. | No colour-only selection, drag gesture or horizontal scroll needed. At large text sizes, use four labelled vertical rows with the same targets and current-stage indication. |

Marker x-position is `segmentStart + clamp(progress, 0, 1) × segmentWidth`, accounting for the gaps between segments. Jess's marker is 89.4267 px from the inner left edge: one segment and one gap, plus `74.5 × 22/150`. The image uses this exact placement.

## 3. FactorTile

![FactorTile — normal, strongest, null, pressed and focused; light left, dark right](factor-tile-states.png)

| Element / state | Size / padding / gap | Typography | Colour token, light and dark | Interaction / semantics |
| --- | --- | --- | --- | --- |
| Whole tile | 350 wide; min-height 112 normal/null, 140 strongest; padding `space[5]`; radius `radius.md`; no shadow. Tile-to-tile gap `space[3]`. | — | Normal/null `C.surface`; strongest `C.accentSoft`. | One native button wrapping non-interactive contents. Entire tile opens the matching factor sheet; no nested links. |
| Title/value row | CSS grid `minmax(0, 1fr) auto 20px`; gap `space[3]`. Allow title wrapping. | Title `type.h3`; value `type.h3` with `font.numeric`. | Title/value `C.text`, except null value `C.textMuted`. | Normal title “Current borrowing”; value “2.9 / 10”. At large text sizes move the value below the title, keeping the chevron separate. |
| Explanation | `space[4]` below the title row; no truncation. | `type.small`. | `C.textMuted` in all states. | Normal: “you have 3 loans open.” Full detail and the first relevant action are one tap down. |
| Trailing chevron | `icons.sizes[1]` = 20; decorative, aligned to the first title line. | — | `C.textMuted`. | Not a separate 20 px tap target; the entire tile is the control. |
| Strongest label | Plain text above title; `space[3]` between label and title. No pill, medal, star or badge. | “Strongest factor”: `type.caption`. | `C.accent` on `C.accentSoft`. Title/value remain `C.text`; explanation `C.textMuted`. | Service identifies the strongest available factor. Do not label Current borrowing 2.9/10 as strongest; its fixture was supplied as the biggest factor with room to move. |
| Null | Same title, em dash instead of value; omit “/ 10”; explanation “Not enough history yet”. | Title/value `type.h3`; explanation `type.small`. | Title `C.text`; dash, explanation and chevron `C.textMuted`; background `C.surface`. | Remains actionable; sheet explains data availability for that factor. Never render “0 / 10”. |
| Pressed / hover | Same geometry, no translation. | Unchanged. | Normal/null background `C.surface2`. Strongest background `C.accentSoft` plus 2 px inset `C.accent` outline. Other foregrounds unchanged. | Apply for `motion.fast`. Press does not change the score. |
| Focused | 2 px outline, 3 px offset per `focusRing`; never clip at a parent overflow boundary. | Unchanged. | `C.focus`; underlying state's fill/foregrounds unchanged. | Visible keyboard focus, with Enter/Space activation. |
| Accessible name | Include name, available value, explanation and “Strongest factor” only when applicable. | — | — | Use the actual factor identifier for the destination. Null label describes missing history; do not announce an absent value as zero. |

No value bar is used: the number is precise, the explanation is readable, and missing strongest-factor data does not require a fabricated visual proportion. The nine factors remain ordinary, equally interactive rows.

## 4. PayCycleHero

![PayCycleHero — normal money-left template and Jess's short-before-payday state; light left, dark right](pay-cycle-hero-states.png)

| Element / state | Size / padding / gap | Typography | Colour token, light and dark | Interaction / semantics |
| --- | --- | --- | --- | --- |
| Card shell | 350 wide; radius `radius.lg`; padding `space[5]` within each section. Reference height 524 with two-line headline and advance disclosure; height is content-driven. No shadow. | — | Body `C.surface`; upper summary uses the fixed brand gradient in both states/themes. | A section with separate controls, not a button containing buttons. The normal amount is a binding in the sheet because no normal-state data was supplied. |
| Summary heading | Label, then `space[3]` gap to the headline. Headline wraps without truncation. Reference upper panel 192 high. | “Pay cycle” `type.small`; headline `type.h1`. | All summary text `color.light.onAccent`, including dark mode. | Normal: “About {amount} left before payday”. Short: “About $53 short before payday”. No urgency icon or red styling. |
| Cycle dates / payday | `space[5]` after headline; date and payday rows separated by `space[2]`. | Date `type.small`; payday `type.caption`. | `color.light.onAccent`. | Jess: “Pay cycle 17/09 – 30/09” and “6 days to payday (Thu 01/10)”. Derive production timing from the data snapshot and account timezone, not this document's render date. |
| Forecast control | Full inner width 310; inset padding `space[3]`; radius `radius.sm`; 80 high at default type. Top separation `space[4]`. | Balance/due summary `type.small`; chart labels `type.caption`. | Normal panel `C.surface2`, text `C.text`, labels `C.textMuted`. Short panel `C.cautionSoft`, text/labels `C.caution`. | Entire panel is a named ≥44 px button opening the pay-cycle forecast sheet. Visible Jess summary: “Balance $314 − $367 due”. |
| Coverage strip | 8 px high (`space[2]`), `radius.pill`; `space[1]` above, `space[2]` below before legend. | Legend `type.caption`. | Covered portion `C.accent`. Context track `CH.ringTrack`. Short remainder uses `C.cautionSoft` plus 1 px diagonal `CH.hatch` lines spaced 6 px; do not use a black fill. | Jess: coverage `314/367`, remainder `53/367`; legend “Covered” / “Short”. This describes bill coverage, not a spending-success meter. Graphic is decorative to the fully labelled forecast button. |
| Historical totals | Two columns with `space[3]` minimum gap; `space[3]` after forecast. Wrap to separate rows if needed. | Both `type.bodyStrong`; amounts use `font.numeric`. | Both `C.text`, regardless of spending direction or income source. | “$1,832 spent” and “$2,483 paid in”. Spent opens transactions filtered to this cycle; paid in opens income transactions including the advance. Use separate ≥44 px controls. |
| Divider | 1 px; vertical separation `space[3]` minimum from interactive contents. | — | `C.line`. | Decorative only. |
| Advance disclosure | Full-width row; min-height 64; text/chevron gap `space[3]`; Lucide `ChevronRight` 20. Omit the whole row when no advance is included. | First line `type.small`; repayment line `type.caption`. | First line `C.text`; repayment line and chevron `C.textMuted`. | Jess: “Includes a $300 pay advance,” then “$315 due back 30/09 ($300 + $15 fee)”. Opens the advance detail sheet. |
| Primary due action | Full inner width; height `layout.minTap` = 44; radius `radius.sm`; horizontal padding `space[4]`. | “See what's due”: `type.bodyStrong`. | Background `C.accent`; label `C.onAccent`. | Opens calendar/due-items sheet for the remaining days before payday, with the entries listed below. |
| Hardship action | Full inner-width target; min-height 44; `space[2]` after primary action. | “Options if money's tight”: `type.small`. | Label `C.accent`; transparent background over `C.surface`. | Opens Hardship support. Available in both states. No lender-offer routing. |
| Normal / money left | `balance − due > 0`. Same structure and brand treatment as short state. | Same tokens. | Forecast `C.surface2` / `C.text`; no positive green. | With real data, strip shows the bills-covered share and remaining-money share; labels “Bills covered” / “Left”. Template graphics carry no invented ratios. |
| Short before payday | `balance − due < 0`. Same structure and spacing. | Same tokens; no larger warning typography. | Forecast `C.cautionSoft` / `C.caution`; short portion `CH.hatch`. Other elements retain normal colours. | Use the absolute shortfall in the headline. Preserve “About”; do not represent it as a declined application or overdue bill. |
| Exact zero / missing data | Zero uses the same neutral forecast treatment; unavailable inputs suppress the estimate/strip. | Zero: “About $0 left before payday”. Missing: “Pay-cycle estimate unavailable”, `type.h1`. | Normal brand heading; neutral body. Never destructive or positive. | Edge rules, not extra sample scenarios. Do not map unknown balance or unknown due total to zero. Keep any independently valid transaction links available. |
| Press / focus | Target-specific, using the shared contract. Do not dim the entire card. | Unchanged. | Forecast retains caution colours when short and gains 2 px inset `C.caution` outline on press; normal forecast uses `C.neutral` inset outline. Other controls follow the shared rules. | Keyboard focus stays visible; no nested or overlapping button targets. |

### Data and destination contract

- Store amounts in integer cents. Jess: balance 31,400 cents; due 36,700 cents; derived remaining −5,300 cents. Display the supplied whole-dollar amounts exactly. Do not subtract the $315 repayment twice: it is already inside the $367 due total.
- Paid in ($2,483) and spent ($1,832) are historical cycle totals. They are not the forecast balance and do not get added to the current $314 again. The paid-in total includes the $300 advance; it is not all wages or benefit income.
- Forecast denominator is `max(max(balance, 0), due)`. Covered amount is `min(max(balance, 0), due)`. In normal state, the remaining width is money left; in short state, it is uncovered bills. Guard zero denominators. Negative current balances keep the numeric explanation and neutral hatch treatment; do not draw negative widths.
- The forecast sheet explains that the estimate uses current balance and bills due before payday and does not include future discretionary spending. It includes the exact breakdown: **$367 due before payday: Telstra $52 (Sat 26/09), Beforepay $315 (Wed 30/09)**.
- “See what's due” opens the calendar view of the same two items. Telstra is labelled “predicted”; its item outline uses a 1 px dashed `CH.predicted` stroke and the visible word “predicted” in `C.textMuted`. Do not mark Beforepay predicted without source data.
- The advance sheet shows Beforepay, principal $300, fee $15, total repayment $315 and due date 30/09. Keep the fee explicit; never call the advance income without the borrowing explanation.
- Parent dashboard owns “Updated Fri 25/09, 9:14am”. The fixture's six-day countdown is tied to this snapshot; do not silently replace it using today's date. Preserve supplied short dates in these fixtures. When a full year is available for production transaction details, format DD/MM/YYYY; all money uses AUD with `$`.

## Verification and build checks

| Check | Expected result |
| --- | --- |
| State-sheet coverage | ScoreRing: 3 sizes × 4 states × 2 themes. StageScale: 4 current-stage selections × 2 themes, with unprovided values clearly marked as templates. FactorTile: 3 data states + pressed/focused × 2 themes. PayCycleHero: 2 requested states × 2 themes. |
| Ring arithmetic | Jess arc fraction is exactly 22/150; distance is exactly 128. True zero, stage-entry and stage-transition cases do not create a minimum fill or stale stage label. |
| Money arithmetic | $314 − $367 = −$53; $52 + $315 = $367; $300 + $15 = $315. Paid-in/spent values do not alter this equation. |
| Typography / resize | Apply full token records; Inter with numeric tabular figures. Check 390 px viewport and 200% text scaling with long factor names. No clipped amount, stage label, control or focus ring. |
| Colour verification | 35 component foreground/background pairs were computed from the saved tokens. Tested text pairs are ≥5.49:1; tested essential graphic pairs are ≥4.47:1. Empty tracks, skeletons and decorative dividers intentionally carry no unique information. These checks do not substitute for validating the implemented DOM's accessibility. |
| Missing data | No fabricated factor, threshold, positive amount, zero score or completed arc. Use service-configured bounds. Suppress dependent StageScale when a score is not available. |
| Interaction | Every visible action opens its specified sheet/filter. Segment taps open stage information; they never move the customer's score. Full FactorTile is one button; PayCycleHero controls are separate. |

The images are exact static design references, not evidence that the production components or their interactions have been implemented.
