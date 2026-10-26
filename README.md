# Kongsi - shared expense prototype (PWA)

Original-brand, mobile-first clickable prototype for tracking shared expenses, seeing who owes whom and recording repayments. Plain HTML/CSS/JS; no build step, no dependencies, no backend. Data is stored in the browser's localStorage.

## Files
| File | Purpose |
|---|---|
| index.html | App shell, iOS PWA meta tags |
| styles.css | Design system and all screens |
| app.js | Data model, calculations, screens, interactions |
| manifest.webmanifest | Install metadata (name, icons, standalone display) |
| sw.js | Service worker (offline app shell; needs HTTPS or localhost) |
| icons/ | Home Screen / PWA icons (180, 192, 512, maskable) |

## Run locally
### bash
# cd kongsi
python3 -m http.server 8000
# or: npx serve

Open http://localhost:8000. To try on a phone on the same Wi-Fi, open `http://<your-computer-ip>:8000` in Safari. It works over plain HTTP, but offline caching (service worker) only activates on HTTPS or localhost.

## Host it (so others can open a URL)
Upload the folder contents (keep `index.html` at the root) to any static host:
* **Netlify**: drag the folder onto https://app.netlify.com/drop
* **Cloudflare Pages / Vercel**: create a project, point at the folder, no build command, output dir `.`
* **GitHub Pages**: push the files to a repo, Settings > Pages > deploy from branch (`/` root)

All paths are relative, so it also works from a sub-path (e.g. `username.github.io/kongsi/`).

## Install on iPhone
1. Open the hosted HTTPS URL in **Safari**.
2. Tap **Share** > **Add to Home Screen** > **Add**.
3. Launch from the Home Screen: it opens full-screen with no Safari chrome.

(On Android Chrome: menu > Install app. On desktop it renders in a phone-sized frame.)

## What works
* **Home**: net balance, you are owed / you owe, recent activity, groups and friends with balances, Add expense (button and centre "+").
* **Groups**: create (name, icon, members, add new people), group balances, member nets, simplified payments, expense list.
* **Add / edit / delete expense**: description, amount, currency (MYR, JPY, SGD, USD, EUR, THB), date, group, participants. Split equally, exact amounts or percentages with live validation and calculation.
* **Recurring**: weekly / monthly / yearly with a chosen next date. When a date comes due (checked on open), the next occurrence is added automatically and logged.
* **Balances**: per person (owes you / you owe) and per group, with simplified debts.
* **Settle up**: records a payment only (no money moves). Updates balances and the activity feed; logs "settled up" when a balance reaches zero.
* **Activity**: grouped by day: expenses added/edited/deleted, recurring, payments, settlements, new groups.
* **Expense detail**: payer, participants, split calculation, date, group, recurring status, Edit, Delete.
Settings (gear on Home): **Reset demo data**.

## Prototype assumptions
One payer per expense. Balances are calculated in MYR; foreign-currency expenses use fixed demo rates (shown on the form and detail screen).
A payment with "All groups" is allocated across the groups where that debt exists (largest first), so group and overall balances stay consistent.
Rounding: equal and percentage splits use largest-remainder so shares always add to the exact total.
- Clearing browser data erases the prototype data. Seed dates are generated relative to the day of first launch.
- Updating the app after hosting: bump `CACHE` in `sw.js` (e.g. `kongsi-shell-v2`) so installed copies pick up new files.
