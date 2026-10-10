# Email setup and operation

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

After an account is created, the registration route awaits a welcome email attempt. Pending accounts receive pending-activation wording; active accounts receive sign-in wording. The message does not activate the account or enroll it in a paid membership.

An SMTP failure does not undo the account or report registration as failed. Only a safe failure category is logged. There is no durable email queue or automatic retry; administrators can send a follow-up using the composer after checking delivery logs. The serverless function duration must allow database work plus the SMTP deadline. Larger sending volumes need a durable queue and shared rate-limit storage.

## Endpoints and verification

- `GET /api/admin/email/status`: configuration format only; returns variable names and hints.
- `POST /api/admin/email/verify`: connection/authentication check, no email sent.
- `POST /api/admin/email`: compose/send to a stored user ID, with subject and text.

All three require an active administrator session. Registration calls the same SMTP sending service. Admin send audit entries contain actor and recipient account IDs, not message bodies.

Run `node --test server/tests/email.test.js server/tests/registration.test.js` for simulated email and registration checks. Live provider verification remains a deployment step. Update the account privacy policy with your selected email provider before publishing it.
