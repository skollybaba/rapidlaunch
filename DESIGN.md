# Rapid Launch Learning Resources Design System

- **Document status:** Initial product-design specification
- **Version:** 1.0
- **Product type:** Educational content and video-resource website
- **Primary audience:** Beginners and early-stage builders learning AI agents, vibecoding, databases, and related software concepts
- **Primary conversion:** Watch a useful YouTube resource and continue learning
- **Design direction:** Modern, intelligent, generous, editorial, approachable, and highly polished
- **Reference influences:** Bartix for expressive product storytelling, Ordina for smooth forms and interface neatness, Artifact for premium whitespace and product proof, OMA Akari for AI atmosphere, and Verseo for clear AI-product communication and structured use-case storytelling
- **Implementation principle:** Use Material Design principles where they improve clarity, accessibility, interaction quality, and consistency, while preserving a distinctive Rapid Launch visual identity rather than producing a generic Material interface

## Product North Star

- The website should make learning modern software concepts feel less intimidating and more achievable.
- The website should communicate that the visitor can understand practical technology topics without needing to become an expert first.
- Every major page should answer three questions quickly: what is this, who is it for, and what should I watch or do next.
- The experience should feel like a calm, well-designed learning companion rather than a dense documentation portal.
- The interface should create enough visual richness to feel alive and trustworthy without overwhelming a beginner.
- The design should combine the authority of a financial-product interface with the warmth and curiosity of an educational media platform.
- The visual system must support both short introductory videos and deeper resource collections as the library grows.

## Experience Principles

- **Make the first step obvious:** Place one primary learning action in every meaningful content context.
- **Explain before optimizing:** Prefer familiar language and short explanations over technical shorthand.
- **Show the mental model:** Use illustrations, diagrams, UI previews, and examples to make abstract concepts visible.
- **Reward curiosity:** Use related resources, guided next steps, and topic pathways to encourage continued learning.
- **Create calm confidence:** Use deliberate spacing, predictable motion, and clear states so the visitor never feels lost.
- **Design for returning visitors:** Make it easy to find recently added, popular, saved, or unfinished resources.
- **Respect attention:** Avoid autoplay video, noisy animation, deceptive urgency, or excessive popups.
- **Make technology human:** Use practical examples, friendly editorial copy, and illustrations that show real people building real things.

## Brand Personality

- Rapid Launch Learning Resources should sound like a knowledgeable mentor who explains difficult things clearly.
- The voice should be confident without sounding superior.
- The voice should be concise without becoming cold.
- The voice should be curious, practical, and encouraging.
- The interface should never use jargon as a substitute for explanation.
- Use “Start here,” “Watch the explanation,” “See an example,” and “Try it yourself” more often than abstract calls to action.
- Avoid “revolutionary,” “game-changing,” “seamless,” and other inflated product language unless a specific claim is substantiated.

## Information Architecture

- **Home:** Introduces the learning proposition, highlights core topics, presents featured videos, and guides new visitors into a learning path.
- **Learn:** Provides the complete topic library with filtering, search, difficulty, format, and estimated watch time.
- **Topics:** Groups resources into conceptual collections such as AI agents, vibecoding, databases, APIs, authentication, deployment, and product building.
- **Resources:** Provides a broader content index for videos, explainers, diagrams, checklists, and recommended external links.
- **Video detail:** Presents a selected resource, its summary, key takeaways, topic labels, transcript or outline when available, and related content.
- **About:** Explains the creator’s motivation, teaching approach, and the intended audience.
- **Newsletter or updates:** Allows visitors to receive new-resource announcements, with clear consent and easy unsubscribe language.
- **Search:** Supports natural-language queries such as “What is an agent?” or “How do databases store information?”
- **Optional future routes:** `/learn/ai-agents`, `/learn/vibecoding`, `/learn/databases`, `/watch/[slug]`, `/about`, `/contact`, and `/newsletter`.

## Homepage Strategy

- The homepage must not feel scanty or like a placeholder landing page.
- The homepage should feel complete on first visit, with a strong hero, visible topic pathways, featured resources, practical learning benefits, and a clear continuation path.
- Use the following recommended section order:

| Section | Purpose | Required content |
|---|---|---|
| Announcement bar | Communicate new content or a current learning series | Short message, optional link, dismiss behavior if persistent |
| Header | Establish navigation and primary action | Logo, Learn, Topics, Resources, About, search, primary CTA |
| Hero | Explain the product in one glance | Eyebrow, headline, supporting copy, primary watch/learn CTA, visual illustration or video-card composition |
| Topic navigator | Give visitors immediate entry points | Topic cards for AI agents, vibecoding, databases, APIs, and deployment |
| Featured resource | Promote the best first watch | Thumbnail, title, duration, difficulty, summary, Watch on YouTube action |
| Learning pathway | Reduce uncertainty for beginners | Ordered steps such as Understand, See, Build, Continue |
| Resource library preview | Demonstrate content depth | A balanced grid of recent, popular, and foundational resources |
| Concept visual | Make abstract learning feel tangible | Illustration or diagram showing a simple workflow from idea to working product |
| Why this exists | Build trust and personal connection | Short creator statement, teaching principles, optional portrait or workspace image |
| FAQ | Resolve beginner concerns | Accordion questions about prerequisites, tools, pace, and difficulty |
| Newsletter | Encourage return visits | Email field, consent copy, clear value proposition |
| Footer | Provide complete navigation and trust information | Topic links, legal links, social/video links, contact, copyright |

- The hero should use a balanced composition rather than a centered block floating in empty space.
- Recommended desktop hero structure is a 5-column text area beside a 7-column visual area.
- Recommended mobile hero structure is a text-first block followed by a full-width visual card.
- The visual area may include an editorial illustration, a layered YouTube resource card, or a stylized interface showing a concept map.
- The homepage should use a deliberate rhythm of dense and quiet sections so it feels substantial without becoming crowded.
- Use a major visual or content anchor approximately every 1.5–2 viewport heights.
- Avoid presenting more than four primary choices in a single local section.
- Use section labels and short eyebrow text to make long-page scanning easier.

## Homepage Hero Content Direction

- Recommended eyebrow: `LEARN THE BUILDING BLOCKS`.
- Recommended headline direction: `Understand the ideas behind the tools you use to build.`
- Alternative headline direction: `Build with AI confidently, one clear concept at a time.`
- Supporting copy should explain that the site contains short, practical videos for beginners learning modern software concepts.
- Recommended primary CTA: `Start learning`.
- Recommended secondary CTA: `Watch the latest video`.
- The primary CTA should lead to the beginner pathway or the first recommended resource.
- The secondary CTA should open a YouTube resource in a new tab with a visible external-link treatment.
- Do not make the user understand the creator’s full story before offering a useful resource.

## Core Learning Topics

- **What is an AI agent?** Explain the difference between a chatbot, a workflow, an automation, and an agent.
- **What does vibecoding mean?** Explain building software through natural-language collaboration with AI while still understanding, testing, and reviewing the result.
- **What is a database?** Explain how applications store, organize, retrieve, and update information.
- **What is an API?** Explain how different software systems communicate through structured requests and responses.
- **What is authentication?** Explain how a system knows who a user is and what that user is allowed to access.
- **What is deployment?** Explain how code moves from a local development environment to a live product.
- **What is a frontend and backend?** Explain the visible interface, the server-side logic, and how they work together.
- **What is a webhook?** Explain event-driven communication between systems using a practical example.
- **What is a prompt?** Explain how instructions, context, constraints, and examples influence AI output.
- **How do I choose a tool?** Explain how to compare tools by the job they perform rather than by hype.

## Content Model

- Every video resource should have a stable slug, title, summary, YouTube URL, thumbnail, duration, topic, difficulty, publication date, and related-resource list.
- Optional metadata should include transcript, chapters, key takeaways, prerequisites, tools mentioned, creator notes, and estimated learning time.
- Use the following resource object shape as the default content model:

```ts
type Resource = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription?: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  topic: TopicSlug;
  secondaryTopics?: TopicSlug[];
  difficulty: "beginner" | "intermediate" | "advanced";
  format: "video" | "guide" | "diagram" | "checklist";
  publishedAt: string;
  updatedAt?: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  keyTakeaways?: string[];
  chapters?: { title: string; startSeconds: number }[];
  relatedResourceIds?: string[];
  featured?: boolean;
};
```

- Use human-readable topic labels in the interface even when slugs are machine-readable.
- Never show a raw YouTube URL as the primary content label.
- Use YouTube thumbnails only when the creator owns or is authorized to use the video content.
- Include an external-link indicator and state clearly when a visitor is leaving the website.
- Preserve deep links so a visitor can share a resource and return to the same content.

## Visual Direction

- Combine the warm off-white editorial canvas from Bartix and Artifact with Rapid Launch’s deep charcoal and warm terracotta foundation.
- Use Ordina’s quiet dark-mode precision for optional focused learning experiences, video playback contexts, or AI assistant states.
- Use Verseo’s direct AI-product storytelling to explain workflows and use cases.
- Use OMA Akari’s AI atmosphere as an inspiration for intelligent system feedback, not as an excuse for decorative futurism.
- Use subtle grid structures, soft gradients, clipped artwork, and layered cards to create depth.
- Keep the underlying layout grid visible only when it supports the composition.
- Use rounded containers with precise alignment rather than excessive floating cards.
- Use a limited number of visual materials: warm paper-like background, white surfaces, charcoal surfaces, terracotta actions, soft lavender utility surfaces, and carefully controlled illustration colors.
- The result should feel modern and full without relying on visual noise.

## Color System

- Use CSS custom properties or the project’s equivalent token system.
- Never place arbitrary hex values inside individual components.
- Use the following foundation palette:

| Token | Value | Intended use |
|---|---|---|
| `ink.950` | `#141414` | Hero backgrounds, dark navigation, deep contrast |
| `ink.900` | `#1D1D1D` | Dark cards, focused learning areas |
| `ink.800` | `#292929` | Dark hover and selected states |
| `ink.700` | `#454545` | Secondary dark text and borders |
| `terracotta.600` | `#C75D3C` | Primary CTA, links, highlights |
| `terracotta.500` | `#D9764F` | CTA hover and expressive accents |
| `terracotta.100` | `#FAE9E0` | Soft accent surfaces |
| `paper.50` | `#FCFAF8` | Warm marketing canvas |
| `white` | `#FFFFFF` | Cards and primary application surfaces |
| `neutral.100` | `#F3F4F8` | Subtle backgrounds and separators |
| `neutral.300` | `#D7D9E5` | Borders and dividers |
| `neutral.500` | `#74778C` | Supporting text |
| `neutral.700` | `#35374A` | Body text |
| `neutral.950` | `#11121D` | Primary text |
| `lavender.100` | `#EEF0FF` | Inputs, filters, selected soft surfaces |
| `lavender.200` | `#E5E8FA` | Hovered utility surfaces |
| `success.600` | `#159447` | Completed lessons and valid states |
| `success.100` | `#E7F7ED` | Positive status backgrounds |
| `warning.600` | `#B86B00` | Pending or caution states |
| `warning.100` | `#FFF4D6` | Warning backgrounds |
| `danger.600` | `#C93737` | Errors and destructive actions |
| `danger.100` | `#FDECEC` | Error backgrounds |
| `ai.violet` | `#7C5CFC` | AI-specific accent used sparingly (secondary to primary terracotta) |
| `ai.violetSoft` | `#F0EDFF` | AI labels, assistant surfaces, concept highlights |
| `ai.cyan` | `#1CA6B8` | Secondary AI/system accent used sparingly |

- Semantic tokens should include `surface.canvas`, `surface.card`, `surface.inverse`, `surface.input`, `text.primary`, `text.secondary`, `text.inverse`, `action.primary`, `action.secondary`, `focus.default`, `status.success`, `status.warning`, `status.danger`, and `status.info`.
- Terracotta should remain the main branded action color.
- Lavender and cyan may signal AI or system intelligence but must not become competing primary brand colors.
- Do not use gradients on body text or functional controls.
- Use gradients only for hero artwork, illustration atmosphere, or nonessential visual depth.

## Typography

- **Primary font:** `Manrope`.
- Use Manrope because it provides a contemporary geometric voice, strong rounded forms, excellent headline presence, and enough legibility for product UI when carefully sized.
- Use `Manrope` for navigation, headings, labels, body text, buttons, cards, and educational content.
- **Technical companion font:** `IBM Plex Mono`.
- Use IBM Plex Mono only for code snippets, keyboard shortcuts, technical metadata, database fields, API examples, and small system labels.
- Do not use the monospace font for long paragraphs.
- Load the fonts with a performance-conscious strategy and provide a system fallback.
- Recommended font stack: `Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Recommended monospace stack: `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.

| Style | Desktop | Mobile | Weight | Usage |
|---|---:|---:|---:|---|
| Display | 64/68 | 42/46 | 700 | Homepage hero only |
| H1 | 52/58 | 38/44 | 700 | Major page titles |
| H2 | 40/48 | 32/38 | 700 | Section titles |
| H3 | 28/36 | 24/30 | 700 | Card-group or feature titles |
| H4 | 21/28 | 19/26 | 700 | Resource and card titles |
| Body large | 20/30 | 18/28 | 400 | Introductory copy |
| Body | 16/25 | 16/24 | 400 | Standard copy |
| Body small | 14/21 | 14/21 | 400 | Metadata and helper text |
| Label | 13/18 | 13/18 | 700 | Navigation, tags, controls |
| Caption | 12/16 | 12/16 | 600 | Timestamps and microcopy |
| Code | 14/22 | 13/21 | 400 | Code and technical examples |

- Use a maximum line length of approximately 62–72 characters for paragraph copy.
- Use a maximum line length of approximately 12–18 words for major hero headlines where possible.
- Use sentence case for headings and labels.
- Use tabular numerals for durations, dates, progress, and counts.
- Avoid excessive font-weight variation; most screens should use regular, semibold, and bold only.

## Layout System

- Use a 12-column desktop grid.
- Use a maximum content width of 1200–1280 px.
- Use 24–32 px desktop page gutters depending on viewport width.
- Use 20 px tablet gutters.
- Use 16–20 px mobile gutters.
- Use a 4 px base spacing unit.
- Use the spacing scale `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160`.
- Use generous section padding but avoid empty vertical space that does not support hierarchy.
- Recommended section spacing is 112–160 px on desktop and 72–104 px on mobile.
- Use 24–32 px card padding on desktop and 20–24 px card padding on mobile.
- Keep related content within a shared alignment edge.
- Avoid aligning text to decorative artwork when a consistent content grid is available.

## Responsive Behavior

- **320–639 px:** Use a single-column layout, stacked CTAs, horizontal topic scrolling where appropriate, and a compact navigation drawer.
- **640–899 px:** Use two-column cards where the content remains readable, but collapse split hero compositions when they become cramped.
- **900–1199 px:** Use a flexible desktop shell with reduced gutters and a simplified navigation density.
- **1200 px and above:** Use the full 12-column layout, layered hero artwork, and larger content modules.
- The homepage hero should collapse to a text-first composition below 900 px.
- Resource cards should switch from three columns to two columns around tablet width and one column on small screens.
- Pricing or comparison content should use stacked cards rather than compressed side-by-side tables on mobile.
- Accordions should remain full width and provide large, easy-to-tap rows.
- Avoid placing essential copy over an image at small breakpoints.
- Preserve minimum 44 × 44 px hit areas regardless of viewport size.

## Material Design Adaptation

- Use Material Design’s emphasis on hierarchy, responsive layout, accessible states, meaningful motion, and reusable components.
- Use Material-style state layers for hover, focus, pressed, selected, and disabled states.
- Use tonal surfaces rather than heavy borders wherever the hierarchy remains clear.
- Use elevation intentionally for cards, dialogs, menus, and floating controls.
- Use Material-like component anatomy but preserve the Rapid Launch palette, rounded geometry, editorial spacing, and distinctive CTA treatment.
- Use accessible modal, drawer, menu, tooltip, form, and accordion behavior consistent with mature design-system practice.
- Do not reproduce the default Material color palette, typography, icon shapes, or dense enterprise appearance.
- Do not use a floating action button unless the action is genuinely persistent and central to the page.
- Do not allow Material components to override the warm, premium, content-led visual language.

## Core Components

### Header and Navigation

- Use a compact, high-quality header with a logo at the left and clear navigation in the center or right.
- Recommended navigation items are `Learn`, `Topics`, `Resources`, `About`, and `Search`.
- Use one dominant header CTA such as `Start learning` or `Watch a video`.
- On desktop, the header may remain visible while scrolling if it does not obstruct content.
- On mobile, use a menu button with an accessible label and a drawer containing the complete navigation.
- The active route must be visually and programmatically identifiable.
- Use a subtle background transition when the header changes from transparent to solid while scrolling.

### Announcement Pill

- Use a small pill beneath or within the header to announce a new video, learning series, or update.
- Keep the announcement to one short sentence and one action.
- Use a quiet surface, not a high-alert banner, unless the message is operationally important.
- Animate the announcement into view with a short opacity and vertical translation transition.
- Provide a dismiss action if the announcement persists across pages.

### Buttons

- Use a dark or terracotta filled pill for the primary action depending on context.
- Use a white or outlined pill for secondary actions on light surfaces.
- Use a light lavender or tonal button for low-emphasis utility actions.
- Use a circular arrow affordance nested inside the primary CTA when the action is a continuation or external journey.
- Preserve button width during loading.
- Provide default, hover, pressed, focus-visible, disabled, and loading states.
- Use direct action labels such as `Watch on YouTube`, `Start the beginner path`, `Explore topics`, and `View all resources`.
- Avoid `Submit`, `Click here`, `Learn more`, or `Get started` when a more specific label is possible.

### Resource Card

- Use a thumbnail or illustration at the top or left of the card.
- Show topic, difficulty, duration, title, summary, and action in a predictable order.
- Use a play icon only when the destination is a video.
- Keep card titles to two or three lines before truncation or layout adjustment.
- Use hover elevation, slight translation, or image-scale movement with restraint.
- Do not make the entire card an ambiguous nested-link region; define a clear accessible link target.
- Include a subtle external-link indicator when opening YouTube.

### Featured Video Card

- Use a larger thumbnail, stronger title, short summary, and a prominent watch action.
- Add a visible duration badge with sufficient contrast.
- Use a play button overlay only if it remains accessible and does not obscure the thumbnail’s subject.
- Provide a fallback background when a thumbnail is missing.
- Prefer creator-owned thumbnails or authorized YouTube thumbnails.

### Topic Card

- Use a concise topic title, one-sentence explanation, resource count, and illustrative icon or artwork.
- Give each topic a distinct but restrained accent treatment.
- Avoid assigning a completely unrelated color to every topic.
- Use a hover state that reveals a small arrow or changes the illustration position.
- The card should remain understandable without the illustration.

### Filter Bar

- Support topic, difficulty, format, duration, and newest/popular sorting where the resource volume justifies it.
- Use chips or segmented controls for common filters.
- Use a drawer or modal filter panel on mobile when filters would wrap into an unusable row.
- Make active filters removable and provide a clear reset action.
- Announce result-count changes to assistive technology where applicable.

### Search

- Support plain-language queries and topic suggestions.
- Provide an empty state that suggests example searches.
- Show recent or popular searches only when the user has an appropriate privacy expectation.
- Highlight matched words carefully without reducing readability.
- Preserve the query in the URL when search results are shareable.

### Accordion

- Use the FAQ pattern from the supplied Ordina reference as the baseline.
- Keep rows aligned, separated by subtle dividers, and controlled by clear plus/minus or chevron indicators.
- Animate expansion with height and opacity while respecting reduced motion.
- Use buttons for accordion triggers and expose `aria-expanded` and controlled-region relationships.
- Avoid opening multiple rows automatically unless the content model specifically benefits from comparison.

### Video Detail Layout

- Place the video player or thumbnail-led watch panel as the primary visual anchor.
- Present title, topic, difficulty, duration, and publication information near the player.
- Place a concise explanation before a long transcript or additional metadata.
- Show key takeaways in a scannable list.
- Provide chapters when available.
- Add a clear next action to the next recommended resource.
- Keep related videos visible without making the current video feel secondary.

### Newsletter Form

- Use a single email input and one clear action.
- Place consent language directly below the form.
- Explain what the visitor receives and how frequently messages are sent.
- Show inline validation and a clear success state.
- Never require newsletter signup to access educational content.

### Footer

- Use a structured footer with topic navigation, resource links, creator/about links, social/video links, legal links, and contact details.
- Keep the footer visually substantial but not visually louder than the main conversion sections.
- Use the dark charcoal surface for the footer if the page needs a strong closing frame.
- Include a final learning CTA such as `Keep learning` or `Browse all resources`.

## Illustrations and Public Images

- Use illustrations to explain abstract concepts such as agents, workflows, APIs, databases, and deployment.
- Use real or public images to add humanity to creator stories, testimonials, workspaces, and learning context.
- Prefer a consistent illustration system over unrelated stock graphics from different visual styles.
- Recommended illustration direction is editorial 2D or lightly dimensional artwork with simple shapes, warm highlights, soft charcoal shadows, terracotta accents, and restrained AI cyan.
- Illustrations should clarify a concept or establish emotional tone; they should not replace headings or important text.
- Use illustrations as background layers, card artwork, hero anchors, empty states, and topic thumbnails.
- Use public image sources such as [Unsplash](https://unsplash.com/), [Pexels](https://www.pexels.com/), [unDraw](https://undraw.co/illustrations), [Storyset](https://storyset.com/), and [Openverse](https://openverse.org/) only after confirming current license terms for the specific asset.
- Do not assume that a search result is free to use because it is publicly visible.
- Record the image source, creator, license, attribution requirement, and download date in the asset metadata or project documentation.
- Do not use Dreamstime, Getty, Shutterstock, or other commercial stock assets without an appropriate license.
- Do not use recognizable people in sensitive contexts without appropriate rights and consent.
- Do not use third-party logos as decorative filler or imply endorsement.
- Use creator-owned screenshots and YouTube thumbnails when available.
- Prefer original diagrams or generated illustrations for explanations where licensing or consistency is uncertain.
- Optimize images for responsive delivery using modern formats, sensible dimensions, lazy loading, and meaningful alternative text.
- Do not put essential text inside a raster image when the same information can be rendered as HTML.
- Provide decorative images with empty alternative text when they add no semantic information.
- Provide descriptive alternative text when the image conveys a concept, person, interface, or important contextual meaning.

## Illustration Library

- **Agent illustration:** A small system node coordinating tools, memory, and a human goal.
- **Vibecoding illustration:** A person and an AI interface moving from a plain-language idea to visible code and a working screen.
- **Database illustration:** Structured records flowing into organized tables and then returning as a useful result.
- **API illustration:** Two separate applications exchanging clearly labeled requests and responses.
- **Authentication illustration:** A person, identity token, and protected application boundary.
- **Deployment illustration:** A local workspace moving through a pipeline into a live product.
- **Learning-path illustration:** A sequence of small milestones leading toward a working project.
- Keep illustration composition simple enough to remain legible at small card sizes.
- Use repeated visual motifs so the library feels authored as one system.

## AI Interaction Language

- The website should feel AI-aware without pretending that every interaction is an AI interaction.
- Use AI violet or cyan as a restrained signal for assistant functionality, generated suggestions, smart search, or system reasoning.
- Use status language such as `Thinking`, `Preparing an explanation`, `Finding related resources`, and `Ready to watch` only when the interface is genuinely performing those actions.
- Never use fake streaming text, fake progress, or decorative “AI processing” loops that do not represent real system behavior.
- If an AI assistant is introduced, show what context it is using and what it can or cannot answer.
- Prefer explainable responses with source links, related videos, or topic references.
- Use progressive disclosure for technical detail so beginners are not overwhelmed.
- AI-generated summaries must be labeled as summaries and should not replace the source video.
- Use calm pulses, small status transitions, and subtle glow changes for processing states rather than aggressive neon effects.
- Ensure all AI state changes are available as text to screen readers.

## Motion and Animation System

- Motion should make the interface feel smooth, intentional, and alive.
- Motion should reinforce hierarchy, continuity, spatial relationships, and state changes.
- Motion should never delay access to content or obscure a primary action.
- Use a small number of reliable motion primitives rather than unique animations for every section.

| Motion token | Duration | Easing | Use |
|---|---:|---|---|
| `motion.instant` | 100 ms | ease-out | Small state-color changes |
| `motion.fast` | 160 ms | ease-out | Hover, focus, icon shifts |
| `motion.standard` | 240 ms | cubic-bezier(.2,.8,.2,1) | Cards, buttons, accordions |
| `motion.emphasis` | 360 ms | cubic-bezier(.16,1,.3,1) | Hero reveals and large panels |
| `motion.slow` | 600 ms | cubic-bezier(.16,1,.3,1) | Editorial artwork or layered entrance |
| `motion.marquee` | 24–40 s | linear | Logo or topic ticker loops |

- Use a standard reveal consisting of opacity from 0 to 1 and vertical translation from 16–24 px to 0.
- Stagger sibling reveals by 40–80 ms and cap the total stagger so content does not feel slow.
- Use subtle image scale from 0.98 to 1 for hero artwork and featured cards.
- Use a card hover translation of no more than 2–4 px.
- Use a modest shadow increase on hover instead of dramatic floating.
- Use a nested circular arrow that shifts or rotates slightly on CTA hover.
- Use an infinite marquee only for nonessential logos or topic labels, with pause-on-hover and a reduced-motion alternative.
- Use scroll-linked movement only when the relationship remains clear and the motion does not cause dizziness or distraction.
- Use a light ambient gradient or glow behind AI-related artwork, not behind every card.
- Use crossfade or height transitions for accordions and content switching.
- Use skeleton loading only when the content genuinely requires asynchronous loading.
- Never animate a financial or instructional value in a way that implies changing truth.
- Respect `prefers-reduced-motion: reduce` by removing parallax, marquee, large translation, and nonessential decorative movement.
- Keep content visible and layout stable when motion is disabled.

## Interaction States

- Every interactive component must define default, hover, focus-visible, pressed, disabled, loading, success, error, and selected states when relevant.
- Use visible focus rings with at least a 2 px outline and sufficient contrast against the current surface.
- Use state changes in color, elevation, iconography, and text where appropriate, but never rely on one visual channel alone.
- Use optimistic UI only when the action is reversible and the system can confidently reconcile the result.
- Prevent duplicate submissions on forms and resource actions.
- Show a clear retry path for failed asynchronous operations.
- Preserve user input when validation or network operations fail.
- Use toast notifications for brief confirmations, but keep important information in the page content as well.

## Accessibility

- Use semantic HTML before adding ARIA.
- Maintain a logical keyboard order.
- Make all navigation, filters, accordions, dialogs, drawers, video controls, and forms keyboard accessible.
- Provide accessible names for icon-only controls.
- Associate labels, helper text, and errors with their inputs programmatically.
- Do not use color as the only indicator of topic, difficulty, status, or completion.
- Maintain strong contrast for body text, controls, focus indicators, and essential icons.
- Use at least 44 × 44 px interactive target areas.
- Provide captions or links to captions for videos whenever available.
- Do not autoplay video with sound.
- Respect reduced motion, reduced transparency, and increased text-size preferences where supported.
- Ensure external YouTube actions are announced by visible text or an external-link icon with an accessible label.
- Ensure card layouts remain meaningful when images fail to load.
- Ensure all essential content remains available without hover.
- Test at 200% zoom and narrow viewport widths.
- Keep heading hierarchy sequential and meaningful.
- Use descriptive link text rather than repeated “Read more” links without context.

## Content Design Rules

- Use short paragraphs and explain one concept at a time.
- Write the first sentence of a resource summary so it can stand alone in a card.
- Make difficulty and estimated time visible before the user commits to watching.
- Use a consistent distinction between “watch,” “read,” “try,” and “explore.”
- Explain prerequisites honestly without discouraging beginners.
- Use examples from familiar products and everyday workflows when explaining technical concepts.
- Define acronyms at first use.
- Avoid promising mastery from one short video.
- Use “You’ll understand” or “You’ll be able to explain” for realistic learning outcomes.
- Use “Watch next” and “Continue with” to make the learning path feel intentional.
- Make summaries useful even when the visitor does not click through.

## Empty, Loading, and Error States

- Empty resource libraries should recommend a starting topic rather than showing a blank page.
- Empty search results should repeat the query and suggest broader terms.
- Loading states should preserve the final layout shape wherever possible.
- Image failures should fall back to a branded illustration or tonal placeholder.
- Video failures should explain whether the problem is temporary, external, or related to the video’s availability.
- Network errors should provide a retry action and preserve the visitor’s place.
- Missing metadata should not produce broken labels, `undefined`, or empty pills.
- Use friendly but precise error copy such as `This video is unavailable right now. Try again or explore a related resource.`

## Search and SEO Requirements

- Every resource page should have a descriptive title, summary, canonical URL, and social preview image.
- Use stable, human-readable slugs.
- Use structured metadata appropriate to video and educational content when the implementation supports it.
- Ensure page headings describe the actual topic rather than using generic marketing copy.
- Include visible topic and difficulty labels that match the content model.
- Ensure YouTube links are crawlable and meaningful without relying exclusively on JavaScript.
- Use descriptive image alternative text and avoid repeating the title unnecessarily.

## Performance Requirements

- Prioritize fast rendering of the header, hero copy, first topic row, and first featured resource.
- Lazy-load below-the-fold images and noncritical video thumbnails.
- Avoid loading a full video player before the visitor requests playback.
- Use responsive image sizes and modern image formats.
- Keep animations on the compositor-friendly properties `transform` and `opacity` where possible.
- Avoid layout shifts caused by images, fonts, video embeds, or dynamic metadata.
- Reserve aspect-ratio space for thumbnails and media.
- Use a privacy-conscious YouTube embed strategy when applicable.

## Data and YouTube Integration

- Treat YouTube as an external destination and dependency.
- Validate YouTube URLs and extract video IDs safely.
- Display a clear fallback if an external video is deleted, private, region-restricted, or unavailable.
- Do not imply that the website hosts or owns third-party videos unless that is true.
- Use creator-owned videos as the primary learning source whenever possible.
- Keep the resource record independent from the YouTube presentation so the same resource can later support transcripts, diagrams, or written guides.
- Do not expose API keys in client-side code.
- Cache or synchronize metadata according to the project’s backend and rate-limit strategy.

## Asset Management

- Store asset metadata with source URL, creator, license, attribution, usage scope, and date reviewed.
- Use semantic asset names such as `topic-ai-agents-hero.webp` rather than random download names.
- Keep original source files separate from optimized production derivatives.
- Use illustrations in SVG or optimized raster formats according to implementation needs.
- Keep decorative background patterns lightweight and reusable.
- Do not embed oversized hero videos when a still image or short loop can communicate the same idea.

## Suggested Design Tokens

```css
:root {
  --vp-color-surface-canvas: #fcfaf8;
  --vp-color-surface-card: #ffffff;
  --vp-color-surface-inverse: #141414;
  --vp-color-surface-input: #eef0ff;
  --vp-color-text-primary: #11121d;
  --vp-color-text-secondary: #74778c;
  --vp-color-text-inverse: #ffffff;
  --vp-color-action-primary: #c75d3c;
  --vp-color-action-primary-hover: #d9764f;
  --vp-color-focus: #c75d3c;
  --vp-color-ai: #1ca6b8;
  --vp-font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
  --vp-font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --vp-radius-sm: 8px;
  --vp-radius-md: 12px;
  --vp-radius-lg: 16px;
  --vp-radius-xl: 24px;
  --vp-radius-pill: 999px;
  --vp-shadow-sm: 0 2px 8px rgb(17 18 29 / 6%);
  --vp-shadow-md: 0 8px 24px rgb(17 18 29 / 10%);
  --vp-shadow-lg: 0 16px 48px rgb(12 10 62 / 18%);
  --vp-motion-fast: 160ms;
  --vp-motion-standard: 240ms;
  --vp-motion-emphasis: 360ms;
  --vp-motion-slow: 600ms;
  --vp-motion-marquee: 32s;
  --vp-ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --vp-ease-exit: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Motion primitives

Expose these reusable CSS primitives (with the reduced-motion overrides above):

| Utility | Purpose |
|---|---|
| `.reveal` / `.is-visible` | IntersectionObserver reveal: fade + translateY(`--reveal-offset`) + subtle blur. Used by `Reveal` component. |
| `.fade-up` / `.is-visible` | Lightweight fade-up enter without blur (for repeated list items / accordions). |
| `.animate-artwork-in` | Hero / featured artwork scale-in from 0.98 to 1 (opacity + scale over `motion.slow`). |
| `.animate-soft-pulse` | Nonessential live/verified status glow. Decorative only — never on financial truth. |
| `.animate-drift` | Ambient gradient drift behind hero artwork (16 s alternate). |
| `.animate-marquee` (in `.marquee`) | Nonessential logo/topic ticker, `motion.marquee` linear loop, paused on hover/focus. |

All decorative primitives are neutralised under `prefers-reduced-motion`.

## Recommended Component Naming

- Use names such as `SiteHeader`, `AnnouncementPill`, `HeroSection`, `TopicCard`, `TopicGrid`, `ResourceCard`, `FeaturedResource`, `VideoMeta`, `WatchButton`, `DifficultyBadge`, `DurationBadge`, `FilterBar`, `SearchInput`, `ResourceGrid`, `LearningPath`, `IllustrationPanel`, `FAQAccordion`, `NewsletterForm`, `Footer`, and `AiStatus`.
- Prefer composition over large components with many unrelated boolean props.
- Use variants for `size`, `tone`, `state`, `density`, `media`, and `external` when those differences are systematic.
- Keep content data separate from presentational component markup.

## Page-Level Composition Rules

- Each page should have one clear H1.
- Each major section should have a concise heading and a reason to exist.
- Use no more than one visually dominant background treatment per viewport area.
- Use one primary CTA per section and no more than two secondary actions.
- Use repeated card widths and consistent alignment edges.
- Do not create a new visual style for every route.
- Use shared loading, error, empty, filter, and metadata patterns across all resource pages.
- Keep the visual language consistent between the marketing homepage and the educational library.

## Implementation Sequence

- Establish the font loading strategy and foundational tokens first.
- Build the layout container, responsive grid, header, footer, buttons, badges, and card primitives.
- Build the resource data model and route structure.
- Implement the homepage hero, topic navigator, featured resource, learning pathway, library preview, FAQ, newsletter, and footer.
- Implement resource listing, filters, search, and video detail pages.
- Add illustration and public-image assets with documented licenses.
- Add motion primitives and reduced-motion behavior.
- Add analytics only after defining privacy-conscious events such as resource impression, watch click, topic selection, search submission, and newsletter completion.
- Add visual regression coverage for critical breakpoints and interaction states.

## Definition of Done

- The homepage feels visually complete, modern, and content-rich rather than sparse.
- A first-time visitor can identify the purpose of the site within five seconds.
- A beginner can reach a useful introductory video within two clear interactions.
- The homepage presents multiple learning paths without overwhelming the visitor.
- Every resource has clear topic, difficulty, duration, summary, and watch behavior.
- YouTube destinations are clearly identified as external.
- Illustrations and public images have documented sources and license checks.
- The selected font pairing is implemented consistently.
- The visual system uses semantic tokens rather than scattered hardcoded values.
- Components provide complete states, including loading, empty, error, disabled, focus, and success where relevant.
- The layout works at 320 px, 768 px, 1024 px, and 1440 px widths.
- Keyboard navigation works through the primary flows.
- Motion is smooth, restrained, purposeful, and disabled appropriately for reduced-motion users.
- The site remains understandable if images fail, animations are disabled, or YouTube content is unavailable.
- All key pages have meaningful titles, headings, descriptions, and shareable URLs.
- The implementation has no obvious layout shifts, broken external links, missing labels, or placeholder content.

## Reference Sources

- [Bartix Framer reference](https://bartix.framer.website/)
- [Ordina Framer reference](https://ordina.framer.website/)
- [Artifact Framer reference](https://artifact-template.framer.website/)
- [OMA Akari Framer reference](https://oma-akari.framer.website/)
- [Verseo Framer reference](https://verseo.framer.website/#use-cases)
- [Material Design](https://m3.material.io/)
- [Unsplash](https://unsplash.com/)
- [Pexels](https://www.pexels.com/)
- [unDraw illustrations](https://undraw.co/illustrations)
- [Storyset illustrations](https://storyset.com/)
- [Openverse](https://openverse.org/)
