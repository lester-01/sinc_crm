# Phase 08 — Conversations & realtime chat

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md)

---

## Goals

- [x] Worker: `GET/POST /api/conversations`, `GET/PATCH assign/status`, `POST messages`; `last_message_at` on send
- [x] Role rules: client own threads; sales unassigned + assigned-to-self; manager all + reassign
- [x] `GET /api/users` for manager reassign dropdown (team members)
- [x] ConversationPage: queue tabs, thread view, assign/reassign, reply
- [x] `src/lib/realtime.ts` — thread + message subscriptions with query invalidation
- [x] New chat from client detail + client “New conversation” on Conversations page
- [x] E2E/API: `CHAT-*`, `API-CONV-*` in `e2e/specs/phase-08-conversations.spec.ts`

---

## Verify

```bash
npm run dev
cd worker && npm run dev
npm run test:e2e:dev -- --grep @phase8
```

---

## Handoff to Phase 9

Deals API, pipeline board, deal detail — `DEAL-*`, `PIPE-*` tests.
