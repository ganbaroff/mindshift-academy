#!/usr/bin/env node

const origin = process.env.ACADEMY_PROD_URL;
if (!origin) {
  console.error("BLOCKED: ACADEMY_PROD_URL is required");
  process.exit(2);
}

const expectedSha = process.env.ACADEMY_RELEASE_SHA?.trim().toLowerCase();
if (!/^[0-9a-f]{7,40}$/.test(expectedSha ?? "")) {
  console.error("BLOCKED: ACADEMY_RELEASE_SHA is required for deployment identity");
  process.exit(2);
}

const probes = [
  { path: "/", expectedStatus: 200 },
  { path: "/session/w1-s1", expectedStatus: 307, locationPrefix: "/sign-in" },
  { path: "/api/tasks/session/w1-s1", expectedStatus: 401 },
];

let failed = 0;
for (const probe of probes) {
  const response = await fetch(new URL(probe.path, origin), {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  });
  const location = response.headers.get("location") ?? "";
  const actualSha = response.headers.get("x-academy-release-sha")?.trim().toLowerCase() ?? "";
  const statusMatches = response.status === probe.expectedStatus;
  const locationMatches =
    !probe.locationPrefix || location.startsWith(probe.locationPrefix);
  const identityMatches = actualSha === expectedSha;
  const pass = statusMatches && locationMatches && identityMatches;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${probe.path} status=${response.status} sha=${actualSha || "<missing>"}`
  );
  if (!pass) failed += 1;
}

process.exit(failed === 0 ? 0 : 1);
