# Pipeline stages (FIX-100, FIX-102)

SINC CRM uses eight deal stages. Stages are linear for active progression; `lost` and `won` are terminal (with `lost` → `new_lead` reopen allowed in demo).

| Stage | Label | Meaning |
|-------|-------|---------|
| `new_lead` | New lead | Student entered the funnel; not yet contacted. |
| `contacted` | Contacted | Sales reached out at least once. |
| `consultation_booked` | Consultation booked | Discovery call scheduled or completed. |
| `documents_requested` | Documents requested | Application documents requested from student. |
| `application_started` | Application started | Student began the application. |
| `submitted` | Submitted | Application submitted to institution. |
| `won` | Won | Enrolled or contract signed. |
| `lost` | Lost | Opportunity closed without enrollment. |

## Allowed transitions (UI enforcement)

From each stage, the app offers only these next stages (plus staying on current stage via pipeline column; deal detail uses the same rules):

- **new_lead** → contacted, lost  
- **contacted** → consultation_booked, lost  
- **consultation_booked** → documents_requested, lost  
- **documents_requested** → application_started, lost  
- **application_started** → submitted, lost  
- **submitted** → won, lost  
- **won** → (no forward moves)  
- **lost** → new_lead (reopen)

Managers may reassign owners at any time. Sales may move only deals they own.

## Ownership

- **Manager:** sees all deals; can filter pipeline by owner.  
- **Sales:** sees and moves own deals only.  
- **Client:** no pipeline access (redirected to conversations).
