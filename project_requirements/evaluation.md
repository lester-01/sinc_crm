# Acceptance criteria

Use this checklist for local verification, regression (`@smoke` / `EVAL-*` tests), and portfolio demos.

## Must have

- App runs locally from the README instructions.
- Supabase Auth works.
- Client can create and use chat.
- Sales user can assign and reply to conversations.
- Manager can reassign conversations.
- Sales user can create a deal for a client.
- Deal is associated with the correct client.
- Deal owner can be assigned and reassigned.
- Pipeline stages work.
- Stage history is recorded.
- Dashboard counts are based on real database data.
- UI is usable and built with shadcn/ui.
- Frontend and backend are deployed to Cloudflare.
- README includes deployed app URL and Worker/API URL.
- README explains setup, environment variables, schema application, seeds, and demo users.

## Strong implementation

- Backend role checks are correct.
- Database schema is normalized and indexed.
- Realtime events update the UI without manual refresh.
- Pipeline board is easy to use.
- Client detail page gives a useful sales overview.
- TanStack Query is used consistently.
- Loading, empty, and error states are handled.
- Code is modular and easy to navigate.
- Deployed build works for end-to-end walkthroughs.
- README documents setup, env vars, schema, seeds, and demo users.

## Capability areas

| Area | Weight (reference) |
| --- | ---: |
| Auth and roles | 10 |
| Client CRM | 15 |
| Realtime chat | 15 |
| Conversation assignment | 10 |
| Deal CRUD and ownership | 15 |
| Pipeline stages/history | 15 |
| Dashboard | 10 |
| UI quality | 5 |
| README and local setup | 5 |

Total: 100 (reference weighting for self-review)

## Design review questions

- What should happen if a sales user tries to update a deal they do not own?
- How are role checks enforced on the backend?
- How does the app avoid showing another client's private chat?
- What queries need indexes and why?
- How are realtime subscriptions cleaned up?
- What would you improve with another iteration?
