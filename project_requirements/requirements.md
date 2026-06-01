# Requirements

## Roles

### Client

- Can sign up and log in.
- Can view their own profile.
- Can start chat conversations.
- Can send and receive messages.
- Can see high-level status of their active deal, if one exists.

### Sales Rep

- Can log in.
- Can see unassigned conversations.
- Can assign conversations to themselves.
- Can reply to assigned conversations.
- Can create clients manually.
- Can create deals for clients.
- Can own deals.
- Can move owned deals through stages.
- Can add deal notes.

### Manager

- Can see all clients, conversations, and deals.
- Can assign/reassign conversations.
- Can assign/reassign deal owners.
- Can move any deal.
- Can view dashboard totals.

## Deal Pipeline Stages

- `new_lead`
- `contacted`
- `consultation_booked`
- `documents_requested`
- `application_started`
- `submitted`
- `won`
- `lost`

## Must Have

- Auth-protected app.
- Role-aware navigation.
- Client profile page.
- Realtime chat.
- Conversation assignment and reassignment.
- Deals associated with clients.
- Deal owner assignment and reassignment.
- Pipeline board.
- Deal stage history.
- Deal notes or activity timeline.
- Dashboard with counts by stage and owner.
- shadcn/ui-based UI.
- Seed data.
- A project README with setup instructions, environment variables, schema application, seeds, and demo users.

## Nice To Have

- Drag and drop pipeline board.
- Unread chat counts.
- Search clients and deals.
- Deal value field.
- Lost reason field.
- Toast notifications.

## Out Of Scope

- File upload.
- Email.
- Payments.
- AI chatbot.
- In-app calendar booking.
- Multi-company support.
- Complex reporting.
