/* Kongsi Firebase Configuration
 * To connect your Firebase project:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project and add a Web App
 * 3. Copy your firebaseConfig object here or paste it into Settings in the app.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDjFSQbfQUr49FQDbm_ppG8Gu5v0MbOLuU",
  authDomain: "kongsi-app-9737c.firebaseapp.com",
  projectId: "kongsi-app-9737c",
  storageBucket: "kongsi-app-9737c.firebasestorage.app",
  messagingSenderId: "909288767091",
  appId: "1:909288767091:web:2120ea85fe3e02ec78b406"
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

