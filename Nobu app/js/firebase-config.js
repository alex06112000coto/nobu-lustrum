import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_g4kb5-HvG9GNK506P6QVWTQz-hPSjtI",
  authDomain: "nobu-lustrum.firebaseapp.com",
  projectId: "nobu-lustrum",
  storageBucket: "nobu-lustrum.firebasestorage.app",
  messagingSenderId: "605421415558",
  appId: "1:605421415558:web:bb500cb8e8084a7be7f507",
  measurementId: "G-LT54HMZHKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Fail-fast configuration: prevent 10-minute hanging uploads on inactive/misconfigured buckets
try {
  storage.maxUploadRetryTime = 3000;      // 3 seconds max upload retry
  storage.maxOperationRetryTime = 3000;   // 3 seconds max metadata/operation retry
  console.log("Firebase Storage fail-fast retry timeouts configured directly (3000ms).");
} catch (e) {
  console.warn("Could not set Storage retry timeouts:", e);
}

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics could not be initialized:", e);
}

// Enable Firestore Offline Persistence for a PWA experience
try {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore Offline Persistence enabled successfully");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("Firestore offline persistence failed: Multiple tabs open.");
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore offline persistence failed: Browser does not support IndexedDB.");
      }
    });
} catch (e) {
  console.warn("Firestore offline persistence could not be initialized:", e);
}

export { app, auth, db, storage, analytics };
