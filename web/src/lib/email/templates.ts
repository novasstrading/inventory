/**
 * Branded HTML email templates — ported 1:1 from the legacy email_wrap()/
 * send_*_email() functions in server-upload/auth.php (navy/gold layout,
 * copy text, structure). Plain template strings rather than a component
 * library: these are simple, stable, and this keeps the dependency surface
 * small (see M1 notes on dropping react-email).
 */

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://assets.novasstrading.com";
}

function logoUrl(): string {
  return `${appUrl()}/logo-full.png`;
}

function emailWrap(innerHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#EDEFF3;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:480px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
.hdr{background:#001E46;padding:26px 28px;text-align:center}
.hdr img{height:52px;width:auto;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;background:#fff;border-radius:8px;padding:5px}
.hdr-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:.06em}
.hdr-sub{font-size:10px;color:#BE9646;letter-spacing:.1em;font-weight:600;margin-top:3px;text-transform:uppercase}
.hdr-bar{width:44px;height:3px;background:#BE9646;border-radius:2px;margin:10px auto 0}
.body{padding:30px 28px 22px}h2{margin:0 0 6px;font-size:21px;color:#0F1722}
.sub{color:#5B6675;font-size:14px;margin:0 0 22px;line-height:1.5}
.code-wrap{background:#F0F4FA;border:2px solid #001E46;border-radius:14px;padding:24px 16px;text-align:center;margin:22px 0}
.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:42px;font-weight:800;letter-spacing:.22em;color:#001E46;word-spacing:.12em}
.copy-btn{display:inline-block;margin-top:16px;background:#001E46;color:#fff!important;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:9px;letter-spacing:.02em}
.exp{font-size:12px;color:#5B6675;margin-top:14px}
.note{font-size:13px;color:#5B6675;line-height:1.65;border-top:1px solid #EEF1F5;padding-top:16px;margin-top:18px}
.chip{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600}
.chip-admin{background:#E5EEF7;color:#1F5C97}.chip-viewer{background:#EDE8F7;color:#5A3E9B}
.footer{background:#F7F9FC;padding:18px 28px;font-size:11px;color:#9AA5B4;text-align:center;border-top:1px solid #EEF1F5;line-height:1.7}
.footer b{color:#64748B}
a{color:#001E46}</style></head><body>
<div class="wrap">
<div class="hdr"><img src="${logoUrl()}" alt="Nova SS Trading"><div class="hdr-name">NOVA SS TRADING</div><div class="hdr-sub">Garments Buying House</div><div class="hdr-bar"></div></div>
<div class="body">${innerHtml}</div>
<div class="footer"><b>Nova SS Trading</b> — Asset Management System<br>
This is an automated message from an unmonitored address — please do not reply<br>
<a href="https://novasstrading.com" style="color:#9AA5B4">novasstrading.com</a></div>
</div></body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function otpEmail(code: string, ttlMinutes: number): { subject: string; html: string; text: string } {
  const parts = code.match(/.{1,3}/g)?.join(" ") ?? code;
  const copyLink = `${appUrl()}/copy?c=${code}`;
  const html = emailWrap(`<h2>Your sign-in code</h2>
<p class="sub">Enter this code to sign in to Nova SS Asset Manager. It expires in ${ttlMinutes} minutes.</p>
<div class="code-wrap"><div class="code" style="user-select:all">${code}</div>
<div style="font-size:11.5px;color:#8B95A3;margin-top:4px">Tip: press and hold the code to select &amp; copy it directly</div>
<a href="${copyLink}" class="copy-btn" target="_blank">Open &amp; copy code →</a>
<div class="exp">Expires in ${ttlMinutes} minutes &nbsp;&middot;&nbsp; Do not share this code</div></div>
<p class="note">If you did not request this, someone may have entered your email by mistake. Your account remains secure — no action is needed.</p>`);
  const text = `Your Nova SS Asset Manager login code is: ${code}\nValid for ${ttlMinutes} minutes.`;
  return { subject: `Your login code: ${parts}`, html, text };
}

export function userAddedEmail(role: "admin" | "viewer", byEmail: string): { subject: string; html: string; text: string } {
  const rl = role === "admin" ? "Admin" : "Viewer";
  const chip = `<span class="chip chip-${role}">${rl}</span>`;
  const desc =
    role === "admin"
      ? "Full access — you can add/edit assets, manage users, upload documents and print stickers."
      : "Read-only — you can browse inventory, search, view photos, export CSV and print stickers.";
  const html = emailWrap(`<h2>You have been added</h2>
<p class="sub">${esc(byEmail)} has granted you access as ${chip}</p>
<p style="font-size:14px;color:#0F1722;line-height:1.7"><strong>Access level:</strong> ${desc}</p>
<p style="font-size:14px;color:#0F1722;margin-top:14px">Sign in at <a href="${appUrl()}">${appUrl().replace(/^https?:\/\//, "")}</a> using this email address.</p>
<p class="note">If you were not expecting this, contact your IT administrator at it-support@novasstrading.com.</p>`);
  const text = `You have been added to Nova SS Asset Manager as ${rl} by ${byEmail}.\nSign in at ${appUrl()}`;
  return { subject: "You have been added to Nova SS Asset Manager", html, text };
}

export function userRemovedEmail(byEmail: string): { subject: string; html: string; text: string } {
  const html = emailWrap(`<h2>Access removed</h2>
<p class="sub">${esc(byEmail)} has removed your access to Nova SS Asset Manager.</p>
<p style="font-size:14px;color:#5B6675;line-height:1.7">Your active sessions have been ended and you can no longer sign in. If you believe this is a mistake, contact it-support@novasstrading.com.</p>`);
  const text = `Your Nova SS Asset Manager access has been removed by ${byEmail}.`;
  return { subject: "Your Nova SS Asset Manager access has been removed", html, text };
}
