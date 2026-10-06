# Tippla icon mapping

Direction: Banking Clarity. Icon library: [Lucide](https://lucide.dev/icons/). Names checked on 30/09/2026.

All requested needs use existing Lucide icons. No custom SVGs are required, so there are no files under `design/icons/` in this delivery.

## UI icons

Use the named React export from `lucide-react`; the linked kebab-case name is the corresponding Lucide catalogue name.

| Need | Lucide name | React export |
| --- | --- | --- |
| Home | [house](https://lucide.dev/icons/house) | `House` |
| Score | [circle-gauge](https://lucide.dev/icons/circle-gauge) | `CircleGauge` |
| Spending | [chart-no-axes-column](https://lucide.dev/icons/chart-no-axes-column) | `ChartNoAxesColumn` |
| Loans | [wallet](https://lucide.dev/icons/wallet) | `Wallet` |
| Support | [message-circle](https://lucide.dev/icons/message-circle) | `MessageCircle` |
| Notifications | [bell](https://lucide.dev/icons/bell) | `Bell` |
| Search | [search](https://lucide.dev/icons/search) | `Search` |
| Filter | [sliders-horizontal](https://lucide.dev/icons/sliders-horizontal) | `SlidersHorizontal` |
| Sort | [arrow-up-down](https://lucide.dev/icons/arrow-up-down) | `ArrowUpDown` |
| Chevron | [chevron-right](https://lucide.dev/icons/chevron-right) | `ChevronRight` |
| Close | [x](https://lucide.dev/icons/x) | `X` |
| Info | [info](https://lucide.dev/icons/info) | `Info` |
| Calendar | [calendar-days](https://lucide.dev/icons/calendar-days) | `CalendarDays` |
| Settings | [settings](https://lucide.dev/icons/settings) | `Settings` |
| Account | [circle-user-round](https://lucide.dev/icons/circle-user-round) | `CircleUserRound` |
| Bank | [landmark](https://lucide.dev/icons/landmark) | `Landmark` |
| Lock | [lock](https://lucide.dev/icons/lock) | `Lock` |
| Eye | [eye](https://lucide.dev/icons/eye) | `Eye` |
| Edit | [pencil](https://lucide.dev/icons/pencil) | `Pencil` |
| Check | [check](https://lucide.dev/icons/check) | `Check` |
| Plus | [plus](https://lucide.dev/icons/plus) | `Plus` |
| External link | [external-link](https://lucide.dev/icons/external-link) | `ExternalLink` |

## Category icons

| Need | Lucide name | React export |
| --- | --- | --- |
| Housing | [house](https://lucide.dev/icons/house) | `House` |
| Groceries | [shopping-basket](https://lucide.dev/icons/shopping-basket) | `ShoppingBasket` |
| Food & dining | [utensils](https://lucide.dev/icons/utensils) | `Utensils` |
| Transport | [car-front](https://lucide.dev/icons/car-front) | `CarFront` |
| Bills & utilities | [plug](https://lucide.dev/icons/plug) | `Plug` |
| Subscriptions | [repeat](https://lucide.dev/icons/repeat) | `Repeat` |
| Entertainment | [clapperboard](https://lucide.dev/icons/clapperboard) | `Clapperboard` |
| Alcohol | [wine](https://lucide.dev/icons/wine) | `Wine` |
| Gambling | [layers](https://lucide.dev/icons/layers) | `Layers` |
| Health | [heart-pulse](https://lucide.dev/icons/heart-pulse) | `HeartPulse` |
| Shopping | [shopping-bag](https://lucide.dev/icons/shopping-bag) | `ShoppingBag` |
| Loan repayments | [banknote-arrow-up](https://lucide.dev/icons/banknote-arrow-up) | `BanknoteArrowUp` |
| Buy now pay later | [calendar-clock](https://lucide.dev/icons/calendar-clock) | `CalendarClock` |
| Pay advances | [banknote-arrow-down](https://lucide.dev/icons/banknote-arrow-down) | `BanknoteArrowDown` |
| Cash withdrawals | [banknote](https://lucide.dev/icons/banknote) | `Banknote` |
| Bank fees | [receipt-text](https://lucide.dev/icons/receipt-text) | `ReceiptText` |
| Income | [arrow-down-to-line](https://lucide.dev/icons/arrow-down-to-line) | `ArrowDownToLine` |
| Centrelink | [arrow-down-to-line](https://lucide.dev/icons/arrow-down-to-line) | `ArrowDownToLine` |

## Rendering contract

- Use Lucide's native `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, round line caps and round line joins. Keep the original paths.
- Use 24 px for bottom navigation and category icons, 20 px for inline controls, and 16 px only for secondary indicators. Every interactive target is at least 44 × 44 px; enlarge its container rather than the icon.
- Use the matching light/dark tokens from `design/tokens.json`. Apply category identity colours to `currentColor` so the outlines receive the colour; do not convert the icons to solid fills. Keep icon opacity at 1 to preserve tested contrast.
- Bottom navigation keeps visible labels. Selected tabs use the accent colour plus a separate indicator; retain the same icon shape, size and stroke weight.
- Use `ChevronRight` for navigation and opening a detail sheet. Use Lucide `ChevronDown` for collapsed disclosure and `ChevronUp` for expanded disclosure; do not change the meaning of the right chevron.
- For balance visibility, use `Eye` on a button labelled “Show balance” and `EyeOff` on a button labelled “Hide balance”. Labels describe the action that the button performs.
- `CircleGauge` is the Score navigation icon. Build the actual SmartScore progress ring from the customer's stage progress rather than using a static gauge icon.
- Keep category names visible beside category icons. Decorative icons beside visible text use `aria-hidden="true"`; icon-only buttons need a clear accessible name on the button.

## Category treatment

- Gambling uses `Layers` in the neutral slate `color.category.[theme].gambling` token, with the same size, stroke, opacity and container treatment as every other category. No warning symbols, dice, slot machines or special emphasis.
- Income and Centrelink deliberately share `ArrowDownToLine`. Give both the same size, stroke, opacity, container and label hierarchy. Use their approved category colours, which have matched perceptual lightness and chroma. Do not substitute a wage-specific briefcase or an assistance symbol.
- `BanknoteArrowUp` means an outgoing loan repayment; `BanknoteArrowDown` means a received pay advance. The arrows describe money flow, not improvement or deterioration. Use their category colours without red/green status overrides.
- `CalendarClock` describes BNPL instalments. `Repeat` describes recurring subscriptions. Keep these distinct, including when they appear next to repayments and advances.
- `Wine` is a plain alcohol category symbol, with no celebration or warning styling. `HeartPulse` is a static health category icon, with no animated pulse.

## Implementation

Use named imports from `lucide-react` and pin the installed package version in the project's lockfile. Avoid mixed icon libraries, emoji, platform-specific glyphs and bespoke redraws of these icons.

Custom SVGs: none required for this mapping. If a future need requires one, it must follow the same 24 × 24 viewBox, 2 px stroke, no-fill, round-cap and round-join contract and be saved under `design/icons/`.
