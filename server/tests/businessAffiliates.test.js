import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { BusinessAffiliate, ReferralAffiliate, ReferralSettings, ReferralReward } from "../models/referrals.js";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import router from "../routes/referralRoutes.js";
import { businessAffiliateInput, defaultReferralTerms } from "../../shared/referrals.js";
import { registerBusinessAffiliate, resolveReferral, referralOffer, recordReferralPayment } from "../services/referrals.js";
import { referralShareMessage, businessAffiliateInvitation } from "../../src/util/referralShare.js";

const input = { businessName: "Synthetic Business", contactName: "Synthetic Contact", email: "business@example.com", phone: "202-555-0123", website: "https://example.com" };
function fixture() {
  const businesses = [], redemptions = new Map(), rewards = new Map();
  const repository = {
    settings: async () => null,
    affiliate: async (filter) => businesses.find((business) => Object.entries(filter).every(([key, value]) => business[key] === value)),
    businessByIdentity: async (nameKey, email) => businesses.find((business) => business.nameKey === nameKey && business.email === email),
    createBusiness: async (data) => { const document = new BusinessAffiliate(data); await document.validate(); const value = document.toObject(); businesses.push(value); return value; },
    user: async () => assert.fail("business affiliates must not require a personal paid-membership account"),
    redemption: async (id) => redemptions.get(id),
    reserve: async (id, data) => { if (!redemptions.has(id)) redemptions.set(id, { _id: id, ...data }); return redemptions.get(id); },
    firstPayment: async (id, paymentId) => { if (!redemptions.get(id).firstPaymentId) redemptions.get(id).firstPaymentId = paymentId; },
    reward: async (data) => { if (!rewards.has(data._id)) rewards.set(data._id, data); },
  };
  return { businesses, repository, rewards };
}

test("business registration has unique codes without member-account/index migration and retries reuse the same business", async () => {
  const f = fixture();
  const first = await registerBusinessAffiliate(input, f);
  const again = await registerBusinessAffiliate({ ...input, businessName: "SYNTHETIC  BUSINESS" }, f);
  const second = await registerBusinessAffiliate({ ...input, businessName: "Another business" }, f);
  assert.equal(first._id, again._id); assert.notEqual(first.code, second.code);
  assert.match(first.code, /^B2B-[A-F0-9]{12}$/);
  assert.equal(first.kind, "business"); assert.equal(first.userId, undefined);
  assert.equal(f.businesses.length, 2);
  for (const [key, value] of Object.entries(defaultReferralTerms)) assert.equal(first[key], value);
  assert.equal(businessAffiliateInput.safeParse({ ...input, userId: "forged" }).success, false);
  assert.equal(businessAffiliateInput.safeParse({ ...input, website: "javascript:alert(1)" }).success, false);
  assert.equal(businessAffiliateInput.parse({ ...input, email: " BUSINESS@EXAMPLE.COM " }).email, input.email);
});

test("business codes discount checkout and earn replay-safe recurring rewards while enabled", async () => {
  const f = fixture(), business = await registerBusinessAffiliate(input, f);
  const buyer = { _id: randomUUID(), email: "customer@example.com" };
  const offer = await referralOffer(buyer, business.code, { price: 100 }, { repository: f.repository, reserve: true });
  assert.equal(offer.totalCents, 9000); assert.equal(offer.commissionCents, 1800);
  const payment = { userId: buyer._id, paymentId: "stripe:in_b2b_first", method: "stripe", first: true, baseCents: 9000, planName: "Synthetic Gold", paidAt: new Date() };
  await recordReferralPayment(payment, f); await recordReferralPayment(payment, f);
  await recordReferralPayment({ ...payment, paymentId: "stripe:in_b2b_renewal", first: false, baseCents: 10000 }, f);
  assert.equal(f.rewards.size, 2); assert.equal(f.rewards.get(payment.paymentId).rewardCents, 1800);
  assert.equal(f.rewards.get("stripe:in_b2b_renewal").rewardCents, 2000);
  await assert.rejects(resolveReferral(business.code, { repository: f.repository, email: input.email }), /own referral/);
  business.enabled = false;
  await assert.rejects(resolveReferral(business.code, f), /unavailable/);
  await recordReferralPayment({ ...payment, paymentId: "stripe:in_b2b_disabled", first: false }, f);
  assert.equal(f.rewards.size, 2);
});

test("business invitations address the contact and customer copy identifies the business without exposing contact details", () => {
  const company = { name: "Aeviora Wellness", telephone: "202-555-0123", email: "info@example.com" };
  const affiliate = { ...input, ...defaultReferralTerms, kind: "business", code: "B2B-SYNTHETIC" };
  const link = "https://example.com/register?ref=B2B-SYNTHETIC";
  for (const language of ["en", "es"]) {
    const customer = referralShareMessage({ company, affiliate, link }, language);
    assert.ok(customer.text.includes(input.businessName) && customer.text.includes(affiliate.code) && customer.text.includes(link));
    assert.ok(!customer.text.includes(input.email), "contact details stay in the admin/business invitation");
    const invitation = businessAffiliateInvitation({ company, affiliate, link }, language);
    assert.ok(invitation.text.includes("20%") && invitation.text.includes("10%"));
    assert.ok(invitation.text.includes(input.contactName));
    const draft = new URL(invitation.emailHref);
    assert.equal(decodeURIComponent(draft.pathname), input.email);
    assert.equal(draft.searchParams.get("body"), invitation.text);
  }
});

test("B2B admin endpoints enforce roles, preserve codes on retry, manage details and keep business contacts private", async (t) => {
  const saved = process.env.JWT_ACCESS_SECRET; process.env.JWT_ACCESS_SECRET = "synthetic-business-secret";
  t.after(() => { if (saved === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = saved; });
  const f = fixture();
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, accountStatus: "active", role: id === "admin" ? "admin" : "patient" }) }));
  t.mock.method(User, "create", async () => assert.fail("B2B registration must not create a patient login"));
  t.mock.method(AuditLog, "create", async () => ({}));
  t.mock.method(ReferralSettings, "findById", () => ({ lean: async () => null }));
  t.mock.method(ReferralAffiliate, "findOne", async () => null);
  t.mock.method(ReferralAffiliate, "exists", async () => false);
  t.mock.method(BusinessAffiliate, "findOne", async (filter) => f.businesses.find((business) => Object.entries(filter).every(([key, value]) => business[key] === value)) || null);
  t.mock.method(BusinessAffiliate, "create", f.repository.createBusiness);
  const matches = (business, filter) => !filter.$or || filter.$or.some((item) => Object.entries(item).some(([key, pattern]) => pattern.test(business[key] || "")));
  t.mock.method(BusinessAffiliate, "find", (filter) => { const query = { sort: () => query, skip: () => query, limit: () => query, lean: async () => f.businesses.filter((business) => matches(business, filter)) }; return query; });
  t.mock.method(BusinessAffiliate, "countDocuments", async (filter) => f.businesses.filter((business) => matches(business, filter)).length);
  t.mock.method(BusinessAffiliate, "findByIdAndUpdate", async (id, update) => { const business = f.businesses.find((item) => item._id === id); if (!business) return null; Object.assign(business, update.$set); return business; });
  t.mock.method(ReferralReward, "find", () => ({ select: () => ({ lean: async () => [] }) }));
  const app = express(); app.use(express.json(), cookieParser(), router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { method = "GET", body, role = "admin" } = {}) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(role ? { cookie: `accessToken=${jwt.sign({ userId: role, role }, process.env.JWT_ACCESS_SECRET)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await request("/admin/businesses", { role: null })).status, 401);
  assert.equal((await request("/admin/businesses", { role: "patient" })).status, 403);
  assert.equal((await request("/admin/businesses", { role: "patient", method: "POST", body: input })).status, 403);
  assert.equal((await request("/admin/businesses", { method: "POST", body: { ...input, kind: "member" } })).status, 400);
  const business = (await (await request("/admin/businesses", { method: "POST", body: input })).json()).business;
  assert.equal(business.kind, "business");
  const retry = (await (await request("/admin/businesses", { method: "POST", body: input })).json()).business;
  assert.equal(retry._id, business._id);
  const another = (await (await request("/admin/businesses", { method: "POST", body: { ...input, businessName: "Second business" } })).json()).business;
  assert.notEqual(another.code, business.code);
  const list = await (await request("/admin/businesses?search=Synthetic%20Business&path=referrals")).json();
  assert.equal(list.total, 1); assert.equal(list.businesses[0].summary.balanceCents, 0);
  const publicOffer = await (await request(`/offer/${business.code}`, { role: null })).json();
  assert.equal(publicOffer.offer.discountPercent, 10); assert.ok(!JSON.stringify(publicOffer).includes(input.email));
  const patch = { ...input, ...defaultReferralTerms, code: business.code, enabled: false };
  assert.equal((await request(`/admin/businesses/${business._id}`, { method: "PATCH", body: patch })).status, 200);
  assert.equal((await request(`/offer/${business.code}`, { role: null })).status, 409);
  assert.equal((await request(`/admin/affiliates/${business._id}`, { method: "PATCH", body: { ...defaultReferralTerms, code: business.code } })).status, 400, "member codes cannot take the B2B namespace");
});
