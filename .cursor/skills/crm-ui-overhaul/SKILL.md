---
name: crm-ui-overhaul
description: Polish SINC CRM UI with bold distinctive design using shadcn + Tailwind. Use when improving layout, typography, colors, or visual hierarchy. Never change API hooks, auth, routing, or business logic.
---

# SINC CRM UI Overhaul

## Non-negotiables
- Preserve all existing behavior: hooks, mutations, role checks, routes, data-testid attributes
- Stay in shadcn/ui + Tailwind; use semantic tokens (bg-primary, text-muted-foreground)
- Match wireframe structure in project_requirements/ui-wireframes.md
- Use npx shadcn@latest add for missing components — do not hand-roll equivalents

## Aesthetic direction
- Bold, distinctive, memorable — NOT generic AI slop
- Professional CRM context: education sales team, trustworthy, energetic
- Custom typography (avoid Inter/Roboto), cohesive color system via CSS variables in src/index.css
- Refined motion: subtle transitions on nav, cards, pipeline drag areas

## Page order
1. Design tokens (index.css + tailwind.config.js)
2. AppShell (nav, header search placeholder, user menu)
3. LoginPage
4. DashboardPage
5. ClientsPage + ClientDetailPage
6. ConversationPage
7. PipelinePage + DealDetailPage
