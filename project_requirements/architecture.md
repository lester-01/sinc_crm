# Architecture

## Frontend

Use Vite + React as a single-page app.

Suggested structure:

```txt
src/
  app/
    router.tsx
    queryClient.ts
  components/
    layout/
    ui/
  features/
    auth/
    clients/
    conversations/
    deals/
    dashboard/
  lib/
    apiClient.ts
    supabaseClient.ts
    realtime.ts
  pages/
    LoginPage.tsx
    DashboardPage.tsx
    ClientsPage.tsx
    ClientDetailPage.tsx
    ConversationPage.tsx
    PipelinePage.tsx
    DealDetailPage.tsx
```

## Backend

Use Cloudflare Workers + Hono.

Suggested structure:

```txt
worker/
  src/
    index.ts
    middleware/
      auth.ts
      requireRole.ts
    routes/
      clients.ts
      conversations.ts
      messages.ts
      deals.ts
      dashboard.ts
      users.ts
    services/
      clientsService.ts
      conversationsService.ts
      dealsService.ts
      dashboardService.ts
    lib/
      supabaseAdmin.ts
```

## Auth Model

Use Supabase Auth.

Store app-specific role and display profile in `profiles`.

Roles:

- `client`
- `sales`
- `manager`

Backend must enforce role permissions. The frontend should hide unavailable actions, but the Worker must still reject unauthorized API calls.

## Realtime Model

Use Supabase Realtime for:

- new chat messages
- conversation assignment changes
- conversation status changes
- deal owner changes
- deal stage changes

Use TanStack Query for normal API reads and invalidate queries when realtime events arrive.

