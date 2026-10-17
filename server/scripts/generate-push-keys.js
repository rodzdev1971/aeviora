import { writeFileSync } from "node:fs";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
try {
  writeFileSync(new URL("../.env.web-push.local", import.meta.url),
    `WEB_PUSH_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_PRIVATE_KEY=${keys.privateKey}\nWEB_PUSH_SUBJECT=mailto:info@aeviorawellness.com\n`,
    { flag: "wx", mode: 0o600 });
  console.log("Created server/.env.web-push.local (ignored by Git). Add these three settings to Vercel's server environment, then redeploy. Keys are not printed.");
} catch (error) {
  if (error.code === "EEXIST") console.log("server/.env.web-push.local already exists and was preserved. Reuse its keys; do not rotate them for each deployment.");
  else { console.error("Unable to create the push configuration file."); process.exitCode = 1; }
}
