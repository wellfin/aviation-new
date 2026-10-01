/**
 * Enquiry forms accept only professional/business email addresses. An address is
 * treated as personal when its domain is a free consumer mailbox provider or a
 * disposable-inbox service. Keep this list in sync with the website's copy
 * (website/src/lib/business-email.ts).
 */

/** Exact domains of free consumer mailbox providers and disposable inboxes. */
const PERSONAL_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "outlook.com", "hotmail.com", "live.com", "msn.com", "passport.com", "windowslive.com",
  // Yahoo / AOL family
  "yahoo.com", "ymail.com", "rocketmail.com", "aol.com", "aim.com", "verizon.net",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // Privacy mailboxes
  "proton.me", "protonmail.com", "pm.me", "tutanota.com", "tutanota.de", "tuta.io", "tutamail.com", "hushmail.com", "mailfence.com", "fastmail.com", "fastmail.fm", "hey.com", "duck.com",
  // Other free providers
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch", "gmx.co.uk", "gmx.us", "web.de", "mail.com", "email.com", "usa.com", "zoho.com", "zohomail.com", "zohomail.in",
  "yandex.com", "yandex.ru", "ya.ru", "mail.ru", "inbox.ru", "list.ru", "bk.ru", "rambler.ru",
  "rediffmail.com", "rediff.com", "indiatimes.com", "sify.com", "in.com",
  "qq.com", "163.com", "126.com", "139.com", "sina.com", "sina.cn", "sohu.com", "yeah.net", "foxmail.com", "aliyun.com",
  "naver.com", "daum.net", "hanmail.net", "nate.com",
  "libero.it", "virgilio.it", "tiscali.it", "alice.it", "orange.fr", "wanadoo.fr", "free.fr", "laposte.net", "sfr.fr", "t-online.de", "freenet.de", "arcor.de",
  "btinternet.com", "sky.com", "talktalk.net", "virginmedia.com", "ntlworld.com", "blueyonder.co.uk",
  "comcast.net", "att.net", "sbcglobal.net", "bellsouth.net", "cox.net", "charter.net", "earthlink.net", "juno.com", "shaw.ca", "rogers.com", "sympatico.ca", "bigpond.com", "optusnet.com.au",
  "seznam.cz", "wp.pl", "o2.pl", "interia.pl", "onet.pl", "abv.bg", "ukr.net", "uol.com.br", "bol.com.br", "terra.com.br",
  // Disposable inboxes
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "tempmailo.com",
  "yopmail.com", "yopmail.fr", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "moakt.com", "emailondeck.com", "mohmal.com", "tempail.com",
]);

/** Providers that use one brand across many country domains (yahoo.co.in, hotmail.fr, live.co.uk, outlook.de, …). */
const PERSONAL_BRANDS = /^(yahoo|ymail|hotmail|outlook|live|msn|gmail|googlemail|yandex|gmx|aol|icloud|protonmail|zoho)\.[a-z]{2,3}(\.[a-z]{2})?$/;

export const BUSINESS_EMAIL_MESSAGE = "Please use your work email address (personal addresses such as Gmail, Yahoo or Outlook aren't accepted).";

/** True when `email`'s domain is not a known personal/disposable mailbox provider. */
export function isBusinessEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  if (!domain || !domain.includes(".")) return false;
  return !PERSONAL_DOMAINS.has(domain) && !PERSONAL_BRANDS.test(domain);
}
