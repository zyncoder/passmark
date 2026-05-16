# Product Requirements Document
## Passmark — Event Accreditation Platform
**Version:** 1.0  
**Status:** Draft  
**Owner:** Product  
**Last Updated:** May 2026

---

## 1. Overview

### 1.1 Product Summary
Passmark is a SaaS accreditation management platform for event organizers. It enables vendors, press representatives, and other stakeholders to submit accreditation applications, and gives event administrators full control over review, approval, and badge generation — at a fraction of the cost of incumbent solutions.

### 1.2 Problem Statement
Event organizers managing vendor/media accreditation manually — via email, Google Forms, or expensive bundled tools like BookMyShow's internal Accred system — face fragmented workflows, no audit trail, and slow turnaround on credential issuance. Mid-market organizers (film festivals, trade expos, corporate summits, sports tournaments) have no affordable, purpose-built alternative.

### 1.3 Opportunity
- Incumbent (BMS Accred) is expensive and captive to BMS's event ecosystem
- No standalone, affordable accreditation SaaS exists for the Indian mid-market
- Demand is validated: direct client request from an event organizer unable to access BMS pricing
- Per-event pricing model aligns with how organizers think and budget

### 1.4 Target Users

| Persona | Description |
|---|---|
| Event Organizer (Admin) | Manages the event, reviews and approves applications, issues passes |
| Vendor / Applicant | Submits accreditation applications on behalf of their organization |
| Accreditation Coordinator | Point of contact at the vendor org, fills forms and tracks status |

### 1.5 Pricing Model
Per-event licensing. Organizer pays per event, not per month. Tiered by application volume.

---

## 2. Goals and Success Metrics

### 2.1 Goals
- Launch a functional V1 covering the full application-to-approval lifecycle
- Enable an organizer to onboard, configure, and run an accreditation campaign independently
- Reduce credential processing time from days (manual) to under 24 hours

### 2.2 Non-Goals (V1)
- Multi-event management under one organizer account
- On-site badge printing hardware integration
- Public applicant self-registration (V1 is admin-created vendor accounts only)
- Mobile app

### 2.3 Success Metrics

| Metric | Target |
|---|---|
| Time from application submission to decision | < 24 hours |
| Form completion rate | > 80% |
| Admin review throughput | 50+ applications/day per admin |
| Organizer onboarding time | < 30 minutes |

---

## 3. Feature Requirements

### 3.1 Pre-Registration (Admin-Initiated)
- Admin creates vendor accounts in the system
- System sends an automated email to each vendor with login credentials and the platform URL
- Credentials are system-generated (username + temporary password)

**Acceptance Criteria:**
- Email is delivered within 2 minutes of account creation
- Email contains username, temporary password, and direct login URL
- Vendor account is inactive until first login

---

### 3.2 Vendor — Login

**Fields:** Username/email, Password  
**Controls:** Login button, Forgot Password link  

**Acceptance Criteria:**
- Invalid credentials display an inline error message (no page reload)
- Forgot Password triggers an email with a reset link valid for 24 hours
- Successful login redirects to the Dashboard

---

### 3.3 Vendor — One-Time Registration Form
Triggered on first login. Vendor must complete before accessing the Dashboard.

**Organization Fields:**
- Organization Name (pre-filled, read-only)
- Address Line 1 (required)
- Address Line 2 (optional)

**Accreditation Coordinator Fields:**
- First Name (required)
- Last Name (required)
- Mobile Number (required, 10-digit Indian format)
- Landline Number (optional)
- Email ID (required, validated format)
- Designation (pre-filled, read-only)
- Type of ID Proof (dropdown: Aadhaar / PAN / Passport / Voter ID / Driving Licence)
- ID Card Number (required)

**Controls:** Terms and Conditions checkbox (required), Submit button

**Acceptance Criteria:**
- Email field validates format on blur
- Mobile validates 10-digit numeric on blur
- Submit is disabled until T&C checkbox is checked
- On successful submission, vendor is redirected to the Dashboard
- Form cannot be re-accessed after submission

---

### 3.4 Vendor — Dashboard

**Elements:**
- Welcome message with vendor organization name
- Navigation: Accreditation Form | Reports | Edit Forms | Profile | Logout
- Application status overview: Submitted count | Saved (draft) count | Not Started count
- Remaining application quota display (e.g., "3 of 5 applications remaining")
- Application list with status badges and edit controls

**Acceptance Criteria:**
- Dashboard reflects real-time application counts
- Quota display updates immediately after form submission
- Edit icon is visible for saved and submitted forms
- Vendor cannot initiate a new form if quota is exhausted (CTA is disabled with tooltip)

---

### 3.5 Vendor — Accreditation Form

**Sections:**
- Personal Information (name, designation, organisation, contact)
- Identification Information (ID type, ID number)
- Access Information (zones/areas requested — checkbox list defined by admin per event)
- Photo Upload

**Photo Upload Rules:**
- File types: JPG, PNG
- Size: 50 KB minimum, 2 MB maximum
- Preview shown after upload
- Re-upload option available

**Controls:** Save Form | Submit Form (requires T&C checkbox)

**Acceptance Criteria:**
- All required fields validated before Submit
- Save is available at any point without validation (partial save allowed)
- Photo size validated client-side before upload, server-side after
- Submission confirmation message displayed with option to start another form or return to Dashboard

---

### 3.6 Vendor — Save Form
- Saves current form state as a draft
- Confirmation toast: "Form saved successfully."
- Prompt: "Do you want to fill another application?"
- Returns to Dashboard if vendor declines

---

### 3.7 Vendor — Submit Form
- Full field validation before submission
- T&C checkbox required
- Confirmation message post-submission with application reference ID
- Option to view/print submitted application (print-friendly layout)
- Prompt: "Do you want to fill another application?" (respects quota)

---

### 3.8 Vendor — Edit Forms
- Saved (draft) forms: fully editable, can be submitted
- Submitted forms: editable until admin begins review; re-submission replaces prior submission
- Clear status label on each form: Draft | Submitted | Under Review | Approved | Rejected
- Edit is disabled for forms Under Review or with a final decision

---

### 3.9 Admin — Login
- Separate login URL (`/admin`)
- Username and password fields
- No self-registration; admin accounts are provisioned manually

---

### 3.10 Admin — Dashboard
- Summary cards: Total Users | Total Applications | Pending Review | Approved | Rejected
- User list with application quota and submission counts
- Search by user/organization name
- Filter by application status

---

### 3.11 Admin — User Management
- List of all vendor accounts with: Org name | Coordinator name | Quota | Submitted count | Status
- Edit quota per vendor (increase or decrease)
- View vendor profile and all their submitted applications
- Deactivate/reactivate vendor accounts

---

### 3.12 Admin — Application Management
- Tabular list of all submitted applications with columns: Applicant Name | Org | Submission Date | Status | Actions
- Bulk filter by: status | date range | organization
- Per-application detail view
- Actions: Approve | Reject | Request More Info
- Remarks field (required on rejection, optional on approval)
- On status change, system sends email notification to vendor

---

### 3.13 Admin — Reports and Analytics
- Export: list of approved applicants (CSV, PDF)
- Export: full submissions log with status
- Summary view: total submissions by day, approval rate, pending count
- Per-event summary card (V2: multi-event comparison)

---

## 4. User Flows

### 4.1 Vendor — First Login and Registration
```
Email received → Visit URL → Login with credentials → 
Registration Form → Submit → Dashboard
```

### 4.2 Vendor — Fill and Submit Application
```
Dashboard → Accreditation Form → Fill fields → Upload photo → 
Check T&C → Submit → Confirmation → Dashboard
```

### 4.3 Vendor — Save and Resume
```
Dashboard → Accreditation Form → Fill partial → Save → Dashboard → 
[Later] Edit icon on draft → Resume → Submit
```

### 4.4 Admin — Review and Decide
```
Admin Dashboard → Application Management → Select application → 
Review details → Approve / Reject + Remarks → Notification sent to vendor
```

---

## 5. Constraints and Assumptions

- V1 is single-event (one active event per deployment or tenant)
- Admin accounts are provisioned outside the product in V1
- All users are India-based; mobile number format is Indian (10-digit)
- Badge/pass generation is out of scope for V1 but the data model must support it
- Email notifications rely on a transactional email service (SendGrid or AWS SES)
- Photo storage via cloud object storage (S3-compatible)

---

## 6. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | What access zone categories does the first client need? | Client | Pre-kickoff |
| 2 | Should submitted forms be locked to editing after X hours? | Product | V1 planning |
| 3 | What is the maximum vendor quota per event expected? | Client | Pre-kickoff |
| 4 | Is badge PDF generation needed in V1 or V2? | Product | V1 planning |
| 5 | Remarks from admin — visible to vendor or internal only? | Product | V1 planning |
