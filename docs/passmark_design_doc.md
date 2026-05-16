# Design Document
## Passmark — Event Accreditation Platform
**Version:** 1.0  
**Status:** Draft  
**Author:** Design / Frontend  
**Last Updated:** May 2026

---

## 1. Design Philosophy

Passmark is a utility-first product. It exists to help people get work done quickly and accurately — not to impress them with aesthetic flourishes. The design language reflects that:

- **Clarity over decoration** — every element on screen has a job
- **Status at a glance** — application state is always visible; no hunting for information
- **Low error rate** — forms guide users, validate early, and block invalid submissions before they happen
- **Confidence on admin side** — reviewers need density; the admin UI is information-dense with clear action affordances

---

## 2. Brand Identity

### 2.1 Name and Tagline
**Passmark** — *Credentials, without the complexity.*

### 2.2 Logo Concept
A bold sans-serif wordmark with a checkmark integrated into the "k" ascender. The checkmark doubles as the visual metaphor for approval/pass. No illustrative logo — wordmark only in V1.

### 2.3 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-brand` | `#1B4FD8` | Primary actions, active nav, links |
| `--color-brand-dark` | `#1340B0` | Hover state on brand |
| `--color-brand-light` | `#EEF2FF` | Chip backgrounds, subtle highlights |
| `--color-success` | `#16A34A` | Approved status, success toasts |
| `--color-danger` | `#DC2626` | Rejected status, error states |
| `--color-warning` | `#D97706` | Under review status, caution |
| `--color-neutral-50` | `#F9FAFB` | Page background |
| `--color-neutral-100` | `#F3F4F6` | Card backgrounds, table rows (alt) |
| `--color-neutral-300` | `#D1D5DB` | Borders, dividers |
| `--color-neutral-600` | `#4B5563` | Secondary text |
| `--color-neutral-900` | `#111827` | Primary text |
| `--color-white` | `#FFFFFF` | Card surfaces, form backgrounds |

### 2.4 Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Heading 1 | Inter | 700 | 28px |
| Heading 2 | Inter | 600 | 22px |
| Heading 3 | Inter | 600 | 18px |
| Body | Inter | 400 | 15px |
| Label | Inter | 500 | 13px |
| Caption | Inter | 400 | 12px |
| Button | Inter | 600 | 14px |

Font loaded from Google Fonts. Fallback: system-ui, sans-serif.

### 2.5 Spacing
8px base unit. All spacing in multiples: 4, 8, 12, 16, 24, 32, 48, 64.

### 2.6 Border Radius
- Cards: `12px`
- Buttons: `8px`
- Inputs: `8px`
- Chips/badges: `20px`

---

## 3. Component Library

### 3.1 Buttons

**Primary**
```
Background: --color-brand
Text: white
Hover: --color-brand-dark
Disabled: opacity 40%, cursor not-allowed
Height: 40px
Padding: 0 20px
```

**Secondary (Outlined)**
```
Border: 1.5px solid --color-brand
Text: --color-brand
Hover: --color-brand-light background
Height: 40px
```

**Danger**
```
Background: --color-danger
Text: white
Hover: #B91C1C
```

**Ghost**
```
No border, no background
Text: --color-neutral-600
Hover: --color-neutral-100 background
Used for: Cancel, back actions
```

---

### 3.2 Form Inputs

**Text Input**
```
Border: 1.5px solid --color-neutral-300
Focus: 1.5px solid --color-brand, box-shadow: 0 0 0 3px rgba(27,79,216,0.15)
Error: 1.5px solid --color-danger
Height: 40px
Padding: 0 12px
Label: above the input, 13px, 500 weight, --color-neutral-900
Helper text: below input, 12px, --color-neutral-600
Error text: below input, 12px, --color-danger
```

**Dropdown / Select**
- Custom-styled using Tailwind; native `<select>` on mobile
- Arrow icon: Lucide `ChevronDown`

**File Upload**
- Drag-and-drop zone with dashed border (--color-neutral-300)
- On hover: --color-brand-light background
- After upload: thumbnail preview (photo) with remove button
- Size indicator shown below thumbnail
- Error state: red border + error message

**Checkbox**
- Custom styled: 18px square, brand color fill when checked
- Lucide `Check` icon inside when checked
- Used for: T&C, zone access selection

---

### 3.3 Status Badges

| Status | Background | Text | Border |
|---|---|---|---|
| Draft | `#F3F4F6` | `#6B7280` | none |
| Submitted | `#EEF2FF` | `#1B4FD8` | none |
| Under Review | `#FEF3C7` | `#92400E` | none |
| Approved | `#DCFCE7` | `#166534` | none |
| Rejected | `#FEE2E2` | `#991B1B` | none |

All badges: 6px 12px padding, 20px border-radius, 12px font, 600 weight.

---

### 3.4 Cards
```
Background: white
Border: 1px solid --color-neutral-100
Border-radius: 12px
Box-shadow: 0 1px 3px rgba(0,0,0,0.08)
Padding: 24px
```

---

### 3.5 Toast Notifications
- Appears bottom-right
- Auto-dismiss: 4 seconds
- Types: Success (green left border), Error (red), Info (brand blue)
- Max 3 toasts stacked

---

### 3.6 Modal / Dialog
- Overlay: `rgba(0,0,0,0.4)` backdrop
- Dialog: white, 12px radius, max-width 480px, centered
- Close: Lucide `X` icon top-right
- Used for: T&C text, confirmation prompts, delete confirmation

---

## 4. Page Designs

### 4.1 Login Page (Vendor)

**Layout:** Full-page split — left panel (brand/illustration), right panel (form). Collapses to single-column on mobile.

**Left Panel:**
- Brand color (`--color-brand`) background
- Passmark wordmark (white)
- Tagline: "Credentials, without the complexity."
- Optional: minimal geometric illustration of an event badge

**Right Panel:**
- "Welcome back" heading
- Subtext: "Log in with the credentials sent to your email."
- Username field
- Password field (with show/hide toggle, Lucide `Eye`/`EyeOff`)
- "Forgot password?" link (right-aligned, below password)
- Login button (full-width, primary)
- Error banner below button on failed login

---

### 4.2 One-Time Registration Form

**Layout:** Single-column, max-width 680px, centered. Sticky header shows progress context: "Complete your profile to continue."

**Structure:**
```
Section 1: Organisation Details
  - Org Name (read-only chip style)
  - Address Line 1
  - Address Line 2

Section 2: Coordinator Details
  - First Name + Last Name (side by side on desktop)
  - Mobile Number
  - Landline Number
  - Email ID
  - Designation (read-only chip style)
  - ID Type (dropdown)
  - ID Card Number

Section 3: Terms and Conditions
  - Scrollable T&C text box
  - Checkbox: "I have read and agree to the Terms and Conditions"
  - Submit button (full-width)
```

---

### 4.3 Vendor Dashboard

**Layout:** Left sidebar navigation (240px) + main content area.

**Sidebar:**
- Passmark wordmark at top
- Nav items with Lucide icons:
  - `LayoutDashboard` — Dashboard (active)
  - `FileText` — Accreditation Form
  - `FolderOpen` — My Applications
  - `User` — Profile
  - `LogOut` — Logout
- Org name + designation at bottom of sidebar

**Main Content:**

Top row — Quota card:
```
┌─────────────────────────────────────────┐
│  Applications Remaining                 │
│  ████████░░  3 of 5 used               │
└─────────────────────────────────────────┘
```

Stats row (3 cards):
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Submitted│  │  Saved   │  │Not Filled│
│    3     │  │    1     │  │    1     │
└──────────┘  └──────────┘  └──────────┘
```

Applications table:
```
| # | Applicant Name | Status      | Last Updated | Actions |
|---|----------------|-------------|--------------|---------|
| 1 | Ravi Kumar     | Approved    | 12 May 2026  | [View]  |
| 2 | Anita Sharma   | Submitted   | 13 May 2026  | [Edit]  |
| 3 | —              | Draft       | 14 May 2026  | [Edit]  |
```

"New Application" CTA button: top-right of table. Disabled with tooltip if quota exhausted.

---

### 4.4 Accreditation Form

**Layout:** Single-column, max-width 720px, centered. Sticky bottom bar with Save + Submit controls.

**Structure:**
```
Header: "New Accreditation Application" + application # (auto-generated)

Section 1 — Personal Information
  First Name | Last Name
  Designation
  Mobile | Email

Section 2 — Identification
  ID Type (dropdown)
  ID Card Number

Section 3 — Access Zones
  Checkbox list of zones (defined by admin per event)

Section 4 — Photo
  Upload zone (drag or click)
  Preview + remove option
  Size guidance text: "JPG or PNG, 50 KB – 2 MB"

Section 5 — Terms and Conditions
  Checkbox (required before Submit)

Sticky bottom bar:
  [Save Draft]  [Submit Application →]
```

---

### 4.5 Admin Dashboard

**Layout:** Top navigation bar + full-width content. Admin UI prioritizes density.

**Top Nav:**
- Passmark logo (left)
- Nav links: Dashboard | Users | Applications | Reports
- Admin name + logout (right)

**Dashboard Content:**

Summary cards (5 across):
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Users  │ │  Total  │ │ Pending │ │Approved │ │Rejected │
│   24    │ │   87    │ │   12    │ │   63    │ │   12    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

Recent Applications table (last 10):
```
| Applicant     | Organisation | Submitted    | Status       | Action       |
|---------------|--------------|--------------|--------------|--------------|
| Ravi Kumar    | TechExpo Inc | 14 May 2026  | Submitted    | [Review]     |
| Anita Sharma  | MediaHouse   | 13 May 2026  | Approved     | [View]       |
```

---

### 4.6 Application Detail (Admin)

**Layout:** Two-column (application data left, decision panel right).

**Left — Application Data:**
- Applicant photo (if uploaded)
- All filled form fields displayed in read-only label-value rows
- Zone access requested (chips)

**Right — Decision Panel (sticky):**
```
┌──────────────────────────────┐
│  Application #A0042          │
│  Status: [Submitted]         │
│                              │
│  Remarks:                    │
│  ┌────────────────────────┐  │
│  │ (text area)            │  │
│  └────────────────────────┘  │
│                              │
│  [Approve]  [Reject]         │
│  [Mark Under Review]         │
└──────────────────────────────┘
```

Approve = green primary button. Reject = danger button. Remarks required on reject (field highlights red if empty on click).

---

## 5. Responsive Design

| Breakpoint | Width | Behaviour |
|---|---|---|
| Mobile | < 640px | Single column, sidebar becomes bottom tab bar |
| Tablet | 640–1024px | Sidebar collapses to icon-only (48px) |
| Desktop | > 1024px | Full sidebar (240px), multi-column layouts |

Admin UI is desktop-first (reviewers work on desktop). Vendor UI is mobile-friendly (applicants may fill forms on phone).

---

## 6. Interaction Patterns

### 6.1 Form Validation
- Validate on blur (not on change) to avoid noise
- Show inline error below the field (not in a banner)
- On submit, scroll to first errored field

### 6.2 Save Confirmation
- Toast: "Draft saved" (bottom-right, 4s, green)
- No page navigation; user stays on the form

### 6.3 Submit Confirmation
- Modal:
  ```
  ✓ Application Submitted
  Reference ID: A0042
  
  [Fill Another Application]  [Back to Dashboard]
  ```

### 6.4 Admin Decision Confirmation
- Inline success state on the decision panel: status badge updates in place
- Toast: "Application approved. Vendor has been notified."

### 6.5 Empty States
- No applications yet: illustration + "No applications yet. Start by filling your first form." + CTA
- Admin no-results on filter: "No applications match your filters." + Clear filters link

---

## 7. Accessibility

- All interactive elements keyboard-navigable (tab order logical)
- Focus ring visible on all focusable elements (`outline: 2px solid --color-brand`)
- Form labels associated with inputs (`htmlFor` / `aria-label`)
- Error messages linked to fields via `aria-describedby`
- Status badges include screen-reader text (not just color)
- Color contrast: all text/background pairs meet WCAG AA (4.5:1)

---

## 8. Loading States

- **Page load:** Skeleton screens (not spinners) for dashboard stats and tables
- **Button actions:** Spinner replaces button label; button disabled during request
- **File upload:** Progress bar inside upload zone (0–100%)
- **Navigation:** Next.js route transitions handled natively; no custom loader needed

---

## 9. Error States

| Scenario | UX Response |
|---|---|
| Login failure | Inline error below password: "Incorrect username or password." |
| Network error on submit | Toast: "Something went wrong. Please try again." |
| Photo too large | Inline error below upload zone: "File must be under 2 MB." |
| Quota exhausted | "New Application" CTA disabled; tooltip: "You have used all your application slots." |
| Session expired | Redirect to login with query param `?reason=session_expired`; banner on login page |
| 404 | Minimal 404 page: wordmark + "Page not found." + "Go to Dashboard" link |

---

## 10. Print Layout (Submitted Application)

Used for the "View/Print" option post-submission.

- No navigation, no sidebar — clean document layout
- Passmark logo + Event name at top
- Application Reference ID and submission date
- All applicant fields in a two-column grid
- Photo displayed in top-right
- Status badge
- Footer: "Generated by Passmark — passmark.in"
- `@media print` CSS hides all non-content elements

---

## 11. Figma Structure (Recommended)

```
Passmark Design
├── 🎨 Foundations
│   ├── Colors
│   ├── Typography
│   └── Spacing / Grid
├── 🧩 Components
│   ├── Buttons
│   ├── Inputs
│   ├── Badges
│   ├── Cards
│   ├── Modals
│   └── Toasts
├── 📄 Vendor Flows
│   ├── Login
│   ├── Registration
│   ├── Dashboard
│   ├── Accreditation Form
│   └── Edit Form
└── 🔧 Admin Flows
    ├── Login
    ├── Dashboard
    ├── User Management
    ├── Application Review
    └── Reports
```
