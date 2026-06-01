# Student CRM — product overview

Full-stack CRM for an education sales team: role-based access, realtime chat, deal pipeline, and a manager dashboard.

## Product summary

Clients log in and chat with the team. Sales users manage conversations, create deals, assign owners, and move deals through a pipeline. Managers reassign work and view aggregate metrics.

## MVP scope

Focus on a working production-style app first:

- Auth and roles (manager, sales, client).
- Client can start and use chat.
- Sales can assign conversations and reply.
- Sales can create client deals with owner and pipeline stage.
- Manager can reassign conversations and deals.
- Pipeline board shows real deal data.
- UI is clean and usable (shadcn/ui).
- Frontend (Cloudflare Pages) and API (Cloudflare Worker) deployed.

Out of scope or optional for v1: drag-and-drop pipeline, complex reporting, email delivery, file upload, payments, advanced notifications.

## Stack

- Vite, React, TypeScript, React Router, TanStack Query, shadcn/ui, Tailwind CSS
- Cloudflare Workers, Hono
- Supabase Auth, Postgres, Realtime

## Core user flow

1. Client signs up or logs in.
2. Client starts a chat.
3. Sales rep assigns the conversation.
4. Sales rep creates a deal for the client.
5. Deal appears on the pipeline board.
6. Sales rep moves the deal through stages.
7. Manager reassigns the deal to another sales rep.
8. Client detail shows profile, conversations, deals, and activity.

## Specification files

- [requirements.md](./requirements.md)
- [architecture.md](./architecture.md)
- [database.md](./database.md)
- [api.md](./api.md)
- [ui-wireframes.md](./ui-wireframes.md)
- [evaluation.md](./evaluation.md) — acceptance criteria and regression checklist
