# SMTP email

The Node.js backend sends outbound mail through your SMTP provider using Nodemailer. This does not host an SMTP server or create a mailbox. Obtain SMTP credentials from your email provider and use a verified sender address that accepts replies.

Set these on the server locally and in Vercel's production environment, then redeploy. Do not prefix them with `VITE_` or commit real credentials:

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=info@aeviorawellness.com
```

The sender shown is an example; verify it with your provider. Port 587 requires STARTTLS; port 465 uses TLS immediately. Configure your provider's SPF/DKIM records and domain authentication instructions. See [Nodemailer SMTP configuration](https://nodemailer.com/smtp).

## Usage

In the dashboard's Administrator workspace, search the patient/user directory by name, email, or phone, select an account, then choose **Compose email** or **Call**. Search runs on the server and returns up to 100 matching accounts. Narrow the search when needed.

The composer offers a blank email and editable templates for account welcomes, account assistance, and replies to membership questions. Choose a template and click **Use template**, then review and edit the subject and message. Templates insert the recipient's first name and current company contact details. Replacing a nonempty draft requires confirmation. These are starter templates defined in `src/util/emailTemplates.js`; edits in the composer apply to the current message, not the stored template. The same templates are available in the admin account overview.

- New registrations receive a plain-text account confirmation, reflecting pending or active status. It is not an activation link and does not change account status.
- In the admin account overview, select **Email user** next to a user's email, write the subject and message, and select **Send email**. This sends to one stored account address. It is for account support, not marketing campaigns.
- The form reports missing configuration; this checks setting format only, not connectivity or credentials. Successful sends mean SMTP acceptance, not verified inbox delivery. Check your provider for bounces and delivery status.
- Sends require an authenticated admin, validate input and have a limit of 20 attempts per admin per 15 minutes per running instance. The existing API limit also applies. For high-volume use, add shared rate-limit storage and a durable queue.

Registration awaits a bounded SMTP attempt before responding, rather than starting background work that a serverless function could lose. Failures log only a safe category and leave the created account intact. Failed welcome messages are not retried automatically; admins can send a follow-up through the form. SMTP timeouts can leave delivery uncertain, so check provider logs before retrying. Configure the function duration to accommodate database work plus SMTP timeouts.

No credentials, message bodies, or recipient email addresses are added to email logs. Admin audit entries record the actor and recipient account IDs. No live test messages were sent during implementation. Configure the service and use a controlled test account to verify inbox delivery before release. Update the account privacy policy with the selected email provider before publishing it.
