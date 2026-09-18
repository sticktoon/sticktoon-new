# StickToon Security Incident Response Plan

| | |
|---|---|
| Adopted | 15 September 2026 |
| Next review | 15 March 2027, then every 6 months (March and September) |
| Plan owner | Anish Patankar, Incident Lead |

This plan covers anything that could expose, change or destroy StickToon data: customer and order data, admin accounts, secrets (database, JWT, payment and Amazon keys), and **Amazon Information** received from Amazon Seller Central or the Selling Partner API.

## 1. Roles

| Role | Person | Responsibilities |
|---|---|---|
| Incident Lead | Anish Patankar (sticktoon.xyz@gmail.com) | Declares an incident, sets severity, coordinates the response, sends every external notification (Amazon, CERT-In, customers). |
| Technical Responder | Anish Patankar, or the developer on duty | Contains the problem, rotates secrets, preserves evidence (Activity Logs, hosting logs), restores service. |
| Backup Lead | [Name, contact] | Takes over if the Incident Lead can't be reached within 2 hours. |

Anyone at StickToon who notices something suspicious tells the Incident Lead **immediately**, even if unsure.

## 2. What counts as an incident

- A password, API key, token or database connection string found in code, a repository, chat, screenshot or log.
- An admin sign-in, change or export in Activity Logs that nobody at StickToon made.
- Data unexpectedly deleted, changed or downloaded in bulk.
- Amazon SP-API credentials (LWA client secret, refresh token) exposed or used from somewhere unknown.
- A lost or stolen laptop or phone that is signed in to an admin account or an admin's email.
- Someone at StickToon gave a password or verification code to a phishing email or call.

## 3. Response steps

| # | Step | Deadline from detection |
|---|---|---|
| 1 | **Record**: time found, who found it, what was seen. Start an incident note and keep adding to it. | Immediately |
| 2 | **Assess**: severity is **High** if Amazon Information, customer personal data or any secret is involved. | 1 hour |
| 3 | **Contain**: rotate every exposed secret (MongoDB user password, `JWT_SECRET`, Razorpay keys, Amazon LWA client secret; revoke the app's authorization in Seller Central to kill the refresh token). Remove or suspend affected admin accounts, and secure the email accounts that receive admin sign-in codes. Sign everyone out by setting `JWT_INVALID_BEFORE` on the server. Restrict MongoDB Atlas network access. Save relevant logs before they expire. | 4 hours for High |
| 4 | **Notify Amazon**: if Amazon Information may be involved, email **security@amazon.com** with what happened, when it was detected, what data is affected, what has been done and a contact. | **24 hours** |
| 5 | **Notify others where required**: CERT-In (incident@cert-in.org.in) for reportable cyber incidents under its 2022 Directions, which set a 6-hour window; affected customers and the Data Protection Board as the Digital Personal Data Protection Act and its rules require. | As the law requires |
| 6 | **Recover**: fix the root cause, restore data from backup if needed, confirm the site and admin panel work, keep watching Activity Logs for a week. | As soon as safe |
| 7 | **Review**: write a short note (timeline, cause, fix, what changes) and update this plan. | 7 days |

## 4. Contacts

| Who | How |
|---|---|
| Amazon security | security@amazon.com |
| CERT-In | incident@cert-in.org.in |
| Hosting and services | Support pages of Render, Vercel, MongoDB Atlas, Cloudinary, Razorpay, Google |

## 5. Account security rules

These rules keep incidents from happening and are checked at every review.

**Admin panel (enforced by the application)**
- Admin passwords: at least 12 characters with an uppercase letter, a lowercase letter, a number and a special character.
- Admin passwords expire after 365 days and must be changed at the next sign-in. A password set by someone else must be changed by its owner at first sign-in.
- Every admin sign-in, by password or Google, needs a one-time 6-digit code emailed to the admin (2-step verification). A code works once, expires after 10 minutes and allows 5 tries.
- Every admin's email account must have its own 2-step verification turned on, because it receives the sign-in codes.
- Access to each admin section is granted per person (section permissions); every admin action is written to Activity Logs.

**Accounts that reach code, hosting, money or Amazon** (Google, Amazon Seller Central, GitHub, Render, Vercel, MongoDB Atlas, Cloudinary, Razorpay)
- 2-step verification turned on.
- A unique password of 12+ characters, kept in a password manager, changed at least once a year (each September review).
- Secrets live only in hosting environment variables or the git-ignored `.env` files: never in code, commits, chat or screenshots.
- Access is removed the same day someone leaves.

## 6. Review log

| Date | Reviewed by | Changes |
|---|---|---|
| 15 Sep 2026 | Anish Patankar | Plan adopted |
