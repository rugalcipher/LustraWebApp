# AGENTS.md

## Project context

Lustra web frontend — React + TypeScript + Vite. Originally exported from
Base44; Base44 has been removed from all runtime flows (Stage 2). The app now
integrates directly with the Lustra .NET 8 API.

- Backend repo: `P:\Rugal Cipher\Companies\Lustra\Softwares\LustraPlatform`
- API base: `/api/v1` · SignalR hub: `/hubs/chat`
- Integration plan and route→endpoint matrix: `INTEGRATION.md`

Lustra is a premium booking-inquiry platform for a private entertainment agency
(adults only). Clients browse represented Talent and submit **inquiries**;
Management confirms bookings. There is no payment, checkout, wallet or payout
anywhere in the product, and no public Talent self-registration.

## Architecture rules

Data flows one way and only one way:

```
page → feature hook → React Query → typed service → src/api/client.ts → .NET API
```

- Never call `fetch`/axios from a component. `src/api/client.ts` is the single
  HTTP boundary (auth headers, refresh, ProblemDetails, idempotency, timeouts).
- Never touch tokens outside `src/api/tokenStorage.ts` and
  `src/api/authTokenCoordinator.ts`.
- All server state lives in React Query, keyed through `src/api/queryKeys.ts`.
  Zustand (`src/stores/`) is for client state only — never server collections.
- Roles and permissions come from `GET /auth/me` claims. Hidden navigation is
  not a security control, and the dev role switcher never grants real access.
- `src/app/routeRegistry.tsx` is the single source of truth for route → access,
  shell and navigation. Don't duplicate role logic in pages or shells.

## Mock vs API mode

`VITE_DATA_MODE` (`mock` | `api`) selects the adapter; see `.env.example`.
In API mode there is **no** silent fallback to mock data, no fabricated success
and no hidden failure — unimplemented paths throw `NotImplementedInApiModeError`
loudly. A production build refuses to start in mock mode.

## Checks to run before finishing

```bash
npm run typecheck
npm run lint
npm run test        # vitest unit tests
npm run build
```

`npm run test:e2e` runs the Playwright smoke suite.

## Design

Do not rewrite the approved Lustra visual design, and do not remove the
immersive one-Talent-at-a-time Discover experience.
