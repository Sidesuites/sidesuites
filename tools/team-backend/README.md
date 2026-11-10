# Sidesuites team backend

One small Google Apps Script web app, run by the **contact@sidesuites.com** Google account. It powers:

| Page | What it does |
| --- | --- |
| `/book/` | Shows the open 30-minute consultation slots and books them straight into the contact@sidesuites.com Google Calendar. The customer gets a calendar invitation with a Google Meet link. |
| Home page waitlist form, Check My Lot | Every waitlist sign-up is saved to the **Waitlist** tab of a Google Sheet. The Web3Forms email still arrives as before. |
| Check My Lot | Every address checked is saved to the **Lookups** tab with its likelihood: Highly likely / Likely / Unlikely / Outside service area / Address not found. |
| `/team-login/` | Team login. It shows the waitlist, the lookups grouped by likelihood, booked calls and the heat map (`/internal/adu-map/`, with its Batch check). |

The site is static (GitHub Pages), so this script is where the data lives and where the password is checked.
**The password is never stored in this repository.** It is kept in the script's private Script properties.

## Booking rules

These are set at the top of `Code.gs`:

* 30-minute calls (`SLOT_MIN`)
* from tomorrow through the next 31 days (`DAYS_AHEAD`), with at least 12 hours' notice (`MIN_NOTICE_HOURS`)
* Mondays 9am–12pm and Wednesdays 12pm–4pm, Eastern Time (`HOURS`)
* A slot is hidden when the calendar already has an event at that time, including calls already booked.

To change the hours later, edit `HOURS` in the Apps Script editor and deploy a new version (**Deploy → Manage deployments → Edit → Version: New version**). The URL stays the same.

## One-time setup (about 10 minutes)

1. Sign in to Google as **contact@sidesuites.com** and open <https://script.google.com> → **New project**. Name it `Sidesuites team backend`.
2. Replace the contents of `Code.gs` with this folder's `Code.gs`.
3. **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**. Back in the editor, replace `appsscript.json` with this folder's `appsscript.json`. This turns on the Calendar service, which creates the Meet links.
4. **Project Settings → Script properties → Add script property**. Add two properties:
   * `TEAM_EMAIL` = `contact@sidesuites.com`
   * `TEAM_PASSWORD` = the team password
5. In the editor, pick the `setup` function and click **Run**. Approve the permissions: Calendar, Sheets, and Drive (needed to create the Sheet). The log shows the new Sheet's link, **Sidesuites team data**.
6. **Deploy → New deployment → Select type: Web app**.
   * Execute as: **Me (contact@sidesuites.com)**
   * Who has access: **Anyone**
   * Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.
7. Paste that URL into `js/team-api.js` (`var URL = '...'`), then commit and push. Once GitHub Pages updates, everything is live.

## Notes

* Logins last 12 hours per browser tab. A token is signed with a random secret the script creates (`TOKEN_SECRET`). To log everyone out, delete that property.
* To change the password, change `TEAM_PASSWORD` in Script properties. No redeploy is needed.
* The data is also in the Google Sheet, which only contact@sidesuites.com, and anyone it's shared with, can open.
* `/internal/adu-map/` itself is still a public, unlisted URL (`noindex`). A static site can't put a real password on a file. The login protects the waitlist and lookup data, which only the script serves.
