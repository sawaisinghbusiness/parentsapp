# Parents Home refinement

Scope: the existing Parents Home, retaining the school photograph, real logo, navy navigation identity, child switcher, Hindi/English support and current routes.

Reading order: school identity, selected child and today's attendance, quick navigation, current updates, notices and events. School data is the authority; missing records never become sample records. Cached attendance is shown as today only when its date matches Asia/Kolkata.

Use a 20px gutter (12px for the wider child card), 24px between major groups, 12px within rows, and 12–14px card corners. The child card has a 96px minimum height and 8px vertical padding. Charcoal text and a cool gradient support navy actions. The school photograph fades into #E8EFF7, transitioning through #F1F5F9 to #F7F9FC. The child card stays white. Four quick tiles (68px) show the school's own illustrations on a soft blue card, each arriving with a short smooth entrance; the user chose these over outline icons on 2026-11-14. Update sections sit on the page surface. Fees payable uses the same neutral row styling as homework and results, with its amount and payment link retained. Green/red attendance text always includes the written status.

Use the existing Plus Jakarta Sans with Noto Sans Devanagari for Hindi. Keep meaningful controls at least 44px high. Allow long names and notices to wrap. Respect reduced-motion settings.

Impeccable 4.9.0 was used for the layout/craft review. Its common-font detector warning is intentionally accepted to preserve the app's established typeface. The cool background was approved by the user on 2026-11-14; the user kept the illustrated quick tiles rather than the outline shortcut strip, replacing the earlier warm stone direction. Fees remain neutral. Invented status thresholds and decorative badges remain outside scope.


## Filled operational actions - 15 November2026

The user requested an alternative to blue button backgrounds across the product family. Primary Apply/Pay/Submit controls now use evergreen #294E43 with white labels (9.27:1 sampled contrast), hover #203F36, pressed #18332B and a distinct neutral disabled state. Current homepage art/cool canvas, navigation, statuses and official documents are unchanged. lib/actionPalette.tsx carries route-owned scope to sheets; AI assistant opts out completely and its restored design remains untouched. Parent shared kit and explicit payment/leave/report actions use semantic action markers; chart/badge/selected-day/chat-bubble colours are not indiscriminately replaced.
