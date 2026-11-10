/**
 * Sidesuites team backend (Google Apps Script web app).
 *
 * Deployed ONCE from the contact@sidesuites.com Google account (see README.md in this folder). It:
 *   - books 30-minute consultation calls straight into that account's Google Calendar (with a Meet link and an
 *     invitation to the customer), offering only the open slots in the booking window below;
 *   - keeps every waitlist sign-up (home page form and Check My Lot) in a Google Sheet;
 *   - keeps every address looked up on Check My Lot, with its likelihood rating, in the same Sheet;
 *   - checks the team login and serves those lists to /team-login/.
 *
 * The team password is NOT in this file. It lives in Project Settings > Script properties (TEAM_EMAIL, TEAM_PASSWORD),
 * which only the account owner can see. This repository may be public, so never paste the password here.
 */

// ---------------------------------------------------------------- booking rules (edit here)
const TZ = 'America/New_York';
const SLOT_MIN = 30;                 // each consultation is 30 minutes
const DAYS_AHEAD = 31;               // "the next month": slots from tomorrow through 31 days out
const MIN_NOTICE_HOURS = 12;         // nobody can book a slot starting sooner than this
// Weekly hours, by weekday (0 = Sunday ... 6 = Saturday), local time in TZ. Each [start, end] is "HH:MM".
const HOURS = {
  1: [['09:00', '12:00']],           // Monday 9am - 12pm
  3: [['12:00', '16:00']],           // Wednesday 12pm - 4pm
};
const EVENT_TITLE = 'Sidesuites consultation';

// ---------------------------------------------------------------- sheet
const SHEETS = {
  Waitlist: ['Received', 'Name', 'Email', 'Phone', 'Address', 'City', 'ZIP', 'Folio', 'Use', 'Payment', 'Reserve', 'Lot check', 'Request', 'Best time', 'Language', 'Source'],
  Lookups: ['Received', 'Address', 'City', 'ZIP', 'Folio', 'County', 'Jurisdiction', 'Likelihood', 'Detail', 'Source'],
  Bookings: ['Received', 'Start', 'End', 'Name', 'Email', 'Phone', 'Address', 'Notes', 'Event ID', 'Source'],
};
function ss_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID'), book = id ? SpreadsheetApp.openById(id) : null;
  if (!book) { book = SpreadsheetApp.create('Sidesuites team data'); props.setProperty('SHEET_ID', book.getId()); }
  Object.keys(SHEETS).forEach(name => {
    let sh = book.getSheetByName(name);
    if (!sh) { sh = book.insertSheet(name); sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold'); }
  });
  const blank = book.getSheetByName('Sheet1'); if (blank && book.getSheets().length > 1) book.deleteSheet(blank);
  return book;
}
function append_(name, obj) {
  const cols = SHEETS[name], sh = ss_().getSheetByName(name);
  // a leading = + - @ would make the cell a formula: keep visitor text as plain text
  sh.appendRow(cols.map(c => c === 'Received' ? new Date() : clean_(obj[c])));
}
function clean_(v) { v = v == null ? '' : String(v).slice(0, 2000); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function rows_(name) {
  const sh = ss_().getSheetByName(name), vals = sh.getDataRange().getValues(), head = vals.shift();
  return vals.map(r => { const o = {}; head.forEach((h, i) => { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return o; });
}

// ---------------------------------------------------------------- web app entry points
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'slots') return json_(slots_());
  return json_({ ok: true, service: 'sidesuites-team' });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  try {
    switch (b.action) {
      case 'waitlist': if (b.botcheck) return json_({ ok: true }); append_('Waitlist', b.data || {}); return json_({ ok: true });
      case 'lookup': append_('Lookups', b.data || {}); return json_({ ok: true });
      case 'slots': return json_(slots_());
      case 'book': return json_(book_(b.data || {}));
      case 'login': return json_(login_(b.email, b.password));
      case 'data': return json_(data_(b.token));
      default: return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------------------------------------------------------------- booking
function cal_() { return CalendarApp.getDefaultCalendar(); }
// Every slot in the window, as [start, end] Dates.
function allSlots_() {
  const out = [], now = new Date(), earliest = new Date(now.getTime() + MIN_NOTICE_HOURS * 3600e3);
  for (let d = 1; d <= DAYS_AHEAD; d++) {
    const day = new Date(now.getTime() + d * 86400e3), ymd = Utilities.formatDate(day, TZ, 'yyyy-MM-dd');
    const dow = Number(Utilities.formatDate(day, TZ, 'u')) % 7; // 'u': 1 = Monday ... 7 = Sunday
    (HOURS[dow] || []).forEach(([a, b]) => {
      let t = at_(ymd, a); const end = at_(ymd, b);
      while (t.getTime() + SLOT_MIN * 60e3 <= end.getTime()) {
        const e = new Date(t.getTime() + SLOT_MIN * 60e3);
        if (t >= earliest) out.push([t, e]);
        t = e;
      }
    });
  }
  return out;
}
// A local wall-clock time in TZ as a Date (handles daylight saving through the zone's offset that day).
function at_(ymd, hm) {
  const guess = new Date(ymd + 'T' + hm + ':00Z');
  const off = Utilities.formatDate(guess, TZ, 'XXX'); // e.g. -05:00
  return new Date(ymd + 'T' + hm + ':00' + off);
}
function busy_(from, to) { return cal_().getEvents(from, to).filter(ev => ev.getMyStatus() !== CalendarApp.GuestStatus.NO && !ev.isAllDayEvent()).map(ev => [ev.getStartTime(), ev.getEndTime()]); }
function slots_() {
  const all = allSlots_(); if (!all.length) return { ok: true, tz: TZ, slots: [] };
  const busy = busy_(all[0][0], all[all.length - 1][1]);
  const free = all.filter(([s, e]) => !busy.some(([bs, be]) => s < be && e > bs));
  return { ok: true, tz: TZ, minutes: SLOT_MIN, slots: free.map(([s]) => s.toISOString()) };
}
function book_(d) {
  const name = String(d.name || '').trim(), email = String(d.email || '').trim();
  if (d.botcheck) return { ok: true };
  if (!name) return { ok: false, error: 'Please add your name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please add a valid email.' };
  const start = new Date(d.start);
  const slot = allSlots_().find(([s]) => s.getTime() === start.getTime());
  if (!slot) return { ok: false, error: 'That time is not available. Please pick another.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (busy_(slot[0], slot[1]).some(([bs, be]) => slot[0] < be && slot[1] > bs)) return { ok: false, taken: true, error: 'Someone just booked that time. Please pick another.' };
    const desc = ['30-minute Sidesuites consultation', '', 'Name: ' + name, 'Email: ' + email, d.phone ? 'Phone: ' + d.phone : '', d.address ? 'Property: ' + d.address : '', d.notes ? 'Notes: ' + d.notes : '', '', 'Booked on sidesuites.com'].filter((x, i, a) => x || a[i - 1]).join('\n');
    let eventId = '', meet = '';
    try { // a Google Meet link needs the Calendar advanced service (enabled in appsscript.json)
      const ev = Calendar.Events.insert({
        summary: EVENT_TITLE + ' · ' + name, description: desc,
        start: { dateTime: slot[0].toISOString(), timeZone: TZ }, end: { dateTime: slot[1].toISOString(), timeZone: TZ },
        attendees: [{ email: email, displayName: name }],
        conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
        reminders: { useDefault: true },
      }, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
      eventId = ev.id; meet = ev.hangoutLink || '';
    } catch (err) {
      const ev = cal_().createEvent(EVENT_TITLE + ' · ' + name, slot[0], slot[1], { description: desc, guests: email, sendInvites: true });
      eventId = ev.getId();
    }
    append_('Bookings', { Start: slot[0].toISOString(), End: slot[1].toISOString(), Name: name, Email: email, Phone: d.phone, Address: d.address, Notes: d.notes, 'Event ID': eventId, Source: d.source || 'book' });
    return { ok: true, start: slot[0].toISOString(), end: slot[1].toISOString(), meet: meet };
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------- team login
function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('TOKEN_SECRET'); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('TOKEN_SECRET', s); }
  return s;
}
function sign_(payload) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, secret_())); }
function login_(email, password) {
  const props = PropertiesService.getScriptProperties();
  const E = String(props.getProperty('TEAM_EMAIL') || '').trim().toLowerCase(), P = String(props.getProperty('TEAM_PASSWORD') || '');
  if (!E || !P) return { ok: false, error: 'Team login is not set up yet (add TEAM_EMAIL and TEAM_PASSWORD in Script properties).' };
  Utilities.sleep(400); // slows down guessing
  const okE = String(email || '').trim().toLowerCase() === E, okP = sign_(String(password || '')) === sign_(P);
  if (!okE || !okP) return { ok: false, error: 'Wrong email or password.' };
  const exp = Date.now() + 12 * 3600e3, payload = E + '|' + exp;
  return { ok: true, token: Utilities.base64EncodeWebSafe(payload) + '.' + sign_(payload), expires: exp };
}
function check_(token) {
  const [p, sig] = String(token || '').split('.'); if (!p || !sig) return false;
  const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(p)).getDataAsString();
  if (sign_(payload) !== sig) return false;
  return Number(payload.split('|')[1]) > Date.now();
}
function data_(token) {
  if (!check_(token)) return { ok: false, auth: false, error: 'Please log in again.' };
  return { ok: true, sheet: ss_().getUrl(), waitlist: rows_('Waitlist'), lookups: rows_('Lookups'), bookings: rows_('Bookings') };
}

// ---------------------------------------------------------------- one-time setup helper
// Run this once from the editor (Run > setup) to create the Sheet and grant the permissions.
function setup() { const b = ss_(); Logger.log('Sheet: ' + b.getUrl()); Logger.log('Open slots now: ' + slots_().slots.length); }
