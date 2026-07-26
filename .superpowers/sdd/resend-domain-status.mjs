const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY is unavailable");

const listResponse = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${apiKey}` },
});
if (!listResponse.ok) throw new Error(`Resend domains request failed: ${listResponse.status}`);

const list = await listResponse.json();
const domain = list.data?.find((item) => item.name === "volaura.app");
if (!domain) throw new Error("volaura.app is not registered in Resend");

if (process.argv.includes("--verify")) {
  const verifyResponse = await fetch(`https://api.resend.com/domains/${domain.id}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!verifyResponse.ok) {
    const error = await verifyResponse.json().catch(() => ({}));
    throw new Error(`Resend domain verification failed: ${verifyResponse.status} ${error.message ?? ""}`.trim());
  }
}

const detailResponse = await fetch(`https://api.resend.com/domains/${domain.id}`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});
if (!detailResponse.ok) throw new Error(`Resend domain detail failed: ${detailResponse.status}`);

const detail = await detailResponse.json();
console.log(JSON.stringify({
  id: detail.id,
  name: detail.name,
  status: detail.status,
  region: detail.region,
  records: detail.records?.map(({ record, name, type, value, priority, status }) => ({
    record,
    name,
    type,
    value,
    priority,
    status,
  })),
}, null, 2));
