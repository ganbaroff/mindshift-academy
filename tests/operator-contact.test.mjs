#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  OPERATOR_EMAIL_DEFAULT,
  OPERATOR_NAME_DEFAULT,
  OPERATOR_PHONE_DEFAULT,
  cleanEnvOverride,
  getOperatorContact,
} from "../src/lib/operator-contact.ts";

assert.equal(cleanEnvOverride(undefined, "ok"), "ok");
assert.equal(cleanEnvOverride("   ", "ok"), "ok");
assert.equal(
  cleanEnvOverride("???? ????????", OPERATOR_NAME_DEFAULT),
  OPERATOR_NAME_DEFAULT
);
assert.equal(
  cleanEnvOverride("Yusif Ganbarov", OPERATOR_NAME_DEFAULT, {
    requireCyrillic: true,
  }),
  OPERATOR_NAME_DEFAULT
);
assert.equal(
  cleanEnvOverride("Анна Тест", OPERATOR_NAME_DEFAULT, {
    requireCyrillic: true,
  }),
  "Анна Тест"
);
assert.equal(
  cleanEnvOverride("Юс?ф Ганбаров", OPERATOR_NAME_DEFAULT, {
    requireCyrillic: true,
  }),
  OPERATOR_NAME_DEFAULT
);

const corrupted = getOperatorContact({
  NEXT_PUBLIC_OPERATOR_NAME: "???? ????????",
  NEXT_PUBLIC_OPERATOR_EMAIL: OPERATOR_EMAIL_DEFAULT,
  NEXT_PUBLIC_OPERATOR_PHONE: OPERATOR_PHONE_DEFAULT,
});
assert.equal(corrupted.name, OPERATOR_NAME_DEFAULT);
assert.equal(corrupted.email, OPERATOR_EMAIL_DEFAULT);
assert.equal(corrupted.phone, OPERATOR_PHONE_DEFAULT);

console.log("Operator contact contract passed");
