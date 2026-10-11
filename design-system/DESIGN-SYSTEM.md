# Zyvara — Product & Design System 1.0

Zyvara helps people document environmental action and build sustainable habits together. Domain: zyvara.us. This design study uses an original field-journal direction: warm paper, botanical color, confident editorial headings, clear requirements, and considerate feedback.

## Deliverables

- Paper file: https://app.paper.design/file/01M4MV3FTCQ38BK631JD95P74W
- Six native artboards: Brand & Foundations, Components & Controls, Discover, Challenge Details, Create Challenge, Submit Evidence.
- Local interactive preview: index.html, with twelve views and desktop/mobile modes.
- Shared source: tokens.css (75 tokens), system.css, prototype.js.

Paper reached its weekly connector limit during creation. Assessment, Community, Progress, Sign-in, Feedback & Recovery, and responsive variants are supplied in the local preview; they still need to be transferred into native Paper artboards when connector access returns.

## Foundations

| Role | Value |
|---|---|
| Canvas | #F7F8F2 |
| Surface | #FFFFFF |
| Ink | #172E25 |
| Primary forest | #245C42 |
| Young leaf | #DCEAA5 |
| Muted text | #59675F |
| Border | #DCE2D8 |
| Heading font | Manrope |
| Interface font | Inter |

Use ink on light surfaces and warm white on dark forest. Leaf is an accent surface with dark text. Semantic success, warning, error, information, and focus colors are separate tokens. Never rely on color alone to communicate a result.

Body: 16/24. Metadata: 14/20. Desktop hero: 56/64; mobile headline: 36/42. Maintain one page heading and clear section hierarchy. Keep long paragraphs readable instead of stretching them across the page.

Desktop pages use 64px gutters, three discovery columns and a content/sidebar composition. Tablet reduces gutters to 24–40px and stacks sidebars. Mobile uses 20px gutters, one column, stacked upload fields and four-item bottom navigation. Use 44px minimum interactive targets, visible focus, and reduced-motion support.

## Components and behavior

Buttons include primary, secondary, quiet, destructive, loading and disabled variants. Loading retains its label; prevent duplicate submissions. Show hover, pressed and focus states. Destructive actions require a confirmation dialog with explicit consequences.

Fields always have persistent labels. Show requirements before submission; place errors next to the field and associate them programmatically. Keep input after failures and focus the first invalid field. Optional values must be clearly labelled. Categories are selected by the creator; AI does not generate or classify challenges.

Challenge cards expose category, title, activity context, creator, deadline and recognition. Category filters and search share an empty state with a reset action. The prototype’s cards illustrate one core cleanup journey; sample statistics are labelled and do not represent live activity.

Evidence requires one result photo; a before photo is optional. Accept JPEG, PNG or WebP, up to 10MB per photo. Give inline type/size errors and preserve description and valid attachments. Explain avoiding identifiable people or private information before selection. Community sharing defaults off.

AI outcomes are distinct: **supported**, **needs more evidence**, **not supported**. Each explains the visible evidence and the next action. Photographs cannot independently prove a real-world activity. Confidence describes an assessment, not certainty about behavior. Do not use verified badges or invented environmental savings.

The preview proposes 50 points once per supported contribution. This is a design assumption, not an agreed business rule. Production rewards must be issued by the server with duplicate protection. AI failures award no points and provide retry; insufficient evidence offers a clearer-photo recovery path.

Community cards show action context and consented content. Likes, comments and sharing in this prototype are local demonstrations. Personal progress distinguishes participation and supported contributions; avoid estimating carbon or waste without a defensible measurement method.

Dialogs trap focus, close with Escape, and return focus to the trigger. Notifications supplement persistent feedback. Loading, empty, failed-upload and assessment-retry examples are available in Feedback & Recovery.

## Implementation handoff

Use tokens.css as the source of shared values. All eleven namespaces are supplied: color, spacing, breakpoint, container, font, font weight, text, leading, tracking, radius, opacity. Translate these into the application’s theme without changing semantic roles.

Recommended component boundaries: AppShell, ChallengeCard, CategoryFilter, Field, PhotoInput, EvidenceForm, AssessmentSummary, OutcomeBadge, ContributionCard, ProgressMetric, ConfirmDialog and Toast. Use semantic HTML and accessible form controls.

Core journey: Discover → Details → Evidence → Assessment → Progress. Creator journey: Create → confirmation → published detail. Backend integration must cover authentication, authorization, durable file storage, assessment jobs, moderation, reward idempotency and consented publication. This preview has no connected authentication, Gemini, storage or publishing service. Local photo selections remain in memory; no upload occurs. Refresh clears session data. Google Fonts loads externally, with system-font fallbacks.

## Reference study

- [Waste Bank Community App](https://dribbble.com/shots/26853352-Waste-Bank-Community-App): readable participation hierarchy and community metrics.
- [E-Larder](https://dribbble.com/shots/27640793-E-Larder-Community-Food-Sharing-Food-Rescue-App): practical local actions and social trust.
- [Sunrise Plant](https://dribbble.com/shots/26511262-Sunrise-Plant-Tree-Planting-Website-Design): optimistic mission-led storytelling and clear actions.

These informed principles. Zyvara’s mark, vector illustrations, layouts and visual language were authored for this project.

## Opening the preview

Open index.html in a browser, or serve this directory locally. Select a screen in the study toolbar; use Desktop/Mobile to inspect responsive variants. The open development preview is http://127.0.0.1:4174 while its local server is running.
