# Clinical Data Hub Demo Script

## 5-Minute Recording Script

Use this as a spoken script while screen recording.

Suggested primary login:

- `sponsor@clinicalhub.dev`
- `Password123!`

Optional admin segment:

- use your super admin account if available

---

## 0:00 to 0:20

“This is Clinical Data Hub, a clinical study operations platform for study setup, eCRF data capture, query management, document governance, exports, auditability, and electronic signatures.”

Open:

- `/login`

Log in with the sponsor account.

---

## 0:20 to 0:45

“After login, the dashboard gives an operational summary across the platform, including active studies, total subjects, open queries, unread tasks, and recent activity.”

Point out:

- top navigation
- account access
- notifications
- logout

---

## 0:45 to 1:05

Open:

- `/account`

Say:

“Each user also has an account workspace with profile details, study responsibilities, site assignments, and notification history.”

Then go to:

- `/studies`

Open the seeded study.

---

## 1:05 to 1:30

On the study overview page, say:

“Inside a study, the workflow is organized across tabs for overview, forms, subjects, data, queries, sites, users, documents, audit, and export.”

Then point to the overview metrics and sign-off section:

“Here we can track study readiness, enrollment progress, and capture a study-level electronic sign-off with immutable audit history.”

---

## 1:30 to 1:55

Open:

- `/studies/[studyId]/forms`

Say:

“Form templates are version-controlled. Published CRFs are locked from direct editing, and changes move through a next-version workflow so approved form history is preserved.”

Briefly show:

- published template
- read-only state
- next version action

---

## 1:55 to 2:30

Open:

- `/studies/[studyId]/subjects`

Say:

“Subject operations are managed directly inside the study. I can enroll a new subject into a site, review the roster, and update lifecycle state such as screened, enrolled, completed, or withdrawn.”

Show:

- enroll subject form
- site dropdown
- subject identifier
- existing subject card
- status and withdrawal fields

---

## 2:30 to 3:10

Open:

- `/studies/[studyId]/data`

Say:

“This is the live eCRF workspace. Teams can select a subject, choose a published CRF, capture visit-based responses, save drafts, and submit entries for review.”

Show:

- subject selector
- CRF selector
- visit handling
- entry form

Then point to the sign-off area:

“Once an entry is submitted, it can be electronically signed and locked with password re-entry and certification meaning, giving us a controlled approval step for study data.”

---

## 3:10 to 3:45

Open:

- `/studies/[studyId]/queries`

Say:

“The query workflow is fully interactive. Users can review discrepancies, see response history, assign ownership, update status, and respond directly from the study queue.”

Show:

- open query
- response history
- assignment dropdown
- status dropdown
- response field

---

## 3:45 to 4:15

Open:

- `/studies/[studyId]/documents`

Say:

“The document register supports version history, signature state, and controlled lifecycle management. Documents can be registered, versioned, signed, and protected from in-place edits once approved.”

Show:

- document list
- version history
- signature panel
- next version action

---

## 4:15 to 4:40

Open:

- `/studies/[studyId]/export`

Say:

“Exports are also controlled through electronic signatures. Users can request CSV, JSON, or CDISC exports, and each export request is signed, time-stamped, and tracked with signer visibility.”

Show:

- export format selector
- signature meaning
- password re-entry
- export history

---

## 4:40 to 5:00

Open:

- `/studies/[studyId]/audit`

Say:

“Finally, the audit trail captures major workflow events across the study, including subject activity, CRF actions, query responses, document operations, signatures, and exports.”

Close with:

“Clinical Data Hub brings study execution, oversight, and compliance-oriented workflows into one operational platform.”

---

## Optional 30 to 60 Second Admin Add-On

If you want an extended version, log in as a super admin and open:

- `/admin`

Say:

“The admin workspace provides platform governance for user provisioning, role control, site assignments, notifications, study oversight, document tracking, and signature oversight.”

Show:

- user management
- study governance
- notifications
- signatures register

---

## Recording Tips

- Keep browser zoom at `90%` or `100%`
- Use one seeded study all the way through
- Avoid typing too much live unless you want to demonstrate creation flows
- If you record with voice, keep a steady pace and move the cursor deliberately
- For a cleaner demo, open the tabs in this order before recording:
  - `/dashboard`
  - `/account`
  - `/studies`
  - study overview
  - `/forms`
  - `/subjects`
  - `/data`
  - `/queries`
  - `/documents`
  - `/export`
  - `/audit`
