// Registers the @/* alias resolve hook, then hands off to the test entry.
// Usage: node --import ./scripts/alias-register.mjs scripts/test-rewards.ts
import { register } from "node:module";
register("./alias-loader.mjs", import.meta.url);
