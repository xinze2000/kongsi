# Kongsi 💰

Mobile-first shared expense tracker (similar to Splitwise) built with plain HTML, CSS, and JavaScript. Designed for small groups of friends, housemates, and travel companions to track shared expenses, split bills, simplify debts, and record repayments in real time.

Live-ready for **GitHub Pages** with free-tier **Google Firebase** cloud backend.

---

## Features

* **Multi-User Cloud Sync**: Built with Firebase Firestore and Authentication. Expenses, groups, and settlements sync in real time across all members' devices without page refresh.
* **Smart Bill Splitting**:
  * **Equal split**: Largest-remainder distribution prevents rounding errors or lost cents.
  * **Exact amounts**: Custom payment per person with real-time balance validation.
  * **Percentages**: Proportional splits guaranteed to total 100%.
* **Debt Simplification**: Automatically computes net balances across groups and minimizes the number of transfers needed to settle up.
* **Group Invitations**: Invite friends via a shareable invite link (`?join=group_id`) or by entering their registered email address.
* **Offline-Ready Progressive Web App (PWA)**:
  * Network-first caching with service worker (`sw.js`).
  * Installable directly to iPhone (Safari > Share > Add to Home Screen) and Android (Chrome > Install App) with native app look and feel.
* **Multi-Currency Support**: Log expenses in MYR, SGD, USD, EUR, JPY, and THB.
* **Zero Build Step**: No Node.js, Webpack, or npm dependencies required. Open `index.html` in any browser.

---

## File Structure

```text
├── index.html            # Main HTML5 shell & Firebase SDK CDN scripts
├── styles.css            # Mobile-first design system & modal styling
├── app.js                # Core state, math, Firestore sync, UI routing
├── firebase-config.js    # Firebase connection configuration
├── firestore.rules       # Security rules for Cloud Firestore
├── manifest.webmanifest  # PWA installation metadata
├── sw.js                 # Service worker (Network-First caching)
└── icons/                # App icons for iOS & Android
```

---

## Setting Up Free Cloud Sync (Firebase)

Kongsi runs in **Local Demo Mode** by default. To enable real-time shared syncing between friends:

1. **Create a Free Firebase Project**:
   * Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
   * Name your project (e.g. `kongsi-app`) and disable Google Analytics (optional).
   * Confirm the free **Spark plan** (no credit card required).

2. **Enable Authentication**:
   * In the Firebase sidebar, go to **Build > Authentication** and click **Get Started**.
   * Under the **Sign-in method** tab, enable **Email/Password**.
   * Under the **Settings** tab, scroll to **Authorized domains** and add your GitHub Pages domain (e.g., `username.github.io`).

3. **Enable Firestore Database**:
   * In the sidebar, go to **Build > Firestore Database** and click **Create database**.
   * Choose standard location (e.g. `asia-southeast1` or nearest region) and start in **Production mode**.
   * Click the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**.

4. **Add Your Web Config**:
   * In Firebase Project Settings (gear icon) > **General**, scroll to "Your apps", click the **Web `</>`** icon, and register the app.
   * Copy the `firebaseConfig` object and paste it into `firebase-config.js` (or paste it directly into the in-app Settings modal).

---

## Deployment to GitHub Pages

1. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Deploy Kongsi with Firebase cloud sync"
   git push -u origin main
   ```

2. **Enable Pages**:
   * Open your GitHub repository in your browser.
   * Go to **Settings > Pages**.
   * Under **Build and deployment > Branch**, choose `main` and `/ (root)`.
   * Click **Save**.
   * Your site will be live at `https://<your-username>.github.io/kongsi/`.

---

## Installing on Mobile Devices

* **iPhone (Safari)**:
  1. Open your live GitHub Pages link in Safari.
  2. Tap the **Share** button (box with upward arrow).
  3. Tap **Add to Home Screen**, then tap **Add**.
  4. Kongsi opens standalone in full screen.
* **Android (Chrome)**:
  1. Open the URL in Chrome.
  2. Tap the three-dot menu and select **Install app** (or "Add to Home screen").
