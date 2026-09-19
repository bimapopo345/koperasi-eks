import test from "node:test";
import assert from "node:assert/strict";
import {
  getEffectiveMembershipStatus,
  getMembershipStatusMessage,
  normalizeMembershipStatus,
} from "../src/utils/membershipStatus.js";

test("membership status accepts the three supported values", () => {
  assert.equal(normalizeMembershipStatus("draft"), "draft");
  assert.equal(normalizeMembershipStatus("ACTIVE"), "active");
  assert.equal(normalizeMembershipStatus("inactive"), "inactive");
  assert.equal(normalizeMembershipStatus("unknown"), "");
});

test("legacy members without a status remain active until manually edited", () => {
  assert.equal(getEffectiveMembershipStatus({}), "active");
  assert.equal(getEffectiveMembershipStatus({ membershipStatus: "draft" }), "draft");
  assert.equal(getEffectiveMembershipStatus({ membershipStatus: "inactive" }), "inactive");
});

test("student-facing membership messages explain blocked access", () => {
  assert.match(getMembershipStatusMessage("draft"), /belum dibuka/i);
  assert.match(getMembershipStatusMessage("inactive"), /sudah ditutup/i);
  assert.equal(getMembershipStatusMessage("active"), "");
});
