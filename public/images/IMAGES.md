# Image Asset Manifest

All photos in this directory are sourced from Pexels under the
[Pexels License](https://www.pexels.com/license/), which permits free
commercial and personal use without mandatory attribution. Attribution is
provided as a courtesy and to comply with the DESIGN.md asset rules.

For maximum quality, source files are Pexels CDN originals (`images.pexels.com`)
downloaded in optimised JPEG form (1600x1100 crop where available).

## Photo credits

| File | Subject | Creator | Source page | Downloaded |
| --- | --- | --- | --- | --- |
| about-founder.jpg | Confident businessman at desk in office library | August de Richelieu | https://www.pexels.com/photo/businessman-in-his-office-looking-at-the-camera-4427630/ | 2026-09-01 |
| collab-brainstorm.jpg | Women collaborating beside a corkboard | fauxels | https://www.pexels.com/photo/women-standing-beside-corkboard-3184296/ | 2026-09-01 |
| collab-meeting.jpg | Diverse group in a collaborative office meeting | Yan Krukau | https://www.pexels.com/photo/a-group-of-people-having-a-discussion-7698712/ | 2026-09-01 |
| collab-office.jpg | Team working in a modern office with laptops | fauxels | https://www.pexels.com/photo/people-working-in-the-office-7653978/ | 2026-09-01 |
| deploy-server.jpg | Server racks in a data center | panumas nikhomkhai | https://www.pexels.com/photo/data-center-server-racks-with-active-equipment-37730212/ | 2026-09-01 |
| hero-ai-human.jpg | Person reaching out to a robotic hand | Tara Winstead | https://www.pexels.com/photo/person-reaching-out-to-a-robot-8386434/ | 2026-09-01 |
| topic-agents.jpg | White robot toy in a dark studio setting | Pavel Danilyuk | https://www.pexels.com/photo/close-up-shot-of-a-white-robot-8294605/ | 2026-09-01 |
| topic-apis.jpg | Network switch with blinking LEDs | Brett Sayles | https://www.pexels.com/photo/high-angle-shot-of-network-switch-5050305/ | 2026-09-01 |
| topic-auth.jpg | Smartphone wrapped in a chain with a padlock | Towfiqu barbhuiya | https://www.pexels.com/photo/close-up-of-a-smart-phone-with-a-lock-11391947/ | 2026-09-01 |
| topic-databases.jpg | Server rack with glowing lights in a data center | panumas nikhomkhai | https://www.pexels.com/photo/close-up-photo-of-mining-rig-1148820/ | 2026-09-01 |
| topic-deployment.jpg | Rocket launch leaving a trail at sunset | Pexels | https://www.pexels.com/photo/missle-launching-at-sunset-5420670/ | 2026-09-01 |
| vibecoding-ai.jpg | Dark setup with ChatGPT interface on screen | Matheus Bertelli | https://www.pexels.com/photo/chatgpt-on-monitor-16027812/ | 2026-09-01 |
| vibecoding-code.jpg | Close-up of a person coding on a laptop | Lukas Blazek | https://www.pexels.com/photo/person-encoding-in-laptop-574071/ | 2026-09-01 |

## Founders catalogue service imagery

All five are Pexels CDN originals, same license as above. Each is landscape
(16:9 or 3:2) to match the `landscape` service card format.

| File | Service | Subject per Pexels listing | Creator | Source page | Downloaded |
| --- | --- | --- | --- | --- | --- |
| service-strategy-session.jpg | 90-Minute One-on-One Strategy Session | Two professionals discussing strategies at a modern office desk with a laptop | Vitaly Gariev | https://www.pexels.com/photo/office-workers-sitting-at-a-table-and-discussing-strategy-22046264/ | 2026-10-01 |
| service-pm-clarity.jpg | 60-Minute Product Manager Clarity Session | Professionals analysing data on a laptop during an office meeting | Yan Krukau | https://www.pexels.com/photo/using-laptop-in-a-business-meeting-7693683/ | 2026-10-01 |
| service-idea-to-mvp.jpg | Idea to MVP Sprint | A group of colleagues working together on a project around a laptop | not confirmed | https://www.pexels.com/photo/photo-of-people-looking-on-laptop-3182812/ | 2026-10-01 |
| service-ai-build.jpg | Building Your Product with AI | Person coding on a laptop | not confirmed | https://www.pexels.com/photo/person-coding-on-a-macbook-pro-4974912/ | 2026-10-01 |
| service-build-with-us.jpg | Build a Product With Us | Two colleagues working together in front of a laptop | not confirmed | https://www.pexels.com/photo/young-colleagues-sitting-and-working-together-in-front-of-a-laptop-7652245/ | 2026-10-01 |

**Open item — these five are not visually reviewed.** The subject descriptions
above come from the Pexels search listing, not from inspecting the files. Each
file was verified only as a valid JPEG at the stated dimensions. Before these
ship, open each file and confirm it shows people rather than objects or empty
rooms, and that the framing suits a 16:9 card. Swap by editing `thumbnailUrl`
in `scripts/seed.ts` and re-running `npm run seed`.

Attribution is not required under the Pexels License. Creator names recorded as
"not confirmed" were not visible in the search result and must not be guessed.

## Usage scope

- `hero-ai-human.jpg` — hero concept for internal/landing iterations (homepage currently uses illustrations).
- `vibecoding-code.jpg` — resources video thumbnail (vibecoding visual).
- `vibecoding-ai.jpg` — resources video thumbnail (AI assistant on screen).
- `topic-*.jpg` — topic / course visuals (homepage topic section currently uses illustrations).
- `about-founder.jpg` — About page (founder/creator story).
- `collab-*.jpg` — collaboration visuals for testimonials, community, or founder sections (currently used on the resources page).
- `deploy-server.jpg` — deployment / data-center visual (available for internal pages).

## Thumbnail policy

Optimized production derivatives are stored next to originals in `public/images`.
Downstream usage should load lazily below the fold and use `alt` text that
describes the concept without repeating the surrounding heading.