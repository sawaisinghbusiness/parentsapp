# Study refinement

Removed the local-only record notice as requested. Floating owl is off until explicitly enabled using the switch at the bottom of the side menu. The choice survives navigation/reload and synchronizes through browser storage events; when writes fail, it still works for the current session. Existing screens that suppress the floating helper continue to do so.

The Study page uses a bright warm-paper canvas, stronger ink digits, a white clock face, ink tab selection and one burnt-orange action. This replaces the first muted-green pass rejected as washed out. Timer, Pomodoro, session records and the finalized Home design retain their behavior.

Design rationale: [NN/g: Good Visual Design](https://www.nngroup.com/articles/good-visual-design/) recommends intentional colour and visual hierarchy; [Material switches](https://github.com/material-components/material-components-android/blob/master/docs/components/Switch.md) suit standalone on/off settings. The specific palette is a product design judgement, not a claim that research establishes a universally best colour.

Validation: TypeScript passed; 13 browser checks passed (see JSON), including default-off, on/off, persistence, timer start/pause, Pomodoro selection and failed storage writes. Screenshots use intercepted synthetic parent data at 390x844; no school records were changed.

## Hold-to-adjust duration

Hold the timer digits or selected duration for 300ms, then drag horizontally. Each 12px detent changes one minute (1 to 180). The ruler follows the drag continuously; releasing keeps the minute selected. Quick presets and keyboard arrows/Home/End remain available. Each changed detent schedules a short, quiet Web Audio tick; unsupported audio leaves adjustment functional. Selected subjects now use a white background with orange outline/text only.

Validation: 12 desktop-pointer/keyboard checks and 3 emulated-touch checks passed. Checks cover continuous/reverse dragging, release, bounds, quick presets, clock-digit dragging, audio-node scheduling, subject fill and overflow. Audio scheduling was verified in Chrome; physical speaker output was not measured.
