# Parents App — UX Review and Screen Design Specification

Review date: 14 November 2026 · Reference: approved Parents Home · Status: design report, not an implementation

## 1. Decision

Home is the visual reference and is locked by the latest user instruction. Preserve its school photograph, compact white child card, cool background, neutral fees row and content order. Do not redesign Home during the next phase.

Baseline discrepancy: the previously approved clean preview used a single navy outline shortcut strip. The running Home captured during this review again contains illustrated quick tiles, and a fresh source read confirms those tiles. Both references are preserved as `approved-clean-reference.png` and `home.png`. Concurrent edits changed this detail. This report does not silently replace the latest live Home or claim its tiles are already outline icons. Freeze the chosen Home snapshot before implementation; the colour, typography and task-layout recommendations below remain applicable to the other sections.

The next investment should be consistency and trustworthy task completion: one type system, one action colour, reliable child context, readable information and truthful states. Giving each section a different theme will weaken the app's identity.

Recommended character: a calm school service for adults. Warmth comes from the real school, real teachers, familiar language and considerate feedback. It does not require mascots, decorative motion or invented academic claims.

## 2. What was actually reviewed

The running app at localhost:3100 was inspected in an isolated Chromium profile. Screens were rendered from the current source using the project's existing demo fixtures; production accounts, messages, OTPs and payments were not used. The Home approval is from the user; the review did not infer it from a design trend.

Evidence folder: `evidence/`. Route text, widths, headings and image-load observations are preserved in `inventory.json` and `additional.json`.

- 28 initial route captures at 390 × 1000, including timetable/result substates.
- Additional captures cover the actual login, a valid teacher conversation, another child's leave history, Hindi at 360px and Home at 1440px.
- Source review includes page components, shared shell, typography/colour configuration, child switching, payment states, live-bus freshness and assistant loading behaviour.
- The initial chat used an invalid fixture ID and showed an error. `chat-valid.png` replaces it for conversation design assessment.
- The first login capture redirected to onboarding. Use `login-actual.png` for the actual login.
- Meetings and meeting detail have no matching responses in the existing demo dispatcher. Their error captures are fixture limitations, not evidence that production meetings are broken. Their content/form recommendations below are source-based.
- The assigned-bus DOM capture was blank; its screenshot exposes a map runtime error involving a null latitude reference. A later source read already contains a null-bus guard. Reproduction against the current source is required; do not infer the production failure or its cause from this harness alone. The no-bus state was rendered; the active map/ETA branch was reviewed in source only. GPS accuracy, timing and tracking permissions remain unverified.
- No parent interviews, task-completion study, screen-reader certification, real-device keyboard audit or end-to-end payment verification took place. Recommendations are expert judgements informed by the cited research, not measured claims about these parents.
- Screenshots are first-viewport evidence. They are not complete proof of every below-fold state or every breakpoint. Demo school/name/photo combinations are fixtures and must not be treated as real school records.

## 3. What Home gets right

1. School context is immediately visible through the photograph and identity.
2. Selected child and today's attendance share one compact block. This reduces ambiguity about whose information is shown.
3. Four shortcuts keep visible labels. In the earlier approved clean reference they share one navy outline-icon language; the live capture has subsequently reverted to illustrations. This is a baseline discrepancy, not a reason to alter Home without resolving its snapshot.
4. The background separates the white child card from surrounding content without multiple decorative panels.
5. Fees payable remains visible through its label, amount and payment route, without an amber promotional callout.
6. Today, notices and events have a useful reading sequence. Missing records are not replaced by invented success messages.

Retain the 96px minimum child-card height and 8px vertical padding. Keep its 12px outside gutters; other Home content keeps 20px gutters. These are deliberate Home-specific decisions, not rules to copy into every row.

Home caveats to monitor without changing the approved composition: secondary text has limited contrast headroom; long Hindi labels need real-device review; text over a changed school photograph needs new contrast checks. A fixed dark overlay cannot guarantee contrast for every future photograph.

## 4. Psychology: useful principles, not colour folklore

| Principle | What it means in this app | Design consequence |
|---|---|---|
| Recognition over recall | A parent should recognise the child, section and next action without remembering where information was stored | Visible labels, stable navigation and a consistent child identity [S1] |
| Grouping and hierarchy | Related facts should look related; unrelated actions should not compete equally | One coherent bill, one homework entry per assignment, one group of account settings [S2] |
| Progressive disclosure | A quick answer and its full record serve different needs | Show due amount first; expose fee heads and receipts on detail. Give report summaries before the A4 document [S3] |
| Visibility of status | Waiting, saving, stale data and confirmed outcomes must be distinguishable | Explicit payment verification state, last bus update and per-message send failure [S4] |
| Recovery and control | Mistakes should be understandable and reversible where possible | Keep form input after errors, allow editing the mobile number, retry one failed message [S5] |

Navy is recommended because it already belongs to the approved school interface. This is a consistency decision, not a claim that blue universally creates trust. Colour effects depend on context and evidence has methodological limits [S6]. The exact palette below is a design recommendation, not a psychological law.

Avoid shame-driven messaging around fees, absence and grades. Use factual statements such as “Due 10 November”, “Not marked yet” and “School verification pending”. Absence is not the same as missing data, and a pending payment claim is not the same as a failed payment.

## 5. Colour specification and correction

### Shared roles

| Role | Proposed value | Use |
|---|---|---|
| App canvas | `#F7F9FC` | Background behind content groups |
| Content surface | `#FFFFFF` | Forms, bills, grouped rows, dialogs |
| Home upper tint | `#E8EFF7` | Preserve approved photograph transition |
| Home middle tint | `#F1F5F9` | Preserve approved gradient |
| Main text | `#242628` | Titles, values and body copy |
| Secondary text | `#666A6E` | Supporting text, with contrast verification |
| Primary action and selection | `#0D2A5E` | Main CTA, current tab, important links |
| Hover/pressed surface | `#EAF0F6` / `#EDF2F7` | Quiet feedback |
| Separator | `#DCE4ED` | Content separation; not sufficient alone for every input boundary |
| Input boundary | `#7D8998` where needed | Visible field/control boundary; test 3:1 against adjacent surfaces |
| Positive text / background | `#21613F` / `#EAF4EE` | Confirmed present, verified, paid |
| Error text / background | `#A32F35` / `#FCEEEF` | Failed action, verified overdue/absent status |
| Pending text / background | `#78552D` / `#F6F0E7` | Waiting for review, leave request pending |

Pending colour is allowed for a genuine status label. Do not restore the removed amber fee payable block. Merely owing money is not an error and does not justify colouring a whole page red or orange.

Use neutral initials backgrounds for people, with stable identity across screens. The current avatar palette includes green/orange even though its comment says the colours never overlap with statuses. Correct that contradiction in the shared component.

### Measured contrast

Calculated from explicit source hex values using WCAG relative luminance; rounded to two decimals. These are colour-pair calculations, not a complete rendered accessibility certification.

| Pair | Ratio | Assessment |
|---|---:|---|
| Home main text on darkest approved tint | 13.10:1 | Strong |
| Home secondary text on darkest approved tint | 4.70:1 | Passes normal-text AA; do not lighten further |
| Navy on white | 13.91:1 | Strong |
| Existing global ink-500 on white | 5.60:1 | Passes |
| Existing ink-400 on white | 3.09:1 | Fails normal-text AA when used for meaningful text |
| White on current fees orange `#EA580C` | 3.56:1 | Fails the current 16px bold button text |
| White on calendar green `#16A34A` | 3.30:1 | Fails the current 15px bold date text |
| Existing jade-700 on white | 4.44:1 | Below 4.5:1 for normal text |
| Existing teal button on white | 5.48:1 | Contrast passes; its separate brand role is the consistency issue |
| Proposed positive pair | 6.56:1 | Passes |
| Proposed error pair | 6.17:1 | Passes |
| Proposed pending pair | 5.91:1 | Passes |

WCAG asks for at least 4.5:1 for normal text and 3:1 for large text [S7]. Exempt/inactive decoration must not be confused with required information. Calendar future dates may be inactive, but weekday labels and actual dates/statuses still need deliberate treatment. Underlines, labels and shapes supplement colour [S8].

## 6. Typography, space and surfaces

Use the approved Home's Plus Jakarta Sans across app UI, with Noto Sans Devanagari for Hindi. Today Home overrides its font locally, while global configuration still uses Inter. Keep official report documents in their document typeface; a printed school record is a valid exception.

| Element | Target specification |
|---|---|
| Screen title | 20–22px, 600 weight, about 28px line height |
| Section title | 18px / 600 / 24px |
| Row title and form body | 15–16px / 500–600 / 22–24px |
| Supporting copy | 13–14px / 400–500 / 19–21px |
| Compact metadata | 12px minimum for non-primary information; preserve approved Home shortcut labels |
| Main financial figure | 28–30px / 650–700; tabular digits |
| Buttons | 15–16px / 600; minimum 48px height |
| Hindi paragraphs | 15–16px with roughly 1.5–1.6 line height; inspect conjuncts and vowel marks |

Default outside gutter: 20px. Inner grouped-surface padding: 16px. Major section gap: 24px. Related controls: 8–12px. Standard surface radius: 14px; button/input radius: 12px. Two-line rows should normally be 64–76px, but grow for wrapping and text resizing.

Choose a border or an actual elevation shadow according to function. Normal content groups need a fine border; dialogs and an elevated sticky action may use a soft shadow. Do not give every list row both a card shadow and another nested panel.

Internal screens use a quiet flat canvas; they do not all need the Home gradient or another hero. Keep Home's photograph special. Avoid converting every section into four equal icon cards.

## 7. Navigation and child context

Preserve the approved bottom tabs: Home, Calendar, Study, Fees, Profile. Keep their order, navy active indicator and visible labels. Do not reorganise these on the basis of assumed usage.

The sidebar is secondary navigation: School communication, Learning and records, Transport, Account. Keep existing destinations and redirects working. Use the same destination names in Home, sidebar, search and screen titles: “Transport” can be the shortcut and “School Bus” the explicit screen title, but do not create a second bus concept.

Use one internal header pattern: back/menu, meaningful title, child context if relevant. Current Calendar has an invisible title placeholder and a crowded collection of top controls. Replace that with a readable Calendar title and prioritised actions when that screen is implemented. Language can remain one tap away without occupying a two-button selector on every header.

Per-child fees, homework, results, bus and teacher threads need a readable child name/class, not only initials. After switching child, invalidate dependent content, reset selections and announce the new context. Do not retain a sibling's fee amount while the next record is loading.

Keep the floating owl out of payment, document-reading and form-completion flows. `profile.png` shows it obscuring the office-phone area, and other captures show it repeatedly despite unrelated tasks. Recommendation: a labelled School Sahayak entry in the shared menu/help area, with a restrained contextual help action where useful. Moving the owl around should not be required to read content.

The Study tab currently means a study timer, while homework and results are elsewhere. Preserve its current route for this rollout; make its heading “Study timer”. Test its value with parents before considering a broader Learning hub or changing bottom navigation.

## 8. Screen-by-screen specifications

Each specification states current evidence, intended hierarchy and acceptance criteria. Proposed states are not claims that those states were all rendered successfully.

### 8.1 Home — reference, no redesign

Evidence: `approved-clean-reference.png` records the previously approved clean strip; `home.png`, `home-hi-360.png`, `home-wide.png` record the later illustrated live state; `app/(app)/page.tsx`, `home.css`.

Preserve the approved composition. Use its palette, child-card proportions and restrained information hierarchy as the reference for shared components. For other task screens, use consistent labelled outline icons; the Home tile discrepancy is explicitly recorded in Section 1. Keep fees neutral and attendance attached to the selected child. No new counters, achievement badges or decorative copy.

Acceptance: names wrap without clipping; data dates remain correct for India; stale attendance never appears as today; a missing photograph/child photo has a respectful fallback; no horizontal page scroll.

### 8.2 Calendar / attendance

Evidence: `calendar.png`, `calendar-hi-360.png`; `app/(app)/calendar/page.tsx`.

Keep month navigation and the calendar grid, but replace the unrelated teal selection pill with the shared navy selection style. Use one month header with previous/next controls or a compact scroller; avoid giving months and the selected day separate competing indicators.

Current filled green dates have insufficient white-text contrast. Prefer dark dates on pale status backgrounds. Add a visible non-colour status cue (P/A/L/H with an explicit legend, or distinguishable marks with a date-detail list). Current aria-labels help screen-reader users, but do not supply sighted colour-deficient users with a visible alternative.

Show a compact monthly text summary and a short status list for exceptional days. Distinguish “Not marked” from Absent, holiday from future date, and Half day from Leave. Today's outline must remain recognisable independently of status.

Acceptance: keyboard-operable month controls; visible focus; translated month names; one accessible date/status per cell; readable school holidays; no invented attendance thresholds or alarming low-attendance labels without school rules.

### 8.3 Timetable

Evidence: `timetable.png`; timetable branch in `calendar/page.tsx`.

Keep the vertical timeline: it is more readable on a phone than a compressed timetable matrix. Hierarchy: day/date, start/end time, subject, teacher, room if supplied. The capture shows subject and teacher running together visually; use a real gap or put teacher on the next line.

Use a single navy marker for the current period, with the word “Now”. Keep breaks visibly different but legible. Empty and no-school days should say so. No colour per subject is needed here.

Acceptance: the displayed day and live-period calculation use the school's timezone; swipe/day selection preserves context; overnight/time-change edge cases do not mark the wrong period live.

### 8.4 Homework

Evidence: `homework.png`; `homework/page.tsx`.

Keep the useful diary structure. Group by Today, Yesterday and earlier dates; a subject filter is optional for a long list, not mandatory for a short one. Entry order: subject and assigned date; assignment title; due date; teacher-supplied instructions; attachments; checked status.

White entries on the shared canvas, 14px corners and quiet separators are enough. Replace orange/green badge text with accessible semantic text colours. A parent-facing action such as “Marked complete at home” must be distinguished from “Checked by teacher”; never imply one establishes the other.

Show attachments with file type, available size and a clear open/download action. Preserve the original language of teacher-entered homework. UI language switching should not silently pretend to translate school content.

Acceptance: long Hindi instructions expand; attachment failures can be retried; due dates are explicit; cached work has a saved-data notice; no automatic celebration for merely opening an assignment.

### 8.5 Study timer

Evidence: `study.png`; `study/page.tsx`.

Retain the timer and Pomodoro functions, with navy replacing teal as the main action colour. A progress ring is justified here because elapsed/remaining time is the task; it is not justified as decoration around every percentage elsewhere.

Order: subject, timer/mode, duration, primary start/pause control, finish action, local session history. Keep plus/minus and duration controls comfortably tappable. Put explanations of Pomodoro in brief expandable help.

The source stores sessions on this device. Label the history accordingly; it must not imply a teacher-verified study record or cloud backup. Replace default fireworks with a quiet “Session complete — 25 minutes” state; sound, vibration and celebration should be controllable.

Acceptance: pause/resume survives screen locking and route changes; reduced motion works; no loss of saved sessions on child switching; ending early does not claim the full duration was completed.

### 8.6 Fees overview

Evidence: `fees.png`; `fees/page.tsx`, `components/AppShell.tsx`.

Keep its good bill structure: payable amount, fee heads, due date, fine if applicable, next instalments, paid bills and receipts. Replace cream/orange theme with shared canvas, white bill and navy primary action. This is a visual system correction, not a change to fee calculations.

Use “Due 10 July” and factual overdue text rather than making “127 days late” compete with the bill title. A small overdue status can be red when the backend actually identifies overdue. Fees pending verification should sit above the pay action so parents understand the outstanding balance may still be reconciling.

One action dock should show the amount being paid and “Pay ₹…”. Do not duplicate large totals across two simultaneous callouts without an information reason. Hide the floating assistant on this flow.

Acceptance: bill headings wrap; concessions/fines are separately explained; due-now and full-session amounts never swap labels; sticky dock clears bottom navigation and keyboard; receipt number has a copy/share path.

### 8.7 Fee detail and receipts

Evidence: `fee-detail.png`; `fees/detail/page.tsx`.

Use a white itemised document with an instalment title, due/paid state, fee heads, concession, fine, total, transactions and receipt actions. Neutral rows should be easy to compare. Preserve tabular digits and aligned amounts.

A verified receipt needs receipt number, amount, date, mode and the school identity. Share/download should name what is being shared; a text share is not a full receipt PDF. A part-payment must show paid and remaining amounts separately.

Acceptance: paid instalments do not retain a Pay CTA; a rejected claim offers a reason and correction path; long reference numbers wrap/copy cleanly.

### 8.8 Payment and manual verification

Evidence: `pay.png`; `fees/pay/page.tsx` and `lib/text/fees.ts`.

The source opens a UPI app and then collects a UTR for school verification. It is not a gateway-confirmed payment-success flow. Build the UI around that truth.

Steps: (1) choose amount and confirm child/payee, (2) open the selected UPI app, (3) return and report transaction reference if paid, (4) school verification pending, (5) verified receipt or rejected reference. Opening UPI must never by itself produce “Paid”.

Use one selected-amount summary with child, school/payee, amount and relevant instalment. Identify the external handoff with “Open UPI app”. After return, ask “Did the payment complete?”; retain a route for cancellation/failure. “Pay again in app” is currently prominent on the UTR step; make repeat payment a deliberate secondary recovery action to reduce accidental duplicate payment.

Keep the existing truthful school-checking message, but make the state title explicit: “Payment details submitted — school verification pending”. Green success styling is reserved for verified payment. A bank/gateway callback should only change this if the backend actually gains that capability.

Acceptance: input survives cancellation; processing blocks duplicate submission; a timeout offers reconciliation/retry rather than another blind Pay CTA; errors preserve the reference; amount and payee are visible before leaving; no assistant overlay or competing notification chrome.

### 8.9 Exams: schedule

Evidence: `exam.png`; schedule branch in `exam/page.tsx`.

Use a two-tab navy Schedule/Results control. Show the next exam name and date range, then date-grouped paper rows. Each paper prioritises date/day, subject, start/end time, then syllabus. Room/bring instructions appear only when supplied.

Expand syllabus text rather than cramming it into the subject title. Include “Not published yet” instead of a skeleton that can persist indefinitely when no schedule exists.

Acceptance: dates and times remain readable in Hindi; cancelled/updated papers have explicit status; no fictional countdown or urgency badges.

### 8.10 Results overview and subject detail

Evidence: `results.png`, `result-detail.png`; `exam/page.tsx`, `exam/detail/page.tsx`, `lib/exam.ts`.

The existing overview uses multiple saturated subject colours and repeated percentage rings. Replace its primary presentation with an exam summary and readable subject rows: subject, marks/out-of, grade and published remark. A navy horizontal chart may be available when a comparison question actually benefits from it.

Four colours for four subjects do not communicate an academic status. Grade, pass/fail and incomplete marks should be written explicitly and use school rules. Rank is secondary; put it behind details if the school publishes it. Do not add motivational diagnoses such as “weak student” from a percentage.

Acceptance: absent, not entered, not published and zero are distinct; compare only compatible exams/maxima; no synthetic growth trend; teacher remarks retain their original meaning.

### 8.11 Official report card

Evidence: `report-card.png`; `report-card/page.tsx`, `components/report/ReportSheets.tsx`.

Preserve the school's official A4 record and typography. Surround it with normal app controls, not a redesigned decorative report. Above it show a readable exam selector and a short marks/grade summary; the scaled A4 sheet is too small to be the only reading surface.

Keep explicit Front/Back actions alongside a zoom/open-document affordance. “Tap to see the back” is secondary help, not the only discoverable action. Download/share must say whether it produces a file or opens the browser's print-to-PDF flow; the current source uses printing, which needs actual mobile-browser verification.

Acceptance: both sides print correctly; page edges are not clipped; signatures and official fields are preserved; no sample school marks reach production output.

### 8.12 Teacher list and conversation

Evidence: `teachers.png`, `chat-valid.png`; `teachers/page.tsx`, `teachers/chat/page.tsx`.

The teacher list is already structurally sound: class teacher first, then subject teachers, last message and unread count. Bring it to the shared 14px radii, font and neutral avatar palette; remove unnecessary border-plus-shadow layering. Keep teacher names and subject labels readable.

Chat: teacher identity and selected-child context at top; chronological messages; day separators; clear time and actual send states; a keyboard-safe composer. Sent, delivered and read must reflect backend facts. Failed messages should retry individually without losing the draft. Do not invent “online” presence.

Meeting requests belong as compact actionable conversation items, not promotional banners. A request waiting for the teacher is not a confirmed appointment.

Acceptance: a new reply does not force-scroll a parent who is reading older messages; unread information remains visible; switching child clears the old conversation; retry cannot duplicate a message.

### 8.13 Notices

Evidence: `notice.png`; `notice/page.tsx`.

Use a readable notice list: title, published date, school/class scope when supplied, two-line excerpt, Read more. Expanded text needs 15–16px body type, comfortable Hindi line spacing and attachments below the text.

The existing Read-more decision uses a character-count threshold while the excerpt uses a two-line clamp. Those are different measures: test shorter Hindi/long-word content that exceeds two visible lines but not the threshold. Expansion should follow actual truncation or always be available for a detail view.

Read status is only meaningful if implemented. Urgent/pinned flags require school-entered metadata. Do not mark every announcement urgent because it is recent.

Acceptance: complete body is reachable; no text is silently hidden; no fabricated translated notice; dates and pagination remain stable after loading older items.

### 8.14 Events and albums

Evidence: `events.png`, `album.png`; `events/page.tsx`, `events/album/page.tsx`.

Real school photos are appropriate here. Separate Upcoming events from Past albums. Upcoming items should prioritise date, location/time and relevant action; past albums can use a photo grid. A two-column gallery is legitimate for photographs, not a template for every app page.

Never substitute a stock event photo as evidence that an event happened. Missing photos get a neutral placeholder and the actual title/date. Preserve image aspect ratios and useful faces; avoid decorative AI imagery masquerading as the school.

Acceptance: photo loading has a stable placeholder; unavailable media can recover; full-screen viewer has labelled close/previous/next, focus management and a visible position count; event details remain readable without opening a photo.

### 8.15 School bus / transport

Evidence: `bus.png` covers not-enrolled. Active route/map recommendations are source-based; `bus-assigned.png` contains a runtime-error overlay in this harness, not a populated map assessment; the later source has a null-bus guard, so reproduction is required.

No-bus state: concise explanation and Call school office. Assigned state: route/vehicle, the child's stop, scheduled pickup and driver contact. Live-trip state: actual freshness indicator, bus location, approximate ETA and stop sequence. Use the map to support those facts, not dominate a first screen before the parent sees their stop.

The source already treats a position older than two minutes as quiet; preserve that distinction. Label the exact last update. An ETA derived from distance/speed must be described as approximate. GPS proximity alone is not evidence that the child boarded or arrived.

Acceptance: stale/offline, not running, location unavailable, route assigned and no bus are distinct; phone links are comfortably tappable; no fabricated pulsing “live” badge; the map never hides the freshness warning.

### 8.16 Leave list and application

Evidence: `leave.png`, `leave-history.png`, `leave-apply.png`; `leave/page.tsx`, `leave/apply/page.tsx`.

The empty state and application structure are useful. Use the shared canvas and navy Apply action. List each request with dates, type, full/half day, written status and decision note. Pending, approved, rejected and cancelled must not share one success appearance.

Form order: selected child, leave type, from/to dates, full/half day, reason, review/submit. Date errors belong beside the fields. Show a human-readable duration before submission. A pending submission should say “Request sent to the class teacher”, not “Leave granted”.

Acceptance: invalid ranges cannot submit; half-day constraints are clear; rejection includes the actual reason when supplied; cancellation is available only when policy/backend permits; form input persists after network failure.

### 8.17 Meetings / PTM

Evidence: page and detail source reviewed. Existing fixture API returns errors, so populated meetings UI was not visually validated.

List: Upcoming/Past, meeting title, teacher, child, date/time/place and confirmed/pending status. Detail: meeting purpose, location/link, available slots, selected slot and one confirm action. Use a selectable slot list with clear availability; a slot is not confirmed until the server accepts it.

Preserve current conflict handling for a 409 response: refresh availability and let the parent choose again. The exact meeting timezone should be explicit; source currently mixes UTC date extraction with local date/time construction, so India-date boundaries need testing.

Acceptance: rescheduling and cancellation follow policy; unavailable slots cannot appear selected; online Join is only active when allowed and explains why otherwise; the appointment remains identifiable after a network retry.

### 8.18 Profile, correction requests and ID card

Evidence: `profile.png`, `id-card.png`; `profile/page.tsx`, `id-card/page.tsx`, `components/more/IdCard.tsx`.

Keep grouped rows: selected child; child details; account/settings; help. Use the same avatar/child identity as Home. Avoid uppercase headings as a universal style; sentence case reads more naturally across scripts.

Preserve “Ask school to update” as a request, not an editable official record that silently changes school data. Show pending/sent state and allow the parent to review their submitted text. Language has one consistent setting; school-entered names remain unchanged.

The ID card is an official document: retain school formatting and required details, with a zoom/readable-fields route. Do not add a QR code that encodes data or powers a workflow the school never supplied. Keep sign out separate from normal navigation, with clear consequence and recovery.

Acceptance: school phone is never obscured by the assistant; long addresses wrap; sensitive identifiers are not exposed in unnecessary previews; selected child remains obvious on shared devices.

### 8.19 Search

Evidence: `search.png`; `search/page.tsx`, `components/QuickIcons.tsx`, `globals.css`.

The current rainbow glow, animated placeholder and orange shortcut art conflict with the final Home. Use a normal search field with a static hint: “Search homework, notices or sections”. Show a small set of labelled outline quick links before typing; grouped results after typing.

Keep “Ask School Sahayak” as a separate, clearly labelled action for an open-ended question. Typing in search should not unpredictably change the task to AI chat. Prioritise a relevant result, not promotional “New for you” content that pushes search down.

Acceptance: empty/no-match/loading/error states differ; typed queries persist on return; exact supported search scope is stated; no typewriter animation competes with input; voice input has visible listening/stop states and a keyboard fallback.

### 8.20 School Sahayak

Evidence: `assistant.png`; `assistant/page.tsx`, `SahayakOwl.tsx`, `SahayakThinking.tsx`, `SahayakButton.tsx`.

Replace the separate purple/pink world, floating circles, glass composer and oversized owl with the shared navy/light UI. Use a clear title, selected-child context, a brief explanation of supported school questions and a few plain suggestion buttons. Keep the input usable immediately. This recommendation extends the user's no-cartoon direction across the app; it is not a universal claim that mascots are unusable.

Important trust correction: `stepsFor()` creates topic-based steps, and `SahayakThinking.tsx` reveals them on a 1300ms timer. They are not server-reported progress. Replace these with “Fetching school information…” until genuine progress events exist. Do not label an elapsed request duration as a verified account of the assistant's reasoning.

Answers should link to the relevant fee, attendance, homework or notice record and disclose data freshness. A missing record must produce “No record is available” rather than an invented answer. Keep factual server-backed data separate from generated explanation. Teacher chat and School Sahayak must be visually and verbally distinct.

Acceptance: no live fake checking steps; failed requests preserve the question; no unsupported account changes; sensitive actions still use their actual confirmation flow; voice errors have readable feedback; child changes reset conversation context.

### 8.21 Login and onboarding

Evidence: `login-actual.png`, `onboarding.png`; `login/page.tsx`, `onboarding/page.tsx`.

Login already has the right essentials: school identity, registered mobile, language access and OTP. Bring typography/actions into the shared system. Retain explicit instructions to use the number given to school, change-number action and resend countdown. Support OTP paste/autofill. Preserve an accessible path when the number is unrecognised or the phone cannot receive the code.

Onboarding should be brief and skippable. Its bus art and arrival headline currently accompany a statement about classroom attendance; classroom attendance does not prove physical arrival. Replace that promise with accurate attendance wording, and only describe bus tracking where supported.

Use a real school photograph or restrained outline treatment, not another illustrated product personality. Do not promise same-day result publication unless the school actually guarantees it.

Acceptance: no repeated onboarding after completion; network/OTP errors preserve the mobile number; no artificial success claims; dynamic screen-reader announcements and correct keyboard/autocomplete attributes.

## 9. Shared interaction and state contract

Every data section needs: first-load skeleton, loaded content, true empty state, recoverable error, saved/stale data state and session-expired recovery. Every mutation needs: ready, submitting, accepted/pending, final success or failed, with duplicate prevention where applicable.

Every form needs visible labels, inline errors, preserved input and an explicit primary action. Never use a placeholder as the only label. Important status feedback should be programmatically announced without forcibly moving focus [S9].

Use 48px primary controls and 44 × 44px as the preferred minimum touch area. WCAG 2.2 AA's minimum is 24 × 24 CSS pixels with exceptions; the product's more comfortable target is intentionally larger, not a misquotation of WCAG [S10]. Existing 28–40px language/profile/meeting controls need particular attention. Include target spacing, not just icon size.

For dialogs/sheets: labelled title, correct modal semantics, initial focus, focus trap, Escape/back dismissal where appropriate and focus restoration. SideMenu already contains focus-management work; ChildSheet's inspected source handles Escape and scroll lock but lacks the same explicit focus cycle. Reuse the stronger shared pattern.

For navigation: preserve scroll position on return to a list; preserve filters where appropriate; keep direction-aware back transitions; respect reduced motion. Existing page motion is purposeful. Decorative glow, repeated bell animation, bouncing mascots and staged typewriter answers are not required for normal operations.

Allow text resizing and browser zoom. Test 200% zoom and 320 CSS-pixel reflow. Check real Android keyboard/safe area for chat, payment and leave forms. Current PWA viewport permits zoom; preserve that.

For dates, use the school's Asia/Kolkata context consistently for today, due date, meeting windows and attendance. The review found source-level mixtures of UTC and browser-local calculations; do not present a screenshot test as proof those boundaries are correct.

## 10. Professional finish: explicit anti-template rules

- One shared font family for app UI; one action colour; status colours reserved for status.
- Outline icons from one library, consistent stroke and size, with labels where meaning is not universal [S11].
- Real school photographs belong in Home/events and actual records, not every task page.
- No generic inspirational slogans, fake counts, synthetic attendance/grade claims, invented testimonials or fabricated urgency.
- No glowing AI search field, decorative mesh blobs, glass cards or a different section palette to imply sophistication.
- No four-tile dashboard repeated across screens that are fundamentally a bill, diary, form, record or conversation.
- No visible “checking your data” sequence driven only by a timer.
- No repeated ornamental progress rings. Retain a time-progress ring only where it conveys the timer's actual remaining time.
- No silent truncation of names, amounts or official notice content.
- No motion that delays the next action; no decorative animation as a substitute for a loading/error state.
- Preserve honest product constraints: local-only study history, manual payment verification, missing GPS and unpublished results.

These rules aim at a coherent service. “Not AI slop” cannot be certified by a font detector; it is demonstrated by truthful content, consistent interaction and specific task decisions.

## 11. Implementation sequence

| Priority | Work | Why first | Done when |
|---|---|---|---|
| P0 | Freeze the Home baseline, reproduce the bus-map error, correct colour contrast, truthful payment states, honest assistant progress, unobscured critical controls | Readability and trust | Actual states meet the requirements above; no payment/phone control is covered |
| P1 | Shared font/tokens, header, action button, status label, avatar, list/group surfaces | Stops visual drift across the whole app | A shared-component update produces consistent screens without per-page theme patches |
| P1 | Fees/payment/detail and attendance/timetable | Financial and time-sensitive information | Narrow-phone, keyboard and colour-independent state checks pass |
| P1 | Homework, notices, teacher chat and child switching | Daily reading and communication | Full content is reachable; drafts/context survive errors and navigation |
| P2 | Results/report card, profile/ID, meetings/leave | Records and managed workflows | Official documents remain intact and request/confirmed states are explicit |
| P2 | Transport and live freshness | Needs actual assigned-route/device data to validate | Real-trip stale/no-signal conditions are tested without inventing arrival certainty |
| P2 | Search, assistant, onboarding and timer visual alignment | Eliminates remaining competing visual identities | Shared navy UI; no cartoon/glow presentation or unsupported promises |

Build in small route groups. Start each group with a rendered proposal grounded in the approved Home, then implement, test its states and compare against Home. Do not ship an app-wide find-and-replace of colours.

Suggested shared pieces: AppPage, ChildContext, SectionHeader, GroupedList, StatusLabel, PrimaryAction, ActionDock, Field, EmptyState, InlineError and DocumentToolbar. These are proposed abstractions, not claims that equivalent functionality does not already exist. Consolidate existing `ui.tsx`/CSS patterns first.

## 12. Verification and real-parent study

### Required release checks

- 360 × 740, 390 × 844 and 430 × 932; one short-height landscape check; wide-screen centred app at 1440px.
- English and Hindi; long child/teacher/school names; long amounts, receipt numbers and addresses.
- Keyboard open on payment, leave and chat; sticky actions and bottom tabs do not overlap.
- Keyboard/focus review, screen-reader sample, 200% zoom, 320px reflow and reduced-motion behaviour.
- Correct first load, empty, delayed, offline cache, session expiry and recoverable error states.
- Date boundaries around midnight India time, month/session changes and future/unmarked attendance.
- Real payment handoff/cancellation/verification; real Android print/download; one real bus trip with a stale position.
- Before/after screenshots for every changed route; no fabricated data in production screenshots or document exports.

### Parent research plan — proposed, not performed

Recruit a small varied first round of 5–8 parents, including Hindi-first readers, families with two children and people using smaller/older Android phones. This is a qualitative discovery round, not a statistically representative sample. Do not infer education or technical skill from age or language.

Ask them to: identify today's attendance for the right child; find tomorrow's homework; understand/pay the intended fee and explain verification status; find a teacher reply; submit a two-day leave request; locate an event/notice; explain a stale bus update. Observe without coaching.

Record correct-child completion, wrong turns, backtracks, requests for help and interpretation of each state. Specifically ask whether “payment pending verification” means the money must be paid again. Record initial timings as a baseline rather than inventing a target improvement. Revise the design based on repeated observed failures, not only which colour users say they like.

## 13. Evidence map and limitations

| Group | Evidence |
|---|---|
| Home references | approved-clean-reference (earlier approval); home, home-hi-360, home-wide (later live state) |
| Attendance and timetable | calendar, calendar-hi-360, timetable |
| Finance | fees, fees-hi-360, fee-detail, pay |
| Learning and records | homework, study, exam, results, result-detail, report-card |
| Communication | teachers, chat-valid, notice, meetings*, meeting-detail* |
| Account and services | profile, id-card, leave, leave-history, leave-apply, bus, bus-assigned* |
| Discovery and entry | search, assistant, login-actual, onboarding |

An asterisk means a fixture/renderer limitation; see Section 2. Preserve the failed/redirected captures as audit evidence, but do not use them to fabricate a populated-state visual assessment. Legacy `/more/*` and `/attendance` routes are redirect wrappers, not extra independently designed sections. Motion-test is a development route, not a parent workflow.

The app's current source is being worked on concurrently. This report is a dated snapshot; line numbers and screenshots may drift as other work is saved. No app source, data records or Git history were changed for this review.

## 14. Sources

Research informs the principles; the screen layouts, token choices and priorities in this report are design recommendations for this app.

- [S1: NN/g — Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/)
- [S2: NN/g — Five Principles of Visual Design](https://www.nngroup.com/articles/principles-visual-design/)
- [S3: NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [S4: NN/g — Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)
- [S5: NN/g — Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [S6: Elliot, Frontiers in Psychology — Color and psychological functioning: a review](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00368/full)
- [S7: W3C — Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [S8: W3C — Understanding Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [S9: W3C — Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [S10: W3C — Understanding Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [S11: NN/g — Icon Usability](https://www.nngroup.com/articles/icon-usability/)
- [S12: Apple — UI Design Dos and Don'ts](https://developer.apple.com/design/tips/)
- [S13: Material Design — Color roles](https://m3.material.io/styles/color/roles)

Primary local references: `HOME_DESIGN.md`, `app/(app)/page.tsx`, `app/(app)/home.css`, `components/AppShell.tsx`, `tailwind.config.ts`, `app/globals.css`, `components/ui.tsx`, `lib/api.ts`, `lib/parent.tsx`, and the page/component sources named above. The approved Home takes precedence over older comments describing obsolete app styles.
