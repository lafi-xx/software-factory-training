# Research: third-party service for in-app Notifications (Cadence)

Date of research: 2026-11-12. All facts come from vendor pages fetched on that date. Pricing and plans change, so check them again before you sign up.

## Question

Which third-party service should carry in-app Notifications for Students in Cadence (React Router v7, Node, SQLite/Drizzle), and in what role?

Two kinds of candidate:

- **Hosted inbox providers** (Knock, Novu, Courier, MagicBell), used in "signal only" mode.
- **Realtime transports / pub-sub** (Pusher Channels, Ably, PubNub, Supabase Realtime). These carry a "you have something new" signal while Cadence stores and renders the Notifications.

### Constraints

| # | Constraint | Weight |
| - | ---------- | ------ |
| C1 | EU data hosting | HARD |
| C2 | Only an opaque Cadence user id and a non-identifying payload leave Cadence | HARD |
| C3 | Cadence owns history and read state; the vendor is not the record | HARD |
| C4 | Usable in local dev/test with the DevUI user-switcher, without production credentials | HARD |
| C5 | Free tier covers a small project | Strongly preferred |
| C6 | Server trigger from Node, React client SDK, authenticated per-user subscription | Preferred |
| C7 | Realtime delivery | Nice-to-have |

## Summary recommendation

**Use a third-party service as the realtime transport only.** Cadence writes the Notification to SQLite, then publishes `{ type: "notification.created" }` (or an opaque Notification id) on a per-user private channel. On that signal the browser revalidates Cadence's own loader. History, read state and rendering all stay in Cadence.

**Top pick: Pusher Channels on the `eu` cluster (Ireland).**

- EU cluster selection has no stated plan restriction, so it is available on the free Sandbox plan.
- The Sandbox plan (200k messages/day, 100 concurrent connections) easily covers a small project.
- Private channels are authorised through an endpoint Cadence controls. That endpoint can read the DevUI session user, so the user-switcher works without changes.
- The wire protocol is publicly documented (v7). Pusher-compatible open-source servers (Soketi, Sockudo) can run locally or in CI, so you need no Pusher credentials there.

**Shortlist:**

1. **Pusher Channels (eu cluster)**: top pick, for the reasons above.
2. **Novu Cloud, EU region (Frankfurt)**: the only hosted inbox provider with EU residency on its **free** tier. It also has separate Dev/Prod environments and an MIT-licensed self-hostable core. Use it only if you later want Novu's workflow/channel features. In signal-only mode Novu still stores a message record and read state you would ignore. That duplicate state is a C3 smell, but it does not break the constraint as long as Cadence never reads it.
3. **Supabase Realtime (Broadcast) in an EU region**: a reasonable alternative. EU regions are selectable, broadcast authorisation uses RLS, and the local stack runs via `supabase start`. The catch is that Cadence would need Supabase-issued JWTs for its users, and free projects pause after 1 week of inactivity.

**Ruled out on the free tier:**

- **Ably**: technically strong, but EU regional routing is Business/Enterprise only.
- **Courier**: EU datacenter on Business/Enterprise only.
- **Knock**: no EU region found; all subprocessors are listed in the USA.
- **MagicBell**: no hosting region disclosed.
- **PubNub**: EU-only processing exists, but free-plan availability is unverified and some docs mention cross-region replication.

## Comparison table

Legend: Y = meets, N = fails, ~ = partial or caveat, ? = unverified.

| Vendor | C1 EU hosting | EU on free tier? | C2 opaque payload | C3 Cadence owns history | C4 local/dev without prod creds | C5 free tier | C6 auth model / SDKs | C7 realtime |
| ------ | ------------- | ---------------- | ----------------- | ----------------------- | ------------------------------- | ------------ | -------------------- | ----------- |
| **Pusher Channels** | Y `eu` cluster (Ireland, eu-west-1) | Y (no plan restriction stated) | Y (you publish whatever you choose) | Y (transport only, no history) | Y (separate app; Soketi/Sockudo locally) | 200k msg/day, 100 conns | Private channels, server-signed auth endpoint; `pusher` Node + `pusher-js` | Y |
| **Ably** | ~ EU routing via "regional constraints" | **N** (Business/Enterprise only) | Y | Y (transport; last-message TTL 1 day) | Y (separate apps, up to 100 per account) | 6M msg/mo, 500 conns, 500 MAU | Token/JWT auth with `clientId` + capabilities; React hooks | Y |
| **Supabase Realtime** | Y (pick an EU project region, e.g. eu-central-1) | ? (region choice on free tier not stated) | Y | Y (Broadcast is transport) | Y (`supabase start` local stack) | 2M msg/mo, 200 conns; pauses after 1 week idle | RLS on `realtime.messages`; needs Supabase JWT per user | Y |
| **PubNub** | ~ "EU-only processing" selectable | ? | Y | Y | ? | ? | Not researched in depth | Y |
| **Novu** (inbox) | Y EU region, Frankfurt | **Y** (all plans) | Y if payload is ids only | ~ (Novu stores messages + read state; Cadence must ignore it) | Y (Dev env; MIT self-host) | 10k workflow runs/mo, 2 envs | HMAC `subscriberHash` (mandatory in prod); `@novu/react` | Y |
| **Courier** (inbox) | Y EU datacenter, Ireland | **N** (Business/Enterprise) | Y if payload is ids only | ~ (vendor stores messages) | ~ (Test env counts toward sends) | 10k sends/mo | Backend-issued JWT scoped to `user_id` | Y |
| **Knock** (inbox) | **N** (no EU region found; subprocessors USA) | N | Y (realtime event carries only badge metadata) | ~ | Y (unlimited environments, per-env keys) | 10k msgs/mo | Signed user token ("enhanced security") | Y |
| **MagicBell** (inbox) | ? (no region disclosed) | ? | Y if ids only | ~ | ~ (1 project on free) | 1k deliveries/mo | Not researched further | Y |

## Per-vendor notes

### Pusher Channels (top pick)

- **Clusters:** `eu` (Ireland), described as AWS `eu-west-1`. Pusher recommends it for EU data-protection compliance. The page defines a cluster as "the physical location of the servers that handle requests", but it does **not** state explicitly where data is stored, and it lists no plan restriction on cluster choice. https://pusher.com/docs/channels/miscellaneous/clusters/
  - **Flag:** confirm processing/storage scope with Pusher's DPA before production. That is a lower risk here, because the payload carries no personal data.
- **Free Sandbox plan:** 200k messages/day, 100 concurrent connections. https://pusher.com/channels/pricing/
  - Limits apply at account level and are shared across apps. https://support.pusher.com/hc/en-us/articles/360019305253-How-does-my-Channels-plan-level-affect-the-limits-of-my-apps- (older article)
  - The number of apps allowed per account on Sandbox is **unverified**.
- **Auth:** a private channel subscription needs "an authorization token signed by your server". The client calls your endpoint (default `/pusher/auth`). The server checks the user, signs with `authorizeChannel`, and returns 403 if the user is not allowed. https://pusher.com/docs/channels/server_api/authorizing-users/
  - Suggested channel name: `private-user-<opaqueCadenceId>`.
  - The endpoint reads the Cadence session, so switching users in DevUI just re-subscribes as the new user.
- **Local/test:** the protocol is publicly documented (current version 7). https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol/
  - Soketi is an open-source, Pusher-protocol-compatible server. To switch, change host/port and credentials. https://github.com/soketi/soketi
  - Upstream's last release was 1.6.1 (March 2024). A maintained fork exists (https://github.com/aloware/soketi), and so does the Rust alternative Sockudo (https://github.com/soketi/soketi/issues/1302). Pick one and pin it.

### Ably

- **Free package:** 6M messages/month, 500 concurrent connections, 500 concurrent channels, 500 msg/s, 64 KiB messages, up to 100 apps and 100 keys. https://ably.com/docs/platform/pricing/limits
- **Pricing page:** Free is "up to 500 MAUs". "Regional constraints (EU/US/AUS routing)" is Business and Enterprise only, so it **fails C1 on free**. https://ably.com/pricing
- **Auth:** your server issues a JWT/TokenRequest carrying `clientId` and capabilities. The SDK renews it automatically. TTL is up to 24h. https://ably.com/docs/auth/token
- Technically the best fit if you are willing to pay for Business.

### Supabase Realtime

- **EU regions:** eu-west-1 (Ireland), eu-west-3 (Paris), eu-central-1 (Frankfurt), eu-north-1 (Stockholm). Pick a specific region; "general" regions may deploy outside the jurisdiction. https://supabase.com/docs/guides/platform/regions
  - Whether these are selectable on the free plan is **unverified**.
- **Free plan:** 200 concurrent connections, 2M Realtime messages/month. Projects pause after 1 week of inactivity. https://supabase.com/pricing
- **Auth:** Broadcast/Presence authorisation uses RLS policies on `realtime.messages` and needs supabase-js ≥ 2.44.0. https://supabase.com/docs/guides/realtime/authorization
  - Cadence does not use Supabase Auth, so it would have to mint Supabase-compatible JWTs. That is extra integration work.
- **Local:** `supabase start` runs the stack in Docker. https://supabase.com/docs/guides/local-development

### PubNub

- The trust FAQ says customers can select US-only, EU-only or APAC-only processing. https://www.pubnub.com/trust/faq/
- Region-specific message storage is a support request on paid plans. https://support.pubnub.com/hc/en-us/articles/4404082840205-Can-I-choose-storage-region
- The privacy docs mention cross-region transfer and replication. https://www.pubnub.com/docs/privacy/overview
- Free-tier limits and whether EU-only applies on free are **unverified**. Not shortlisted.

### Novu (best hosted inbox option)

- **Pricing:** the Free plan has 10k workflow runs/month, 5 workflows, 2 environments (Dev, Prod) and 24h activity-feed retention. US **and EU** data residency are included on Free. https://novu.co/pricing
- **EU region:** Frankfurt. API `https://eu.api.novu.co/v1`, socket `wss://eu.socket.novu.co`. The region is chosen at account creation, and API keys are bound to it. EU is available on all plans. https://docs.novu.co/platform/additional-resources/security
- **Auth:** `subscriberHash` = HMAC-SHA256(secretKey, subscriberId), computed server-side. Production rejects Inbox requests without it. https://docs.novu.co/platform/inbox/prepare-for-production
  - `@novu/react` requires React 18 or 19. https://docs.novu.co/platform/sdks/react
- **Self-host:** the core is MIT, and the `enterprise` folder is commercially licensed. https://github.com/novuhq/novu
  - Some cloud features are unavailable when self-hosted. The recommended self-host setup needs Redis, MongoDB and S3-compatible storage, which is heavy for local dev. https://docs.novu.co/community/self-hosting-novu/overview
  - The pricing page lists "self-hosted" under Enterprise, which conflicts with the MIT community edition. Treat the commercial self-host as an Enterprise offering and the community edition as MIT.
- **Signal-only fit:** possible, by triggering a workflow whose in-app step carries only an opaque id. Novu still creates a stored message with its own read/seen state, though, and its Inbox UI renders Novu's record. To keep C3 you would use only Novu's socket/unread signal and ignore its Inbox. That uses about 10% of the product.

### Courier

- **EU datacenter:** Ireland (eu-west-1), "available on every paid plan: Business and Enterprise". It uses a separate EU workspace (`app.eu.courier.com`, `api.eu.courier.com`). https://www.courier.com/docs/platform/workspaces/eu-datacenter
- **Free Developer plan:** 10k sends/month. Test-environment sends count toward the total. https://www.courier.com/pricing
- **Auth:** the backend calls `POST /auth/issue-token` with a `user_id:` scope, and the client calls `signIn({ userId, jwt })`. https://www.courier.com/docs/platform/inbox/authentication
- **Fails C1 on the free tier.**

### Knock

- **Free:** 10k messages/month and unlimited isolated environments. The pricing page does not mention a data region. https://knock.app/pricing
- **Subprocessors:** AWS, located in the USA. Every listed subprocessor is in the USA. https://knock.app/legal/subprocessors
- **No EU region found in primary sources.** Fails C1.
- **Useful design note:** Knock's realtime `new-message` event "will not contain the full message contents", only badge-count metadata. In other words Knock itself uses the signal-then-fetch pattern. https://docs.knock.app/in-app-ui/api-overview
- **Auth:** "enhanced security" mode requires a server-signed user token. Per-environment API keys. https://docs.knock.app/in-app-ui/security-and-authentication, https://docs.knock.app/version-control/environments

### MagicBell

- **Free Builder plan:** 1,000 deliveries/month, 1 project. No regions mentioned. https://www.magicbell.com/pricing
- **Trust centre:** claims GDPR compliance and a DPA, but names no cloud provider or region. https://magicbell.com/security
- **C1 unverifiable.** Not shortlisted.

## Risk: does a third-party service add enough over polling?

Under these constraints, the third-party service carries no data and no state. It does exactly one thing: it shortens the time from "Notification row inserted" to "badge updates". Everything else (history, read state, rendering, auth) is Cadence code either way.

- **What polling costs:** a `GET` to a Cadence endpoint (or a `useRevalidator` on an interval / on window focus) that returns the unread count. That is one indexed SQLite query per poll.
  - At small scale (tens to hundreds of Students), a 30–60s interval is trivial load.
  - It needs no vendor, no EU review, no second set of credentials, and no auth endpoint. It works identically in dev/test and with the DevUI user-switcher.
- **What the vendor adds:** sub-second delivery, fewer idle requests, and a ready-made reconnection/backoff client.
- **What the vendor costs:** another subprocessor to list in the DPA, an auth endpoint, a local emulator (Soketi) or a dev app in CI/dev, and a failure mode where a missed signal leaves the badge stale. Knock notes events may be throttled, so a client must not assume every event arrives.
- **Mitigation if you adopt a transport anyway:** keep a slow poll or revalidate-on-focus as the fallback, so correctness never depends on the vendor. The transport then becomes a latency optimisation only.
- **Assessment:** for Notifications to Students (not chat or live collaboration), realtime is a nice-to-have (C7). The marginal value of a vendor over polling is **low**. Pusher keeps the integration small and reversible, but the risk is still worth surfacing: you are taking on a vendor mainly to save a polling interval.
- **Alternative to consider:** Server-Sent Events from the Node server itself also gives realtime with no vendor. It only gets harder if Cadence runs on multiple instances.

## Unverified / flagged

- Pusher: exact data storage scope of the `eu` cluster, and the Sandbox app-count limit.
- Supabase: whether EU regions are selectable on the free plan.
- PubNub: free-tier limits, and whether EU-only processing applies on free.
- MagicBell: hosting region.
- Knock: third-party sources mention an EU residency roadmap, but no Knock primary source confirms an EU region as of this date.
- Novu: the pricing page lists self-hosting under Enterprise, while the repo is MIT core.

## Sources

- https://pusher.com/channels/pricing/
- https://pusher.com/docs/channels/miscellaneous/clusters/
- https://pusher.com/docs/channels/server_api/authorizing-users/
- https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol/
- https://support.pusher.com/hc/en-us/articles/360019305253-How-does-my-Channels-plan-level-affect-the-limits-of-my-apps-
- https://github.com/soketi/soketi
- https://github.com/soketi/soketi/issues/1302
- https://github.com/aloware/soketi
- https://ably.com/pricing
- https://ably.com/docs/platform/pricing/limits
- https://ably.com/docs/auth/token
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/local-development
- https://www.pubnub.com/trust/faq/
- https://support.pubnub.com/hc/en-us/articles/4404082840205-Can-I-choose-storage-region
- https://www.pubnub.com/docs/privacy/overview
- https://novu.co/pricing
- https://docs.novu.co/platform/additional-resources/security
- https://docs.novu.co/platform/inbox/prepare-for-production
- https://docs.novu.co/platform/sdks/react
- https://docs.novu.co/community/self-hosting-novu/overview
- https://github.com/novuhq/novu
- https://www.courier.com/docs/platform/workspaces/eu-datacenter
- https://www.courier.com/pricing
- https://www.courier.com/docs/platform/inbox/authentication
- https://knock.app/pricing
- https://knock.app/legal/subprocessors
- https://docs.knock.app/in-app-ui/api-overview
- https://docs.knock.app/in-app-ui/security-and-authentication
- https://docs.knock.app/version-control/environments
- https://www.magicbell.com/pricing
- https://magicbell.com/security
