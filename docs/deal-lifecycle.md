# Deal lifecycle (FIX-101, FIX-088)

## States

- **Active:** any stage except `won` or `lost`.  
- **Won:** terminal success; value and intake remain visible.  
- **Lost:** terminal failure; **lost reason** required when marking lost (preset or custom text).

## Lost reason (UI)

When stage becomes `lost`, users pick a preset (Budget, Chose another school, No response, Visa denied, Other) or enter custom copy for **Other**.

## Reopen

A **lost** deal may move back to **new_lead** to restart the funnel (demo behavior). Production may restrict this via policy.

## Expiry / auto-close

Not implemented in the worker today. Recommended future rules (documentation only):

- Auto-**lost** after N days in `new_lead` with no activity.  
- Optional reminder before auto-close.  
- **Won** deals remain read-only except notes.

## Reassignment

Managers can reassign `owner_id` on deal detail. Sales cannot reassign to others.

## Notes and history

Stage changes append to `deal_stage_history`. Notes are append-only on deal detail.
