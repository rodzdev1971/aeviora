import { createApp } from "../server/app.js";
import { connectDatabase } from "../server/config/database.js";

// Express must receive the untouched request stream for Stripe signatures.
export const config = { api: { bodyParser: false } };
export default createApp({ connectDatabase, trustProxy: 1 });
