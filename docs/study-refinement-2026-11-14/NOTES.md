# Study refinement

Removed the local-only record notice as requested. Floating owl is off until explicitly enabled using the switch at the bottom of the side menu. The choice survives navigation/reload and synchronizes through browser storage events; when writes fail, it still works for the current session. Existing screens that suppress the floating helper continue to do so.

The Study page uses a bright warm-paper canvas, stronger ink digits, a white clock face, ink tab selection and one burnt-orange action. This replaces the first muted-green pass rejected as washed out. Timer, Pomodoro, session records and the finalized Home design retain their behavior.

Design rationale: [NN/g: Good Visual Design](https://www.nngroup.com/articles/good-visual-design/) recommends intentional colour and visual hierarchy; [Material switches](https://github.com/material-components/material-components-android/blob/master/docs/components/Switch.md) suit standalone on/off settings. The specific palette is a product design judgement, not a claim that research establishes a universally best colour.

Validation: TypeScript passed; 13 browser checks passed (see JSON), including default-off, on/off, persistence, timer start/pause, Pomodoro selection and failed storage writes. Screenshots use intercepted synthetic parent data at 390x844; no school records were changed.

## Hold-to-adjust duration

Hold the timer digits or selected duration for 300ms, then drag horizontally. Each 12px detent changes one minute (1 to 180). The ruler follows the drag continuously; releasing keeps the minute selected. Quick presets and keyboard arrows/Home/End remain available. Each changed detent schedules a short, quiet Web Audio tick; unsupported audio leaves adjustment functional. Selected subjects now use a white background with orange outline/text only.

Validation: 12 desktop-pointer/keyboard checks and 3 emulated-touch checks passed. Checks cover continuous/reverse dragging, release, bounds, quick presets, clock-digit dragging, audio-node scheduling, subject fill and overflow. Audio scheduling was verified in Chrome; physical speaker output was not measured.

## Round timeline and gesture isolation

Four round stops now sit above the clock. Progress covers each focus-plus-break cycle and reaches the next stop when the next round actually starts; the final stop marks round four while its remaining time is shown on the clock. Both duration entry points carry the existing data-swipe exclusion so sidebar touch handling does not claim their gesture. Ordinary page swipes still open the menu. Detent click volume is increased, with short activation/notch vibration requests on supporting devices. Release/cancel restores normal controls while retaining the selected minutes.

Validation: eight seeded timeline/automatic-transition browser assertions and eight emulated-touch/menu assertions passed, including reverse dragging to 20 minutes and restoration on release. Twelve pointer/keyboard ruler assertions also passed. Haptic API calls were observed; physical vibration strength depends on device support. One initial concurrent test run shared synthetic local state; it was rerun sequentially.

## Silent celebration and full child refresh

Fireworks remain visual, but synthesised whistle/boom/crackle audio and the timer completion chime are removed. The canvas background stays transparent; the blue night-sky wash and full-screen flash are removed. Timer-ruler detent audio is unchanged.

Picking a different child validates the selection, invalidates only that child's cached server responses, stores the choice, displays a profile-loading screen and reloads the document. Startup restores the selected child before mounting screens, so it does not briefly request the first child's data. Local study records are preserved. If storage cannot remember the choice, a keyed app remount loads the new child within the current tab instead of reloading back to the old choice. Choosing the already-selected child does nothing.

Validation: eight browser checks passed for the actual two-child Home switch (including document reload, distinct fee amounts, fresh request, no first-child flash/request, stale sibling cache invalidation and same-child behavior). Eight checks passed for the blocked-storage fallback. Five timed-completion checks passed: fireworks mounted, zero AudioContexts were created, transparent CSS/pixel corners, and cleanup. These used isolated synthetic API responses, not school records. An initial selector in the browser harness was corrected before rerunning; the final checks are the saved JSON results.
