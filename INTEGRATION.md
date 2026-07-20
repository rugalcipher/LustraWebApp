# Lustra full-stack integration — route/endpoint matrix

Living document. Source of truth = the repositories, not this file; update it as
each stage lands.

- Frontend: `P:\Rugal Cipher\Companies\Lustra\Softwares\LustraWebApp`
- Backend: `P:\Rugal Cipher\Companies\Lustra\Softwares\LustraPlatform`
- API base: `/api/v1` · SignalR hub: `/hubs/chat`

Backend inventory as audited: **33 controllers, 187 endpoints**, 2 health
endpoints, 1 SignalR hub. 250 backend tests pass in Debug and Release.

Status legend: ✅ integrated · 🟡 partially wired · 🔴 mock-only · ⛔ backend
endpoint missing (must be implemented in this workstream) · ⚪ **legacy/deferred
— exists but deliberately NOT on the product surface**.

---

## 0. THE PRODUCT MODEL (corrected)

> This section supersedes the inquiry → proposal → booking model that Stages 4
> and 6 built for the Client. Read it before changing anything below it.

**Lustra is discreet and concierge-led. The Client does not participate in a
booking lifecycle.** They browse, they message Management, and Management
arranges everything — in the conversation or privately off-platform.

### The Client journey, end to end

```
Browse talent → open a profile → MESSAGE
  → authenticate if needed (talent context preserved across login)
  → land back on the same talent
  → a private conversation with Lustra MANAGEMENT opens
  → arrange everything by messaging
```

### What the Client must NOT be asked to do

Structured inquiry forms · receive a formal proposal · accept or decline one ·
confirm a booking · view a booking record, calendar or settlement · track
internal statuses · read internal notes · touch operational paperwork.

**Client discretion is a product requirement, not a preference.**

### The authenticated Client workspace is exactly

Discover · talent profiles · saved talent · conversations · message
notifications · account/profile · security & sessions. Nothing else.

### Conversation ownership

Clients message **Management**, never talent directly. The selected talent is
attached to the conversation as **context**; the talent does **not** become a
participant. Management alone decides whether and when talent is contacted.

The Client never receives: talent private contact details, internal talent
notes, internal availability commentary, management discussion, or any other
client's information.

### The internal booking

After Management and the Client agree privately, authorised staff record an
**internal booking**. It exists so Management remembers the arrangement, the
talent's schedule is blocked, assigned talent see what they need to turn up,
double-booking is avoided, and reminders can fire.

**It is not a Client workflow. The Client has neither UI nor API access to it.**

Assigned talent see the operational schedule and instructions only — never
financial discussion, management notes, settlement administration, or
unnecessary client contact detail.

### Consequence: endpoints that exist but are OFF the product surface

The backend still carries the Client-facing inquiry, proposal and booking
endpoints from Stages 4 and 6. Per instruction they are **not deleted** — they
are marked ⚪ legacy/deferred, must not be called by the frontend, and must not
be expanded. They await a separate product decision. Building the Client through
them "because they already exist" is explicitly the wrong move.

---

## 1. Public

| Frontend route | Role | Query/mutation | Backend endpoint | Exists | Auth | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` Landing | Guest | hero slides | `GET /public/site/home` | ⛔ | anon | 🔴 mock `experienceSlides.ts` |
| `/` Landing | Guest | featured talent | `GET /public/talents?featured` | ✅ | anon | 🔴 mock `TALENT` |
| `/talent` BrowseTalent | Guest | search/filter | `GET /public/talents` | ✅ | anon | ✅ |
| `/app/discover` immersive | Guest/Client | search | `GET /public/talents` | ✅ | anon | ✅ |
| `/talent/:id` TalentProfile | Guest | detail | `GET /public/talents/{slug}` | ✅ | anon | ✅ |
| `/talent/:id` reviews | Guest | reviews | `GET /public/talents/{slug}/reviews` | ✅ | anon | ✅ |
| `/talent/:id` rates | Guest | public rates | part of `PublicTalentDetailDto` | ✅ | anon | ✅ |
| filters | Guest | taxonomies | `GET /public/{talent,engagement}-categories`, `/languages` | ✅ | anon | ✅ |
| filters | Guest | locations | `GET /public/locations/{countries,regions,cities}` | ✅ | anon | ✅ |
| city picker | Guest | resolve coords→city | `POST /public/location/resolve` | ✅ | anon | ✅ |
| guest gate | Guest | discovery policy | `GET /public/discovery-policy` | ✅ | anon | ✅ |
| admin placements | Admin | CRUD + preview | `/admin/discovery/placements`, `/admin/discovery/preview` | ✅ | `Settings.Manage` | 🟡 API only (UI Stage 9) |
| `/about` `/how-it-works` `/privacy` `/terms` `/safety` | Guest | CMS page | `GET /public/cms/{slug}` | ✅ | anon | 🔴 static `InfoPage` |
| FAQs | Guest | FAQs | `GET /public/faqs` | ✅ | anon | 🔴 static |
| public settings | Guest | settings | `GET /public/settings` | ✅ | anon | 🔴 unused |
| `/request-access` | Guest | client registration | `POST /auth/client/register` | ✅ | anon | 🟡 Stage 2 |
| `/for-talent` TalentApplication | Guest | talent application | `POST /public/talent-applications` | ⛔ | anon | ⛔ not built |

## 2. Authentication (Stage 2)

| Frontend | Backend endpoint | Exists | Status |
| --- | --- | --- | --- |
| `/login` | `POST /auth/login` | ✅ | ✅ |
| `/register` | `POST /auth/client/register` | ✅ | ✅ |
| verify email | `POST /auth/verify-email`, `/auth/resend-verification` | ✅ | ✅ |
| `/forgot-password` | `POST /auth/forgot-password` | ✅ | ✅ |
| `/reset-password` | `POST /auth/reset-password` | ✅ | ✅ |
| silent refresh | `POST /auth/refresh` | ✅ | ✅ single-flight queue |
| current user | `GET /auth/me` | ✅ | ✅ |
| logout / logout all | `POST /auth/logout`, `/auth/logout-all` | ✅ | ✅ |
| change password | `POST /auth/change-password` | ✅ | ✅ |
| sessions + revoke | `GET /auth/sessions`, `DELETE /auth/sessions/{id}` | ✅ | ✅ |
| talent invitation activation | `POST /talent-activation/{validate,activate}` | ✅ | 🟡 Stage 7 |

`AuthUserDto` supplies `roles[]` (PascalCase) and `permissions[]`; the frontend
normalizes via `domain/roles.ts` and gates on real claims only.

## 2b. The Client workspace as built (corrected model)

| Frontend route | Backend endpoint | Status |
| --- | --- | --- |
| `/app/discover` | `GET /public/talents` | ✅ |
| `/app/talent/:id` | `GET /public/talents/{slug}` | ✅ |
| `/app/message/:slug` | `POST /client/conversations` (start-or-find) | ✅ |
| `/app/messages` | `GET /client/conversations` | ✅ |
| `/app/messages/:id` | `GET/POST …/{id}/messages`, `…/read` + SignalR | ✅ |
| `/app/saved`, `/app/collections/:id` | `GET /client/saved-talents`, `/client/collections` | ✅ |
| `/app/notifications` | `GET /notifications` | ✅ |
| `/app/report` | `POST /reports` | ✅ |
| `/app/profile` | `GET/PUT /client/profile` | ✅ |

**Four navigation entries: Discover · Saved · Messages · Profile.** A fifth would
mean the lifecycle crept back; `platform.test.ts` asserts the exact set.

### Withdrawn from the Client surface

Routes `/app/inquire/:id`, `/app/inquiries[/:id]`, `/app/bookings[/:id]` and
`/app/proposals/:id` are **unregistered**, and their pages and feature hooks are
deleted (recoverable from git history — the commit before this change). A test
asserts none of them is routable, so re-adding one is a failure rather than a
silent regression.

The **backend** endpoints behind them survive untouched and are marked ⚪
legacy/deferred below. Nothing in the frontend calls them.

## 3. Client workspace — ⚪ LEGACY/DEFERRED
> Everything in this section is **off the product surface**. It is listed for the
> later product decision, not as work to finish. Do not wire it up.

| Frontend route | Backend endpoint | Exists | Stage |
| --- | --- | --- | --- |
| `/app/discover` | `GET /public/talents` | ✅ | ✅ 3 |
| `/app/saved` | `GET /client/saved-talents`, `/ids`, `PUT/DELETE /{talentId}` | ✅ | ✅ 4 |
| `/app/saved` collections | `GET/POST/PUT/DELETE /client/collections[/{id}]` | ✅ | ✅ 4 |
| `/app/collections/:id` | `GET /client/collections/{id}`, `PUT/DELETE …/talents/{talentId}` | ✅ | ✅ 4 |
| `/app/profile` | `GET/PUT /client/profile` | ✅ | ✅ 4 |
| `/app/inquire/:id` | `POST /client/inquiries` (Idempotency-Key header) | ✅ | ✅ 4 |
| `/app/inquiries` | `GET /client/inquiries` | ✅ | ✅ 4 |
| `/app/inquiries/:id` | `GET /client/inquiries/{id}`, `POST …/cancel` | ✅ | ✅ 4 |
| `/app/messages` | `GET /client/conversations` | ✅ | ✅ 5 |
| `/app/messages/:id` | `GET …/{id}`, `GET …/{id}/messages`, `POST …/{id}/messages` (multipart), `POST …/{id}/read` | ✅ | ✅ 5 |
| live chat | SignalR `/hubs/chat` — `JoinConversation`/`LeaveConversation`/`SendTyping`; events `ReceiveMessage`, `TypingIndicator`, `ReadReceipt`, `ConversationUpdated` | ✅ | ✅ 5 |
| `/app/proposals/:id` | `GET /client/proposals[/{id}]`, `accept`/`decline`/`request-change` | ✅ | ✅ 6 |
| `/app/bookings` | `GET /client/bookings` | ✅ | ✅ 6 |
| `/app/bookings/:id` | `GET /client/bookings/{id}`, `settlement`, `request-change`, `request-cancellation` | ✅ | ✅ 6 |
| reviews | `POST/GET /client/bookings/{id}/review` | ✅ | ✅ 6 |
| `/app/notifications` | `GET /notifications`, `unread-count`, `{id}/read`, `read-all` | ✅ | ✅ 6 |
| notification preferences | `GET/PUT /notifications/preferences` | ✅ | ✅ 6 |
| VIP request/status | `POST /client/vip-requests`, `GET /client/entitlements` | ⛔ | 8 |

## 4. Talent portal (Stage 7)

| Frontend route | Backend endpoint | Status |
| --- | --- | --- |
| `/talent-portal` | `GET /talent/profile`, `/talent/availability`, `/talent/bookings`, `/talent/media`, `/talent/reviews` | ✅ 7 |
| `/talent-profile` | `GET/PUT /talent/profile/draft`, `draft/submit`, `versions`, `profile/rates` | ✅ 7 |
| `/talent-media` | `GET /talent/media`, `upload`, `{id}` (PUT/DELETE), `{id}/submit`, `{id}/set-cover`, `reorder` | ✅ 7 |
| `/talent-availability` | `GET/PUT /talent/availability[/status]`, `rules`, `exceptions`, `travel`, `GET /talent/calendar` | ✅ 7 |
| `/talent-reviews` | `GET /talent/reviews`, `POST /talent/reviews/{id}/response` | ✅ 7 |
| `/talent-bookings/:id` | `GET /talent/bookings/{id}` | ✅ 7 |
| talent conversations | `GET /talent/conversations`, `{id}/messages` (GET/POST multipart) | 🔴 Stage 12 |
| tag assignment UI | `GET /talent/profile/tags`, `PUT …/{type}` | 🟡 service+hooks only |

Not yet surfaced: `preview`, `request-upload`/`finalize`/`delivery-url` (the
multipart `upload` path is used instead — it needs no bucket CORS), and the
city/region pickers on the draft (the draft preserves whatever onboarding set).

## 5. Management (Stage 8)

`management/inquiries` (assign/status/notes/close/reopen), `conversations`
(+assign/notes/read), `proposals` (create/update/send/withdraw),
`bookings` (confirm-from-proposal/reschedule/cancel/start/complete/no-show/notes/
settlement-status), `calendar` + `calendar/conflicts`, `talents/invitations`,
`profile-reviews`, `media-reviews` (approve/reject/revoke-publication),
`reviews` moderation, `safety` reports+cases, `dashboard`, `analytics` (6 datasets
+ CSV export), `maintenance` jobs — **all exist ✅**.

Missing ⛔: direct booking create without a proposal; talent lifecycle
(pause/feature/suspend); VIP request review queue.

## 6. Admin (Stage 9)

`admin/users` (+suspend/reactivate/staff), `admin/roles` + `permissions`,
`admin/taxonomies/{type}`, `admin/locations/*`, `admin/cms/pages` + `faqs`,
`admin/settings`, `admin/feature-flags`, `admin/audit-logs` — **all exist ✅**.

Missing ⛔: announcements endpoints (entity exists, zero routes); marketing hero
slides; discovery policy settings surface; discovery placements; VIP entitlement
administration; public feature-flag read endpoint.

---

## 7. Confirmed backend gaps to implement in this workstream

| # | Capability | Brief § | Target stage |
| --- | --- | --- | --- |
| 1 | ~~Guest discovery policy (settings + server enforcement + structured gate)~~ | §12 | ✅ 3 |
| 2 | ~~City latitude/longitude + `POST /public/location/resolve`~~ | §13 | ✅ 3 |
| 3 | ~~Location-aware discovery ranking~~ | §13 | ✅ 3 |
| 4 | ~~`DiscoveryPlacement` entity + admin CRUD + preview~~ (admin UI still Stage 9) | §14 | ✅ 3 |
| 5 | ~~VIP entitlement model (`ClientEntitlement`, `VipAccessRequest`) + client & management endpoints~~ | §15 | ✅ 8 |
| 6 | ~~Talent profile visibility incl. `VipOnly`/`Paused`~~ — **not a gap**, see §7d | §16 | ✅ 7 |
| 7 | ~~Media image variants + width/height in DTOs + immutable cache headers~~ | §18 | ✅ 10 |
| 8 | ~~`MarketingHeroSlide` + `GET /public/site/home` + admin CRUD/publish/schedule~~ (backend done; hero adoption pending — see §7i) | §19 | ✅ 11 |
| 9 | Public talent application submission | §21 | 3 |
| 10 | ~~Announcements endpoints~~ | §21 | ✅ 9 |
| 11 | ~~Public feature-flag read endpoint~~ | §21 | ✅ 9 |
| 12 | ~~Talent lifecycle (pause/resume/suspend/feature)~~ · ~~direct booking create~~ | §21 | ✅ 9 / 12 |

## 7b. Backend gaps closed in Stage 4

| Capability | Detail |
| --- | --- |
| Client profile | New `ClientProfile` domain + CQRS (`GET/PUT /client/profile`). No banking, card, income, payout or identity-document fields — and none may be added. |
| Saved-talent ids | `GET /client/saved-talents/ids`, so saved state merges into the **public** discovery cache without making it user-specific. |
| Collection CRUD | Detail, rename and delete were missing; added at `/client/collections` with per-client name uniqueness and limits. |
| Talent profile id on public DTOs | `TalentListItemDto.Id` / `PublicTalentDetailDto.Id`. Without it the frontend literally could not save a talent or submit an inquiry — the client endpoints key on the profile id while routing uses the slug. |

## 7c. Backend gaps closed in Stage 6

| Capability | Detail |
| --- | --- |
| `InquiryId` on client booking DTOs | `BookingListItemDto.InquiryId` and `ClientBookingDto.InquiryId`. Without it a client could not navigate from the inquiry they submitted to the booking it became — the link existed only in the management DTO. Every recipient is already a booking participant, so it discloses nothing new. |
| Workflow notifications | Until Stage 6 the ONLY notification producers were two background jobs (`ProposalExpiryJob`, `BookingReminderJob`), so the events a client actually cares about notified nobody and the notification centre would have been permanently empty. `SendProposalCommand` → `ProposalReceived`; `ConfirmBookingFromProposalCommand` → `BookingConfirmed` (client + talent); `CancelBookingCommand` → `BookingCancelled` (client + talent). |

`MessageReceived` is deliberately NOT emitted per message: SignalR plus the conversation
unread badge already cover in-app messaging truthfully, and a notification per message
would fan out to email/SMS/push through the outbox.

Notifications are produced AFTER the handler's own `SaveChangesAsync`, because
`INotificationService.NotifyAsync` commits its own unit of work — calling it earlier
would persist a notification for a transition that had not been committed.

## 7d. Gap #6 re-examined in Stage 7 — it was not a gap

The brief listed "talent profile visibility incl. `VipOnly`/`Paused`" as missing.
Reading the schema rather than trusting the list:

- **`Paused` already works.** It is a `TalentProfileStatus` member, and every
  visibility filter is `ProfileStatus == Approved && IsPublic`, so a paused
  profile is excluded *by construction* — no separate rule needed. Pinned by
  `TalentProfileWorkflowTests.A_paused_profile_disappears_from_public_discovery`,
  which also asserts the by-slug lookup returns **404, not 403**.
- **`VipOnly` is not a profile concept and should not become one.** It exists
  only as a `MediaVisibility` member. VIP is a *media-access policy*; a VIP-only
  talent would be a different product decision, and adding the column "because
  the list said so" would have created a second, conflicting visibility axis.

Adding a `TalentProfile.VipOnly` column was therefore **deliberately not done**.
The VIP entitlement model (gap #5, Stage 8) governs who may *view* VIP media.

## 7e. Backend gap #5 closed in Stage 8 — the VIP entitlement model

New: `ClientEntitlement`, `VipAccessRequest` (+ `EntitlementType`,
`EntitlementStatus`, `VipAccessRequestStatus`), migration `ClientEntitlements`,
CQRS in `Application/Clients/EntitlementFeatures.cs`, and two controllers.

| Endpoint | Permission |
| --- | --- |
| `GET /client/entitlements` | verified client (own) |
| `POST /client/vip-requests`, `…/{id}/withdraw` | verified client (own) |
| `GET /management/vip-requests` | `Clients.View` |
| `POST /management/vip-requests/{id}/approve` \| `/decline` | `Clients.Manage` |
| `GET/POST /management/clients/{id}/entitlements` | `Clients.View` / `Clients.Manage` |
| `POST /management/entitlements/{id}/revoke` | `Clients.Manage` |

Design rules encoded in the model, not just the UI:

- **Manual review only.** No purchase, subscription, renewal or auto-approval
  path exists anywhere in the feature, matching how bookings are confirmed.
- **`IsActiveAt(utcNow)` is the single authorisation rule.** Expiry is evaluated
  against the clock on every check, so a lapsed grant stops working immediately
  rather than waiting for a job to flip its status.
- **Entitlement is read from the DATABASE on every media request, never from a
  token claim.** A claim would keep granting VIP media until the client's next
  refresh — after revocation. Pinned by
  `Revoking_an_entitlement_takes_effect_without_a_new_token`.
- **Grants do not stack.** Granting to an already-entitled client returns the
  existing grant; overlapping entitlements would make revocation ambiguous.
- **The client never sees the internal note**, the granting staff member or the
  decision reasoning — `ClientEntitlementsDto` carries none of them.
- Revocation deliberately sends **no** notification: that is a conversation for
  the client's concierge, not an automated email/SMS broadcast.

`MediaService.GetDeliveryUrlAsync` previously had `VipOnly => canModerate ||
isOwner // entitled clients handled once the VIP model ships`. It now consults
the entitlement. It failed *closed* before, so this widened access rather than
fixing a leak.

New Application abstraction `IUserDirectory` (impl `UserDirectory`) so handlers
can label a user by email without reaching into the Identity model, which
carries password hashes and security stamps.

## 7f. Backend gaps closed in Stage 9

**Talent lifecycle (gap #12, part).** `TalentProfile` already had `PausedAtUtc`,
`SuspensionReason` and `IsFeatured` — with **no writer anywhere in the codebase**,
so pausing and featuring were unreachable. Added
`POST /management/talents/{id}/{pause,resume,suspend,featured}` (`Talent.Manage`).
Rules encoded in the handlers:
- Pause applies only to an **Approved** profile — pausing a draft would discard
  the state management needs to return to.
- Pausing and suspending **clear `IsFeatured`**; a featured-but-invisible profile
  would occupy a promoted slot showing nothing.
- Featuring a non-approved or non-public profile is **refused (422)** rather than
  silently having no effect.
- Resume applies only to **Paused**; a suspended profile goes back through review
  rather than being quietly reinstated.

**Announcements (gap #10).** The entity, table and EF configuration existed with
zero readers or writers. Added `GET /public/announcements` (anonymous) and
`GET/POST/PUT/DELETE /admin/announcements` (`Cms.Manage`). The public query
requires all three of: active, started, not ended — so a **scheduled announcement
cannot leak before its start**, which is the entire point of the window.

**Public feature flags (gap #11).** `GET /public/feature-flags` returns an array
of **enabled keys only** — no descriptions, no disabled keys. Listing what is
switched off would advertise unreleased work to any anonymous caller; the
response shape cannot express it.

### Verified, not fixed
`AdminUsersController.Search` / `AdminAuditLogsController.Search` accept raw
`int pageSize`. This looked like an unbounded-page vector, but both handlers wrap
the value in `PagedRequest`, whose `init` accessors clamp to `[1, 100]`. No
change needed.

## 7g. Backend gap #7 closed in Stage 10 — responsive media

**Resizing happens at the EDGE, not in this process.** Public media sits in an R2
bucket behind Cloudflare, so `IImageVariantBuilder` emits `/cdn-cgi/image/...`
URLs. No image-processing dependency, no server CPU, no derivative objects to
store or regenerate when a size changes.

It is **opt-in** (`MediaStorage:Images:ResizingEnabled`, default `false`) because
those paths only resolve when Image Resizing is enabled on the zone. Every branch
that cannot safely transform returns the original URL and a null `srcSet` — a
broken candidate is worse than none. Specifically it refuses to rewrite: a
relative URL, a URL on any other host, and **signed API read URLs** (rewriting
the path breaks the signature, and caching a derivative of private media would
expose per-requester bytes). It also never upscales past the original.

**The layout-shift fix is the real win.** `PublicMediaDto` and the card's cover
previously carried a bare URL string, so every public image rendered at an
unknown size and the page reflowed as photos loaded. Both now carry
`PublicImageDto { Url, SrcSet, Width, Height, AspectRatio }`. Dimensions are
nullable — the reader only parses PNG/JPEG headers, and a null is honest where a
fabricated 1:1 would cause the very shift this removes. Cover dimensions for a
whole page load in **one** batched query, not one per card.

**Cache headers.** `MediaContentDto` gained `IsPublic` so the controller does not
re-derive the authorization decision. Approved public media →
`public, max-age=31536000, immutable` (a media id addresses one immutable object;
replacing a photo mints a new id). Everything else → `private, no-store` plus
`Pragma: no-cache`. Conversation attachments are explicitly never public.

## 7h. Base44 fully removed (Stage 10)

`components/ui/image.jsx` was deleted. It was dead scaffolding — **zero imports
anywhere** — carrying Wix Media Platform transform logic and a
`FALLBACK_IMAGE_URL` pointing at `static.wixstatic.com`, which would have made
production fetch a third-party asset whenever a Lustra upload failed to load.
Replaced by `components/lustra/TalentImage.jsx`, which renders a local silent
placeholder on error. **No `base44` or `wixstatic` reference remains in `src/`.**

## 7i. Backend gap #8 closed in Stage 11 — the marketing hero CMS

New: `MarketingHeroSlide` + `SlideAlign`, migration `MarketingHeroSlides`,
`Application/Content/HomePageFeatures.cs`, `AdminHeroSlidesController`, and
`GET /public/site/home` (anonymous, returns hero slides **and** live
announcements in one request so the largest element on the most
latency-sensitive view does not waterfall).

**Modelled on the approved design, not on a generic CMS.** The hero is
art-directed: separate portrait and landscape compositions served via
`<picture>` at 768px, plus per-slide `object-position` focal points. A generic
"image + title + text" entity could not express that and would have forced the
design to be rebuilt around the CMS. `site.test.ts` asserts the mapped object's
keys match the shipped `ExperienceSlide` exactly, so drift is a test failure.

| Endpoint | Auth |
| --- | --- |
| `GET /public/site/home` | anonymous |
| `GET/POST /admin/hero-slides`, `PUT/DELETE …/{id}` | `Cms.Manage` |
| `POST …/{id}/publish` · `/unpublish` · `/reorder` | `Cms.Manage` |

- **Saving never publishes.** `IsPublished` is absent from the request record;
  publication is a separate action, so a campaign can be prepared in place.
- **Scheduled slides do not leak** — published *and* inside the window is
  required, evaluated against the clock on every read.
- **An empty list is a valid, safe state.** The frontend falls back to its
  shipped slides, so an empty or unreachable CMS degrades to the approved design
  rather than a blank hero.

### A guard that was added, then removed
The publish handler first refused to unpublish the last live slide, to avoid
"emptying the hero". A test exposed the flaw: since empty is already safe and
recoverable, the rule only made it impossible to take the carousel down for a
rebrand without publishing a decoy slide. It was removed rather than worked
around — the test helper fighting the guard was the signal.

### Frontend: deliberately a read-only integration point
`services/siteService.ts` + `features/site/hooks.ts` expose the data and a
`toExperienceSlides` mapper. `experienceSlides.ts` and `components/lustra/hero/*`
are **untouched** — that is approved, actively-edited campaign work owned by
another contributor. Adoption is a small change (call `useHomePage`, use
`EXPERIENCE_SLIDES` as the empty-response fallback) and belongs to whoever owns
that design.

## 7j. Stage 12 — cleanup and hardening

**Direct booking create (last of gap #12).** `new Booking` previously appeared
exactly once repo-wide, so an engagement agreed by telephone could not be
recorded without fabricating an inquiry and proposal. `POST /management/bookings`
(`Bookings.Create`) records one with the same conflict checking, idempotency and
client+talent notification as the proposal path. It opens a real inquiry and
conversation marked "Booking arranged directly by management" — so the audit
trail is honest rather than dangling — and never invents a proposal
(`AcceptedProposalId` stays null).

**Bundle: 780 kB → 445 kB** (gzip 112 kB), and the >500 kB warning is gone.
Vendor libraries are split by CHANGE RATE (react / router / query / motion /
icons) so a returning visitor reuses them while only the app chunk re-downloads.

> An intermediate version used a catch-all `vendor` chunk. That **hoisted
> recharts (~390 kB) out of the lazy `AgencyAnalytics` chunk** into a bundle
> every guest downloaded, because naming a chunk overrides the dynamic-import
> boundary. Only genuinely shared libraries may be listed in `manualChunks`.

**Link integrity (`tests/unit/links.test.ts`).** Scans the source for
`<Link to=...>` literals and asserts each resolves to a registered route, plus
registry invariants (every protected route has roles, nav orders are unique).

> It failed on its first run and found a real defect: `TalentProfile` linked to
> `/app/report` — the **"Report profile" safety control** — and no such route
> existed, so it 404'd. A reporting path that silently fails is worse than none:
> it makes someone believe a concern was raised when nothing was recorded. Now
> built (`pages/Report.jsx` → `POST /api/v1/reports`).

### Service worker
There is **no service worker in this app** — nothing registers one and no
`sw.js` exists. The brief's caching rules (public images cacheable, private
conversation bodies never) therefore have nothing to configure. Introducing one
in a hardening pass would be a significant behaviour change, not cleanup, so it
is left as a deliberate decision for later. Note that the media `Cache-Control`
headers added in Stage 10 already encode the same policy at the HTTP layer.

## 7k. Backend changes for the concierge model

| Change | Why |
| --- | --- |
| `Conversation.TalentProfileId` (+ migration, composite index on `Type,TalentProfileId`) | Records the talent a thread is ABOUT. Context, not participation — adding a talent participant would give them read access to the client's private messages with management. |
| `POST /client/conversations` (start-or-find) | The client's only entry point beyond browsing. Reuses the existing thread for a client+talent pair rather than stacking empty duplicates. Only an **Approved && IsPublic** talent may be used as context, so a client cannot probe for hidden profiles by watching which ids succeed. |
| `TalentProfileId`/`TalentDisplayName`/`TalentSlug` on conversation DTOs | Public identity only, so management sees who a thread concerns and the client can navigate back. |
| `ConversationId` on direct booking create | Traces a booking to the discussion that produced it, and reuses that thread instead of opening a second one. Ownership-checked: the conversation must belong to the client being booked. |

**No message is ever auto-sent.** `StartConversation` opens the thread with zero
messages and passes a suggested opener as navigation state; the composer shows it
as a draft the client edits or deletes. Management only reads words the client
chose to send. Pinned by `No_message_is_sent_on_the_clients_behalf`.

### The completion proof (`ConciergeWorkflowTests`, 15 tests)

Guest → Message → auth (talent context parked in sessionStorage, 30-min TTL) →
back to the talent → conversation opens with talent context visible to management
→ real messages both ways → internal note the client cannot read → internal
booking created from the conversation → visible on the management calendar →
assigned talent sees the engagement → **client gets 403 on every internal
booking, list and calendar endpoint** → an unassigned talent gets 404.

## 8. Base44 removal inventory (Stage 2)

Runtime imports removed: `lib/AuthContext.jsx`, `lib/PageNotFound.jsx`,
`pages/{Login,Register,ForgotPassword,ResetPassword}.jsx`, `lib/app-params.js`,
`api/base44Client.js`. `components/ui/image.jsx` retains a `media.base44.com`
CDN-host branch, replaced by the Lustra media host in Stage 10.

## 9. Verified baseline (Stage 1)

- Frontend `npm run build` ✅ (main chunk 753 kB — split in Stage 12), `lint` ✅, `typecheck` ✅.
- Backend `build -c Debug` ✅ 0/0, `build -c Release` ✅ 0/0.
- Backend `test -c Debug` ✅ 250 passed, `test -c Release` ✅ 250 passed.
- No blocking architecture issue found. Backend Clean Architecture, Result/
  ProblemDetails, permission policies and R2 media lifecycle are sound and are
  extended, not replaced.
