# Email setup and operation

## Self-service password recovery

Users choose **Forgot password?** on the login page. The backend emails a single-use link valid for 30 minutes using the existing SMTP settings. `FRONTEND_ORIGIN` must be the trusted application URL (HTTPS in production); no request-supplied hostname is used. Reset tokens are random, stored only as SHA-256 hashes, and carried in the email link's fragment to avoid server URL logs. Do not log email bodies or reset request bodies.

Requests return the same message for unknown, inactive, and eligible accounts. Active and pending accounts can reset passwords; suspended/deleted accounts cannot. A per-account one-minute cooldown and per-IP limit reduce repeated requests. Rate limits are per instance; multi-instance production abuse protection needs shared storage. SMTP delivery failure does not disclose account existence; provider delivery must be tested after deployment.

Resetting consumes the token atomically, changes the password, and increments a session version to invalidate existing login cookies. Reset does not activate pending accounts. New requests invalidate older links. Run `node --test server/tests/passwordReset.test.js` for synthetic reset verification.

The React dashboard calls authenticated Node.js endpoints. Only Node.js connects to the SMTP provider; credentials never belong in React or `VITE_*` variables. The application does not host a mail server or create a mailbox.

## 1. Configure the backend that you are using

Obtain SMTP credentials and authorize the sender with your email provider. Use a sender mailbox that can receive replies.

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=info@aeviorawellness.com
```

These are examples, not working credentials. Use these exact variable names. `SMTP_FROM` must be a single email address without a display name or angle brackets. The password is preserved exactly, including spaces; do not add quotation marks when entering a value in Vercel's dashboard. Whitespace-only passwords are rejected.

- Local development: set values in `server/.env` and restart the Node.js server from the repository root. Vercel settings do not automatically populate a local server.
- Production: set values in the Vercel project serving `/api`, select Production, and create a new production deployment. Preview deployments need variables in Preview too. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
- The application supports port 587 with required STARTTLS or port 465 with immediate TLS, with normal certificate verification. Complete your provider's SPF/DKIM and sender verification requirements. See [Nodemailer SMTP configuration](https://nodemailer.com/smtp).

## 2. Check configuration in the application

Sign in as an administrator, open the patient/user directory, select your own account, and choose **Compose email**. The admin account overview's **Email user** action opens the same composer.

The setup panel shows whether required settings are valid. Missing/invalid settings are listed by variable name and corrective hint, never by value. **Recheck configuration** retries the check without losing your draft. A failed request can also be retried with this button.

The Send button requires valid configuration and a nonempty subject/message. A successful configuration check does not verify the SMTP password or connectivity.

If the API reports Authentication required, sign in again using the same hostname as the dashboard. If it reports forbidden access, use an administrator account. Inspect the request host in browser Network tools if the dashboard appears to contact an unexpected backend.

## 3. Test SMTP connection

Click **Test SMTP connection**. This connects and authenticates with the SMTP provider but sends no message. A success does not establish that the sender is authorized or that messages reach an inbox. SMTP operations have a 15-second overall deadline, plus shorter connection-stage timeouts; transport resources are closed afterward.

| Result | Next step |
| --- | --- |
| Missing or invalid configuration | Fix the listed variable, redeploy or restart, and recheck. |
| Authentication rejected | Verify SMTP credentials or the provider's required app password. |
| Connection failed or timed out | Check hostname, port, TLS configuration, and provider network restrictions. |
| Provider did not confirm operation | Review sender authorization and provider logs. |

Raw SMTP responses, credentials, and email content are not exposed in diagnostic responses. Connection tests are admin-only and limited to five attempts per administrator per 15 minutes per running instance.

## 4. Test delivery, then compose patient emails

Send a short message to your own selected account. Check the inbox, spam folder, and provider delivery logs. The application reports SMTP acceptance, not guaranteed delivery. If a request times out, check provider logs before retrying: delivery may have occurred.

Select a patient/user to write a message or use an editable template. Templates insert the recipient's first name; replacing a nonempty draft asks for confirmation. Review the subject and body before sending. Template edits apply to the current draft, not the reusable source template in `src/util/emailTemplates.js`.

Sending is restricted to administrators and a stored account address. Deleted accounts cannot receive messages from this form. Messages are plain text and intended for account support. Do not include medical records or use the form for marketing campaigns. Sending is limited to 20 attempts per administrator per 15 minutes per instance; the global API rate limit also applies.

## 5. Automatic registration responses

### Saved templates

Open **Administration → Manage email templates** (`/admin/email-templates`). Create a named template with a subject and message, preview it with synthetic recipient data, and save. Templates are stored in MongoDB's `emailTemplates` collection and are available to all administrators. The composer can refresh its template list without losing the current draft.

Select **Registration welcome (automatic registration)** to edit the signup response. Preserve `{{accountStatus}}` in the body; the server requires it so active and pending accounts receive appropriate instructions. The template cannot be deleted. Without a saved override, the built-in registration template is used; a lookup failure also falls back to it. Changes affect future registrations only.

Supported placeholders are `{{firstName}}`, `{{lastName}}`, and `{{accountStatus}}`. Other text is literal. Custom templates can be updated or deleted in the manager. Editing a template in the email composer only changes the current message; use the manager to save a reusable change. Ordinary templates remain account-support messages, not automated marketing campaigns.

After an account is created, the registration route awaits a verification email attempt. The server adds a mandatory verification link and 24-hour expiry instructions before the saved welcome message. The verification subject is fixed so recipients can recognize the action; the saved welcome body remains editable. Completing verification activates the account but does not enroll it in a paid membership. See [account verification](account-registration.md#email-verification).

An SMTP failure does not undo the account or report registration as failed. The signup screen explains that the verification email could not be sent and offers a new-link request. Only a safe failure category is logged. There is no durable email queue or automatic retry; users can request another verification link from signup or sign-in, and administrators can verify accounts manually after confirming ownership. The serverless function duration must allow database work plus the SMTP deadline. Larger sending volumes need a durable queue and shared rate-limit storage.

## Endpoints and verification

### Appointment placeholders

Admin templates and messages support `{{appointmentDate}}`, `{{appointmentTime}}`
and `{{providerName}}`, alongside the existing name/account placeholders. For example:

```text
Hello {{firstName}},
Your consultation is on {{appointmentDate}} at {{appointmentTime}}
with {{providerName}}.
```

In **Email user**, choose the **Appointment details** built-in template or a
saved appointment template, then select **Appointment for this email**. The
selection lists only that recipient's booked consultations (future and the last
90 days). It never exposes private meeting URLs or other patients' details.
Date and time use the provider's saved time zone; the time includes its zone
abbreviation and observes daylight saving time. Rendering follows the admin's
English/Spanish interface language. The template editor uses a clearly labeled
sample appointment; the composer previews the actual selected booking.

Messages with appointment placeholders require a selection before sending.
The API re-reads the booked slot, checks recipient ownership and the provider's
schedule revision, then fills the placeholders from server records. A changed,
canceled or reassigned appointment requires **Refresh appointments** and another
review. Client-supplied provider names or dates are not accepted as overrides.
No confirmation/reminder is sent automatically by this change. Appointment
placeholders cannot be saved in the automatic Registration welcome template.

- `GET /api/admin/email/appointments/:userId`: admin-only appointment choices.
- `POST /api/admin/email` accepts optional `appointment` with `providerId`,
  `slotId`, and the displayed schedule `revision`.

Run `node --test server/tests/emailAppointments.test.js` for synthetic ownership,
staleness, cancellation, formatting and daylight-saving checks. No real email is sent.

### Saved form links and provider QR codes

Open **Admin → Email manager → Form links & QR codes** (`/admin/form-links`).
Save a title, reusable HTTPS share URL, optional description, and/or the PNG/JPEG
QR image exported by the form provider (including HIPP FORMS). A URL or QR image
is required; either can be used alone. QR uploads are limited to 200 KB each.
The database `formLinks` collection holds this shared library, separate from
accounts and completed forms. This is a library of provider links/images, not
an integration that creates forms or imports responses. Verify each provider
URL and QR destination before sharing it. Use reusable form links rather than
patient-specific submission links. Completed forms remain with the provider.

Admins can search by title/description, edit an entry, replace/remove its QR
image, or archive it by clearing **Available in the email composer**. The listing
is paginated and excludes image data; the edit/detail request loads one QR image.
Only administrators can read or change the library. New audit entries record
the form ID and actor, without storing URLs, QR content or email bodies in logs.

In **Email user**, select up to five entries under **Saved form links & QR
codes**. Review **Preview message with form links**, then send normally. The
form picker is separate from the **Email template** dropdown. It automatically
refreshes after library saves, cross-tab library changes, and returning to a
visible/focused composer tab; **Refresh forms** also forces a fresh read. The
library save confirmation links to the directory to choose a recipient.
The server loads the selected IDs again and appends their current titles and URLs
to the text message; saved QR images are attached as PNG/JPEG files. If an entry
was archived or removed, sending is rejected until the selection is reviewed.
Custom attachment URLs, paths and arbitrary recipient addresses are not accepted
from the browser. QR attachments use stored bytes with SMTP file/URL fetching
disabled. Editing a library entry does not change an email already delivered.

The **Email manager → templates page** also contains **Saved form links & QR
codes** directly inside the template editor. Select forms there and save the
template to retain their IDs. Selecting that template later in **Email user**
restores both its message and its form/QR selections. The template preview shows
the titled links, and QR images are attached when the message is sent. Forms
remain library items rather than appearing as separate email templates. Existing
templates without selections continue to work. The automatic Registration welcome
template also supports saved forms while retaining the required activation link;
archived or missing library entries are omitted from automatic welcome emails.

- `GET/POST /api/admin/form-links`: search/list or add shared form entries.
- `GET/PUT /api/admin/form-links/:id`: load or update one entry, including its QR.
- `POST /api/admin/email` accepts optional `formLinkIds` (up to five unique UUIDs).

Run `node --test server/tests/formLinks.test.js server/tests/email.test.js` with
synthetic data. Tests do not contact the form provider or SMTP provider, and do
not send real email. No new dependencies or environment settings are required.

- `GET /api/admin/email/status`: configuration format only; returns variable names and hints.
- `POST /api/admin/email/verify`: connection/authentication check, no email sent.
- `POST /api/admin/email`: compose/send to a stored user ID, with subject and text.

All three require an active administrator session. Registration calls the same SMTP sending service. Admin send audit entries contain actor and recipient account IDs, not message bodies.

Run `node --test server/tests/email.test.js server/tests/registration.test.js` for simulated email and registration checks. Live provider verification remains a deployment step. Update the account privacy policy with your selected email provider before publishing it.

## Invitation-only business affiliate registration

In **Admin → Affiliates & referral coupons → Invite a business to register**, enter the business name and email, then select **Create and email invitation**. This sends through the existing SMTP configuration. `FRONTEND_ORIGIN` must point to the application’s HTTPS origin (HTTP localhost is allowed outside production).

The business opens `/business-affiliate/register#ACCESS_CODE`, or enters the code at `/business-affiliate/register`, and selects **Access registration**. The route is absent from public navigation; its form and registration API require a valid invitation. The link/code is a private bearer credential: forwarding it grants access to that invitation. The invited email is locked. Business/contact name, optional phone and HTTPS website are collected separately from patient accounts; this does not create a patient login.

Invitations expire after seven days, are single-use, and can be revoked before registration starts. The list shows pending, in-progress, registered and revoked invitations. To replace an invitation, revoke the old pending invitation and create a new one. A failed SMTP operation is clearly reported; the saved invitation’s link/code can be copied for manual delivery. Raw codes are shown only when created and are never stored in the database. SMTP acceptance does not guarantee inbox delivery.

The invitation saves the current default affiliate terms. Completion creates a business affiliate with a unique B2B referral code; existing business identities reuse their affiliate record. Admins continue managing codes, eligibility, commission and payouts in the existing B2B section. Interrupted submissions retain the first submitted business identity for safe retries. Completed invitations cannot reopen registration; contact an administrator if the final response was lost.

Deploy both frontend and backend. MongoDB must allow the `businessinvitations` collection and unique token-hash index to be created. Tests use synthetic storage and mail stubs, and send no live messages.
