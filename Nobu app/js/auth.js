import { auth, db, storage } from "./firebase-config.js?v=19";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
// Retrieve state and functions from window to completely bypass circular dependency TDZ issues
const state = window.__NOBU_APP__.state;
const fetchUserProfile = window.__NOBU_APP__.fetchUserProfile;

// DOM References
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginErrorMsg = document.getElementById("login-error-msg");

const signupInviteInput = document.getElementById("signup-invite");
const signupNicknameInput = document.getElementById("signup-nickname");
const signupRealnameInput = document.getElementById("signup-realname");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupErrorMsg = document.getElementById("signup-error-msg");

const goToSignup = document.getElementById("go-to-signup");
const goToLogin = document.getElementById("go-to-login");
const authLoginCard = document.getElementById("auth-login-card");
const authSignupCard = document.getElementById("auth-signup-card");

const profileUpdateForm = document.getElementById("profile-update-form");
const profileNicknameInput = document.getElementById("profile-nickname-input");
const profileRealnameInput = document.getElementById("profile-realname-input");
const profileUpdateMsg = document.getElementById("profile-update-msg");
const profileAvatarInput = document.getElementById("profile-avatar-input");
const profileAvatarDisplay = document.getElementById("profile-avatar-display");
const logoutBtn = document.getElementById("logout-btn");
const demoBypassBtn = document.getElementById("demo-bypass-btn");

// Fallback Hardcoded Invite Code
const DEFAULT_INVITE_CODE = "NOBU2026";

// Native navigation is now used to transition between index.html and signup.html

// Local Demo Bypass Button Click Handler
if (demoBypassBtn) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    demoBypassBtn.style.display = "block";
  }
  
  demoBypassBtn.addEventListener("click", () => {
    sessionStorage.setItem("nobu_demo_bypass", "true");
    
    // Set mock user in global state
    state.user = { 
      uid: "demo_user", 
      email: "demo@nobulustrum.nl" 
    };
    state.profile = {
      uid: "demo_user",
      nickname: "Lustrum Gast",
      realname: "Gast (Offline Preview)",
      avatarUrl: "nobu logo.jpg"
    };
    
    // Save mock profile in sessionStorage
    sessionStorage.setItem("nobu_demo_profile", JSON.stringify(state.profile));
    
    // Update header profile avatar badge
    const avatarEl = document.getElementById("header-user-avatar");
    if (avatarEl) avatarEl.src = "nobu logo.jpg";
    
    console.log("Logged in in Demo Mode!");
    window.location.hash = "#feed";
  });
}

// Handle Account Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginErrorMsg) loginErrorMsg.style.display = "none";
    
    if (!loginEmailInput || !loginPasswordInput) return;
    
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    const rememberInput = document.getElementById("login-remember");
    const rememberMe = rememberInput ? rememberInput.checked : false;
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;

    try {
      // Set persistence type before signing in
      await setPersistence(auth, persistenceType);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully:", userCredential.user.email);
    } catch (error) {
      console.error("Login failed:", error.code, error.message);
      let friendlyMessage = "Inloggen mislukt. Controleer je e-mail en wachtwoord.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        friendlyMessage = "Onjuist e-mailadres of wachtwoord.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMessage = "Dit is geen geldig e-mailadres.";
      }
      if (loginErrorMsg) {
        loginErrorMsg.textContent = friendlyMessage;
        loginErrorMsg.style.display = "block";
      }
    }
  });
}

// Fetch Valid Invite Code from Firestore
async function getValidInviteCode() {
  try {
    const inviteDocRef = doc(db, "config", "invite");
    const docSnap = await getDoc(inviteDocRef);
    if (docSnap.exists() && docSnap.data().code) {
      return docSnap.data().code.trim();
    }
  } catch (e) {
    console.warn("Could not load dynamic invite code from Firestore, using default:", e);
  }
  return DEFAULT_INVITE_CODE;
}

// Handle Account Registration
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (signupErrorMsg) signupErrorMsg.style.display = "none";

    if (!signupInviteInput || !signupNicknameInput || !signupRealnameInput || !signupEmailInput || !signupPasswordInput) return;

    const inviteCode = signupInviteInput.value.trim();
    const nickname = signupNicknameInput.value.trim();
    const realname = signupRealnameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;

    // 1. Validate Password Strength (Min 8 characters, as required by secureCoder guidelines)
    if (password.length < 8) {
      if (signupErrorMsg) {
        signupErrorMsg.textContent = "Wachtwoord moet minimaal 8 tekens lang zijn.";
        signupErrorMsg.style.display = "block";
      }
      return;
    }

    try {
      // 2. Validate Invite Code
      const validCode = await getValidInviteCode();
      if (inviteCode.toLowerCase() !== validCode.toLowerCase()) {
        if (signupErrorMsg) {
          signupErrorMsg.textContent = "Ongeldige uitnodigingscode. Vraag de lustrumcommissie om de juiste code.";
          signupErrorMsg.style.display = "block";
        }
        return;
      }

      // 3. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Update Auth Display Name
      await updateProfile(user, { displayName: nickname });

      // 5. Store Extended Profile in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        nickname: nickname,
        realname: realname,
        avatarUrl: "nobu logo.jpg", // default profile picture
        createdAt: new Date().toISOString()
      });

      console.log("Account created successfully with profile document:", user.email);
    } catch (error) {
      console.error("Signup failed:", error.code, error.message);
      let friendlyMessage = "Registreren mislukt. Probeer het opnieuw.";
      if (error.code === "auth/email-already-in-use") {
        friendlyMessage = "Dit e-mailadres is al in gebruik.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMessage = "Dit is geen geldig e-mailadres.";
      } else if (error.code === "auth/weak-password") {
        friendlyMessage = "Wachtwoord is te zwak. Gebruik minimaal 8 tekens.";
      }
      if (signupErrorMsg) {
        signupErrorMsg.textContent = friendlyMessage;
        signupErrorMsg.style.display = "block";
      }
    }
  });
}

// Update Profile Form Submission Handler
if (profileUpdateForm) {
  profileUpdateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (profileUpdateMsg) profileUpdateMsg.style.display = "none";
    
    if (!state.user || !profileNicknameInput || !profileRealnameInput) return;

    const nickname = profileNicknameInput.value.trim();
    const realname = profileRealnameInput.value.trim();

    if (state.user.uid === "demo_user") {
      state.profile.nickname = nickname;
      state.profile.realname = realname;
      sessionStorage.setItem("nobu_demo_profile", JSON.stringify(state.profile));
      
      if (profileUpdateMsg) {
        profileUpdateMsg.className = "";
        profileUpdateMsg.style.color = "var(--success)";
        profileUpdateMsg.textContent = "Gegevens succesvol bijgewerkt! (Lokaal opgeslagen)";
        profileUpdateMsg.style.display = "block";
      }

      // Refresh UI text indicators
      const nickTitle = document.getElementById("profile-nickname-title");
      if (nickTitle) nickTitle.textContent = nickname;
      const realTitle = document.getElementById("profile-realname-title");
      if (realTitle) realTitle.textContent = realname;
      return;
    }

    try {
      const userDocRef = doc(db, "users", state.user.uid);
      await updateDoc(userDocRef, {
        nickname: nickname,
        realname: realname
      });
      
      // Also update display name in Auth
      await updateProfile(auth.currentUser, { displayName: nickname });

      // Refresh global profile state
      await fetchUserProfile(state.user);

      if (profileUpdateMsg) {
        profileUpdateMsg.className = "";
        profileUpdateMsg.style.color = "var(--success)";
        profileUpdateMsg.textContent = "Gegevens succesvol bijgewerkt!";
        profileUpdateMsg.style.display = "block";
      }

      // Refresh UI text indicators
      const nickTitle = document.getElementById("profile-nickname-title");
      if (nickTitle) nickTitle.textContent = nickname;
      const realTitle = document.getElementById("profile-realname-title");
      if (realTitle) realTitle.textContent = realname;
    } catch (error) {
      console.error("Profile update failed:", error);
      if (profileUpdateMsg) {
        profileUpdateMsg.className = "";
        profileUpdateMsg.style.color = "var(--danger)";
        profileUpdateMsg.textContent = "Bijwerken mislukt. Probeer het offline later opnieuw.";
        profileUpdateMsg.style.display = "block";
      }
    }
  });
}

// Handle Profile Avatar Selection and Secure Upload
if (profileAvatarInput) {
  profileAvatarInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !state.user) return;

    // Validate File Size (Max 3MB for avatars, as required by secureCoder backend rules)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Profielfoto mag maximaal 3MB groot zijn.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Selecteer een geldig afbeeldingsbestand.");
      return;
    }

    if (state.user.uid === "demo_user") {
      const reader = new FileReader();
      reader.onload = (event) => {
        state.profile.avatarUrl = event.target.result;
        sessionStorage.setItem("nobu_demo_profile", JSON.stringify(state.profile));
        
        if (profileAvatarDisplay) profileAvatarDisplay.src = event.target.result;
        const avatarEl = document.getElementById("header-user-avatar");
        if (avatarEl) avatarEl.src = event.target.result;
        console.log("Mock avatar updated lokaal!");
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      console.log("Uploading avatar for user:", state.user.uid);
      
      // Secure filename naming convention: overwrite /avatars/uid directly (no user input in path)
      const avatarRef = ref(storage, `avatars/${state.user.uid}`);
      
      // Upload bytes
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Update profile in Firestore
      const userDocRef = doc(db, "users", state.user.uid);
      await updateDoc(userDocRef, { avatarUrl: downloadUrl });

      // Update global state and DOM views
      state.profile.avatarUrl = downloadUrl;
      if (profileAvatarDisplay) profileAvatarDisplay.src = downloadUrl;
      const avatarEl = document.getElementById("header-user-avatar");
      if (avatarEl) avatarEl.src = downloadUrl;
      
      console.log("Avatar uploaded and linked successfully:", downloadUrl);
    } catch (error) {
      console.error("Avatar upload failed:", error);
      alert("Uploaden mislukt. Controleer je internetverbinding.");
    }
  });
}

// Handle Logout - Invalidate cache & full reload (BFF security standard)
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      sessionStorage.removeItem("nobu_demo_bypass");
      sessionStorage.removeItem("nobu_demo_profile");
      
      if (auth.currentUser) {
        await signOut(auth);
      }
      console.log("Signed out successfully");
      
      // Trigger full page reload to clear state and security tokens completely
      window.location.href = "./index.html#auth";
      window.location.reload();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  });
}

// Initialize Profile Tab Fields
export function initProfileView() {
  if (!state.user || !state.profile) return;

  if (profileNicknameInput) profileNicknameInput.value = state.profile.nickname || "";
  if (profileRealnameInput) profileRealnameInput.value = state.profile.realname || "";
  if (profileAvatarDisplay) profileAvatarDisplay.src = state.profile.avatarUrl || "nobu logo.jpg";
  
  const nickTitle = document.getElementById("profile-nickname-title");
  if (nickTitle) nickTitle.textContent = state.profile.nickname || "Lustrumganger";
  
  const realTitle = document.getElementById("profile-realname-title");
  if (realTitle) realTitle.textContent = state.profile.realname || "";
  
  if (profileUpdateMsg) profileUpdateMsg.style.display = "none";
}
