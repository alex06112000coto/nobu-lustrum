import { auth, db, storage } from "./firebase-config.js?v=19";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global Application State
export const state = {
  user: null,         // Firebase Auth User object
  profile: null,      // User metadata document (nickname, realname, avatar)
  activeTab: "feed"   // Currently selected SPA route
};


// Check if demo/preview bypass session is already active
if (sessionStorage.getItem("nobu_demo_bypass") === "true") {
  state.user = { 
    uid: "demo_user", 
    email: "demo@nobulustrum.nl" 
  };
  
  const cachedProfile = sessionStorage.getItem("nobu_demo_profile");
  if (cachedProfile) {
    try {
      state.profile = JSON.parse(cachedProfile);
    } catch (e) {
      state.profile = null;
    }
  }
  
  if (!state.profile) {
    state.profile = {
      uid: "demo_user",
      nickname: "Lustrum Gast",
      realname: "Gast (Offline Preview)",
      avatarUrl: "nobu logo.jpg"
    };
  }
  
  // Set avatar src early
  window.addEventListener("DOMContentLoaded", () => {
    const avatarEl = document.getElementById("header-user-avatar");
    if (avatarEl) avatarEl.src = state.profile.avatarUrl;
  });
}

// Route-to-Module Mapping (Using ?v=17 cache busters to completely bypass browser caching)
const routes = {
  "auth": async () => {
    await import("./auth.js?v=17");
  },
  "feed": async () => {
    const module = await import("./feed.js?v=17");
    module.init();
  },
  "likely": async () => {
    const module = await import("./likely.js?v=17");
    module.init();
  },
  "cocktails": async () => {
    const module = await import("./cocktails.js?v=17");
    module.init();
  },
  "wheel": async () => {
    const module = await import("./wheel.js?v=17");
    module.init();
  },
  "program": async () => {
    const module = await import("./program.js?v=17");
    const infoModule = await import("./info.js?v=17");
    module.init();
    infoModule.init();
  },
  "profile": async () => {
    const module = await import("./auth.js?v=17");
    module.initProfileView();
  }
};

// Initialize Application Routing
function initRouter() {
  const handleRouting = () => {
    let hash = window.location.hash.replace("#", "");
    
    // Redirect logic based on auth status
    if (!state.user) {
      hash = "auth";
    } else if (hash === "auth" || !hash) {
      hash = "feed";
    }
    
    navigateToTab(hash);
  };

  window.addEventListener("hashchange", handleRouting);
  
  // Set up click handlers on bottom navigation tabs
  const navItems = document.querySelectorAll("#main-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      if (state.user) {
        window.location.hash = `#${tab}`;
      }
    });
  });

  // Logo click triggers Home (Feed)
  document.querySelector(".header-logo-container").addEventListener("click", () => {
    if (state.user) window.location.hash = "#feed";
  });

  // Profile icon badge triggers Profile tab
  document.getElementById("header-profile-btn").addEventListener("click", () => {
    if (state.user) window.location.hash = "#profile";
  });

  // First routing run
  handleRouting();
}

// Navigate to a specific SPA Tab
export function navigateToTab(tabName) {
  state.activeTab = tabName;

  // Toggle visible elements based on tab
  const mainHeader = document.getElementById("main-header");
  const mainNav = document.getElementById("main-nav");
  const addPhotoFab = document.getElementById("add-photo-fab");

  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  if (tabName === "auth") {
    mainHeader.style.display = "none";
    mainNav.style.display = "none";
    addPhotoFab.style.display = "none";
    document.body.classList.add("nav-hidden");
    if (themeToggleBtn) {
      themeToggleBtn.style.display = "flex";
    }
  } else {
    mainHeader.style.display = "flex";
    mainNav.style.display = "flex";
    document.body.classList.remove("nav-hidden");
    
    // FAB only visible on the feed tab
    addPhotoFab.style.display = (tabName === "feed") ? "flex" : "none";
    if (themeToggleBtn) {
      themeToggleBtn.style.display = "flex";
    }
  }

  // Update navigation items active class
  const navItems = document.querySelectorAll("#main-nav .nav-item");
  navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update active view visibility
  const views = document.querySelectorAll(".view-section");
  views.forEach(view => {
    if (view.getAttribute("id") === `view-${tabName}`) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });

  // Execute route initialization code dynamically
  if (routes[tabName]) {
    routes[tabName]().catch(err => {
      console.error(`Failed to load view module for tab: ${tabName}`, err);
    });
  }
}

// Fetch Logged-In User Profile Document from Firestore
export async function fetchUserProfile(firebaseUser) {
  const uid = firebaseUser.uid;
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      state.profile = userDocSnap.data();
      
      // Update header avatar profile indicator
      const avatarUrl = state.profile.avatarUrl || "nobu logo.jpg";
      document.getElementById("header-user-avatar").src = avatarUrl;
      return state.profile;
    }
  } catch (e) {
    console.warn("Failed to fetch user profile, using local fallbacks:", e);
  }
  
  // Local default fallback if Firestore document does not exist yet (or is being created)
  state.profile = {
    nickname: firebaseUser.displayName || "Lustrumganger",
    realname: firebaseUser.email,
    avatarUrl: "nobu logo.jpg"
  };
  document.getElementById("header-user-avatar").src = "nobu logo.jpg";
  return state.profile;
}

// Observe Firebase Authentication State Changes
onAuthStateChanged(auth, async (firebaseUser) => {
  console.log("[Auth State Change] User is:", firebaseUser ? firebaseUser.email : "Logged Out");
  
  if (sessionStorage.getItem("nobu_demo_bypass") === "true") {
    console.log("[Auth State Change] Demo bypass active. Keeping mock user state.");
    const hash = window.location.hash.replace("#", "") || "feed";
    if (hash === "auth") {
      window.location.hash = "#feed";
    } else if (routes[hash]) {
      routes[hash]().catch(err => console.error(err));
    }
    return;
  }
  
  if (firebaseUser) {
    state.user = firebaseUser;
    
    // Load profile document safely using the active firebaseUser object
    await fetchUserProfile(firebaseUser);
    
    // Redirect away from login to feed
    if (window.location.hash.replace("#", "") === "auth" || !window.location.hash) {
      window.location.hash = "#feed";
    } else {
      // If we are already on a non-auth hash (e.g. #feed), we must transition the active view
      // because changing the hash to the same value won't fire hashchange, leaving the UI stuck on login!
      const hash = window.location.hash.replace("#", "");
      navigateToTab(hash);
    }
  } else {
    state.user = null;
    state.profile = null;
    window.location.hash = "#auth";
  }
});

// Expose state and functions globally to resolve circular dependencies in auth.js
window.__NOBU_APP__ = {
  state,
  fetchUserProfile
};

// Start Router
initRouter();

// Theme Switcher Logic (Light & Dark Theme)
function initTheme() {
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");

  function setTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      localStorage.setItem("nobu_theme", "dark");
      if (themeIcon) {
        themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"/>`;
      }
      const themeLabel = document.getElementById("theme-toggle-label");
      if (themeLabel) themeLabel.textContent = "licht modus";
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("nobu_theme", "light");
      if (themeIcon) {
        themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`;
      }
      const themeLabel = document.getElementById("theme-toggle-label");
      if (themeLabel) themeLabel.textContent = "donker modus";
    }
  }

  // Check saved theme or default to light
  const savedTheme = localStorage.getItem("nobu_theme") || "light";
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-theme");
      setTheme(isDark ? "light" : "dark");
    });
  }
}

initTheme();
