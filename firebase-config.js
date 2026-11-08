/* Kongsi Firebase Configuration
 * To connect your Firebase project:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project and add a Web App
 * 3. Copy your firebaseConfig object here or paste it into Settings in the app.
 */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check for local browser override (useful for testing or pasting in Settings)
try {
  const localSaved = localStorage.getItem('kongsi.firebase_config');
  if (localSaved) {
    const parsed = JSON.parse(localSaved);
    if (parsed && parsed.apiKey && parsed.apiKey !== 'YOUR_API_KEY') {
      window.FIREBASE_CONFIG = parsed;
    }
  }
} catch (e) {
  // Ignore storage access errors
}
