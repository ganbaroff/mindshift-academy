// Send (or preview) the family invitation letter.
//
//   node scripts/send-family-invite.mjs family-codes-2026-08-04.txt              # preview only
//   node scripts/send-family-invite.mjs family-codes-2026-08-04.txt --send       # actually deliver
//   node scripts/send-family-invite.mjs <file> --only=parent@example.com [--send]
//
// Reads the credentials file produced when codes were issued. Writes a preview HTML per family
// so the letter can be looked at before anyone receives it. Never prints a code or a token —
// the whole point of the file is that those values exist in exactly one place.
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { inviteHtml, inviteText, sendFamilyInvite, INVITE_SUBJECT } = await import(
  "@/lib/family-invite-email"
);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const doSend = args.includes("--send");
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1]?.trim().toLowerCase();

if (!file) {
  console.error("Usage: node scripts/send-family-invite.mjs <codes-file> [--send] [--only=email]");
  process.exit(1);
}

const mask = (email) => `${email.slice(0, 3)}***@${email.split("@")[1] ?? ""}`;

// Two block shapes are accepted, so the file `approve-access-request.mjs` writes can be fed
// straight in without hand-editing it into the older hand-written layout:
//   "Родитель: <email>" / "...activate?t=<token>" / "Код для ребёнка: XXXX YYYY"
//   "EMAIL: <email>"    / "ACTIVATE: ...?t=<token>" / "CODE: XXXX YYYY"
const text = readFileSync(file, "utf8");
const invites = [];
for (const block of text.split(/\n\s*\n/)) {
  const to = block.match(/(?:Родитель|EMAIL):\s*(\S+@\S+)/i)?.[1]?.trim().toLowerCase();
  const activationToken = block.match(/activate\?t=([A-Za-z0-9_-]+)/)?.[1];
  const code = block.match(/(?:Код для ребёнка|CODE):\s*([A-Z0-9]{4})[\s-]*([A-Z0-9]{4})/i);
  if (to && activationToken && code) {
    invites.push({ to, activationToken, code: `${code[1]}${code[2]}` });
  }
}

const selected = only ? invites.filter((i) => i.to === only) : invites;
if (selected.length === 0) {
  console.error(`No complete invitation blocks found in ${file}${only ? ` for ${only}` : ""}.`);
  process.exit(1);
}

const from = process.env.RESEND_FROM?.trim();
console.log(`invitations parsed: ${selected.length}`);
console.log(`subject: ${INVITE_SUBJECT}`);
console.log(`from: ${from || "(RESEND_FROM unset — would fall back to the Resend sandbox sender)"}`);
console.log(`mode: ${doSend ? "SEND" : "preview only"}\n`);

if (doSend && !from) {
  console.error(
    "ABORT: RESEND_FROM is not set. The sandbox sender only delivers to the Resend account owner,\n" +
      "so real families would silently receive nothing. Set RESEND_FROM to a verified-domain address."
  );
  process.exit(1);
}

let index = 0;
for (const invite of selected) {
  index += 1;
  const previewPath = `invite-preview-${index}.html`;
  writeFileSync(previewPath, inviteHtml(invite), "utf8");
  const plain = inviteText(invite);
  console.log(`${index}. ${mask(invite.to)} — preview: ${previewPath} (${plain.length} chars plain text)`);

  if (doSend) {
    const result = await sendFamilyInvite(invite);
    console.log(`   ${result.sent ? `SENT (id ${result.id ?? "n/a"})` : `NOT SENT (${result.reason})`}`);
  }
}

console.log(
  doSend
    ? "\nDone. Delivery is asynchronous — check the Resend dashboard for bounces."
    : "\nPreview only: nothing was sent. Re-run with --send when the letter looks right."
);
process.exit(0);
