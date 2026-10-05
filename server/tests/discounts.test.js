import test from "node:test";
import assert from "node:assert/strict";
import { discountApplies, discountSchema, discountText } from "../../shared/discounts.js";
import { feeInput } from "../services/feeCatalog.js";
import { feeOptions, resolveBenefit } from "../services/benefits.js";
import { resolveMembership } from "../services/membershipPlans.js";
import Benefit from "../models/benefits.js";
import MembershipPlan from "../models/membershipPlans.js";

const id = "111111111111111111111111";
const other = "222222222222222222222222";
const discount = () => ({ percent: 15, laboratoryFees: { mode: "allExcept", feeIds: [id] }, diagnosticFees: { mode: "selected", feeIds: [other] } });
const fee = () => ({ name: "Discount prices", billcode: "D15", description: "Eligible services", pricingType: "discount", discount: discount() });

test("discount rules support selected services and all-except including future services", () => {
  const rule = discountSchema.parse(discount());
  assert.equal(discountApplies(rule, "laboratoryFees", id), false);
  assert.equal(discountApplies(rule, "laboratoryFees", other), true);
  assert.equal(discountApplies(rule, "diagnosticFees", id), false);
  assert.equal(discountApplies(rule, "diagnosticFees", other), true);
  assert.equal(discountApplies(rule, "serviceFees", other), false);
  assert.match(discountText(rule), /15% discount/);
});

test("discount fees require no prices and reject invalid percentages, empty scope and price mixing", () => {
  assert.equal(feeInput("serviceFees").safeParse(fee()).success, true);
  assert.equal(feeInput("laboratoryFees").safeParse(fee()).success, false);
  for (const percent of [0, -1, 101, 1.001, "15"]) assert.equal(discountSchema.safeParse({ ...discount(), percent }).success, false);
  assert.equal(discountSchema.safeParse({ percent: 15, laboratoryFees: { mode: "selected", feeIds: [] }, diagnosticFees: { mode: "selected", feeIds: [] } }).success, false);
  assert.equal(feeInput("serviceFees").safeParse({ ...fee(), retailPrice: 10 }).success, false);
});

test("percentage and eligibility persist through benefit and membership without dollar prices", async () => {
  const options = feeOptions([{ _id: id, ...fee() }], "serviceFees");
  assert.equal(options.length, 1);
  const selection = { source: "serviceFees", feeId: id, pricingType: "discount", discount: discount() };
  const benefit = resolveBenefit({ name: "Discount benefit", description: "Eligible fees", price: null, services: [selection] }, options);
  assert.equal(benefit.price, null);
  assert.equal(benefit.pricingType, "discount");
  assert.equal(benefit.services[0].amount, undefined);
  assert.equal(benefit.cost, 0);
  await new Benefit(benefit).validate();
  const membership = resolveMembership({ name: "Bronze", price: 20, benefits: [{ benefitId: other, price: null }] }, [{ _id: other, ...benefit }]);
  assert.equal(membership.benefits[0].price, null);
  assert.deepEqual(membership.benefits[0].discounts[0], discount());
  await new MembershipPlan(membership).validate();
  assert.throws(() => resolveMembership({ name: "Bronze", price: 20, benefits: [{ benefitId: other, price: 10 }] }, [{ _id: other, ...benefit }]), { status: 409 });
  assert.throws(() => resolveBenefit({ name: "Discount", description: "Changed", price: null, services: [{ ...selection, discount: { ...discount(), percent: 20 } }] }, options), { status: 409 });
});

test("mixed benefits retain priced costs without subtracting a percentage from provider costs", () => {
  const options = [...feeOptions([{ _id: id, ...fee() }], "serviceFees"),
    ...feeOptions([{ _id: other, name: "Lab test", labPrices: [{ lab: "Example", amount: 30 }] }], "laboratoryFees")];
  const services = [{ source: "serviceFees", feeId: id, pricingType: "discount", discount: discount() },
    { source: "laboratoryFees", feeId: other, provider: "Example", amount: 30 }];
  const result = resolveBenefit({ name: "Mixed", description: "Mixed services", price: 50, services }, options);
  assert.equal(result.cost, 30); assert.equal(result.price, 50);
  assert.throws(() => resolveBenefit({ name: "Mixed", description: "Mixed services", price: null, services }, options), { status: 409 });
});

test("editing a discount benefit accepts null price through Mongoose update validation", async (t) => {
  const options = feeOptions([{ _id: id, ...fee() }], "serviceFees");
  const data = resolveBenefit({ name: "Discount", description: "Edit", price: null,
    services: [{ source: "serviceFees", feeId: id, pricingType: "discount", discount: discount() }] }, options);
  let called = false;
  t.mock.method(Benefit.collection, "findOneAndUpdate", async () => { called = true; return { _id: id, ...data }; });
  const result = await Benefit.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  assert.equal(called, true);
  assert.equal(result.price, null);
});
