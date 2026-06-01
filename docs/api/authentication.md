# API authentication

The SINC CRM Worker API does **not** handle login or sign-up. Clients obtain a Supabase access token via **Supabase Auth** (the React SPA uses `@supabase/supabase-js`), then send that token on every protected request.

## Obtaining a token

1. Sign in through the app at `http://localhost:5173` (local) or your deployed Pages URL.
2. Or call Supabase Auth directly, e.g. `supabase.auth.signInWithPassword({ email, password })`.
3. Use the returned session's `access_token` as the Bearer token.

### Demo users (seeded)

Password for all demo accounts: **`demo1234`**. Full list with seed notes: [README § Demo users](../../README.md#demo-users).

| Role | Email | Display name |
|------|-------|--------------|
| Manager | `manager1@demo.local` | Morgan Manager |
| Manager | `manager2@demo.local` | Alex Manager |
| Sales | `sales1@demo.local` | Sam Sales |
| Sales | `sales2@demo.local` | Jordan Sales |
| Sales | `sales3@demo.local` | Riley Sales |
| Client | `client1@demo.local` | Aida Client |
| Client | `client2@demo.local` | Bek Client |
| Client | `client3@demo.local` | Cara Client |
| Client | `client4@demo.local` | Dana Client |

## Request headers

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

Only `GET /api/health` is public (no token required).

## Roles

| Role | Description |
|------|-------------|
| `client` | Student/client portal — own profile, conversations, and deals only |
| `sales` | CRM team member — reads all clients, conversations, and deals; creates clients and deals; replies when a conversation is assigned to self; updates **own** deal stages; adds notes on any deal |
| `manager` | Oversight — read-all access, dashboard, reassign deal owners and conversation assignees, move any deal stage; **cannot** create clients/deals, post chat messages, or add deal notes |

Per-endpoint permission matrix: [openapi.yaml](./openapi.yaml) (`x-permissions` on each operation).

## Error responses

All errors use a JSON body:

```json
{ "error": "Human-readable message" }
```

| Status | When |
|--------|------|
| `400` | Request body or query failed Zod validation |
| `401` | Missing, invalid, or expired Bearer token |
| `403` | Authenticated but role or resource access denied |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate client email) |
| `500` | Server or database error |
| `503` | Supabase misconfiguration during auth |

See [openapi.yaml](./openapi.yaml) for per-endpoint permissions and examples.
