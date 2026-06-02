import { auth, db } from "./firebase-config.js?v=19";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  getDocs,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Retrieve the unified global state from window to completely prevent module duplication and circular dependencies
const state = window.__NOBU_APP__.state;

// DOM References
const likelyDateDisplay = document.getElementById("likely-date-display");
const likelyQuestionDisplay = document.getElementById("likely-question-display");

const likelyVoteBox = document.getElementById("likely-vote-box");
const likelyOptionsList = document.getElementById("likely-options-list");
const likelySubmitVoteBtn = document.getElementById("likely-submit-vote-btn");

const likelyResultsBox = document.getElementById("likely-results-box");
const likelyResultsSubtitle = document.getElementById("likely-results-subtitle");
const likelyResultsList = document.getElementById("likely-results-list");

const likelyCommentsList = document.getElementById("likely-comments-list");
const likelyCommentInputContainer = document.getElementById("likely-comment-input-container");
const likelyMyCommentInput = document.getElementById("likely-my-comment-input");
const likelySubmitCommentBtn = document.getElementById("likely-submit-comment-btn");

const likelyLockoutMsg = document.getElementById("likely-lockout-msg");

let unsubscribeVotes = null;
let currentSelectedUid = null;
let registeredUsersList = []; // Holds array of all { uid, nickname, realname, avatarUrl }
let hasVotedToday = false;
let isPastDeadline = false; // Closed past 18:00

// Format Date Key as YYYY-MM-DD based on local time
function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if the current time is past 18:00 (6:00 PM) local time
function checkIfPast18() {
  const now = new Date();
  return now.getHours() >= 18;
}

// Fetch Today's daily stelling based on the YYYY-MM-DD key
async function fetchTodayStelling(dateKey) {
  try {
    const response = await fetch("Who_Is_Most_Likely_To.json");
    if (!response.ok) throw new Error("Network response not ok");
    const questions = await response.json();
    
    // Find matching date entry
    const entry = questions.find(q => q.date === dateKey);
    if (entry) {
      likelyDateDisplay.textContent = entry.dateStr;
      likelyQuestionDisplay.textContent = entry.question;
      return entry;
    }
  } catch (e) {
    console.warn("Failed to load questions database JSON, using default stelling:", e);
  }
  
  // Default stelling if database fails or boundary exceeded
  likelyDateDisplay.textContent = new Date().toLocaleDateString("nl-NL", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  likelyQuestionDisplay.textContent = "Wie is het meest waarschijnlijk om na de vakantie alweer direct plannen te maken voor de volgende reis?";
  return null;
}

// Fetch all registered users to populate option buttons
async function fetchRegisteredUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    registeredUsersList = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      registeredUsersList.push({
        uid: data.uid,
        nickname: data.nickname || "Lustrumganger",
        realname: data.realname || "",
        avatarUrl: data.avatarUrl || "nobu logo.jpg"
      });
    });
    
    // Sort alphabetically by nickname
    registeredUsersList.sort((a, b) => a.nickname.localeCompare(b.nickname));
  } catch (e) {
    console.warn("Failed to load users collection:", e);
    // User requested that the list starts empty by default
    registeredUsersList = [];

    if (state.user && state.user.uid === "demo_user") {
      registeredUsersList.push({
        uid: "demo_user",
        nickname: state.profile.nickname || "Lustrum Gast",
        realname: state.profile.realname || "Gast (Offline Preview)",
        avatarUrl: state.profile.avatarUrl || "nobu logo.jpg"
      });
    }
  }
}

// Render dynamic option list
function renderVoteOptions() {
  likelyOptionsList.replaceChildren();
  currentSelectedUid = null;
  likelySubmitVoteBtn.disabled = true;

  registeredUsersList.forEach(user => {
    const btn = document.createElement("button");
    btn.className = "likely-option-btn";
    
    // Option content (Avatar + Nickname + Realname)
    btn.innerHTML = `
      <div class="option-voter-info">
        <img class="option-voter-avatar" src="${user.avatarUrl}" alt="Avatar">
        <div style="text-align: left;">
          <div style="font-weight:600; font-size:0.95rem;">${user.nickname}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${user.realname}</div>
        </div>
      </div>
      <div class="option-vote-indicator"></div>
    `;

    btn.addEventListener("click", () => {
      // Toggle selected class
      document.querySelectorAll(".likely-option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      currentSelectedUid = user.uid;
      likelySubmitVoteBtn.disabled = false;
    });

    likelyOptionsList.appendChild(btn);
  });
}

// Tally votes and render results ranking leaderboard
function renderResults(votes = {}) {
  likelyResultsList.replaceChildren();

  // 1. Tally votes for each user
  const voteTallies = {};
  registeredUsersList.forEach(u => {
    voteTallies[u.uid] = 0;
  });

  let totalVotes = 0;
  Object.values(votes).forEach(votedUid => {
    if (voteTallies.hasOwnProperty(votedUid)) {
      voteTallies[votedUid]++;
      totalVotes++;
    }
  });

  // 2. Build ranked user array
  const rankedResults = registeredUsersList.map(user => {
    const count = voteTallies[user.uid] || 0;
    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
    return {
      user: user,
      count: count,
      percentage: percentage
    };
  });

  // 3. Sort by vote count descending
  rankedResults.sort((a, b) => b.count - a.count);

  // 4. Render results progress bars
  rankedResults.forEach(r => {
    const barRow = document.createElement("div");
    barRow.className = "result-bar-row";

    const labels = document.createElement("div");
    labels.className = "result-bar-labels";
    labels.innerHTML = `
      <span style="font-weight:600;">${r.user.nickname} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">(${r.user.realname})</span></span>
      <span style="color:var(--primary); font-weight:600;">${r.count} stem(men) (${Math.round(r.percentage)}%)</span>
    `;
    barRow.appendChild(labels);

    const barBg = document.createElement("div");
    barBg.className = "result-bar-bg";
    
    const barFill = document.createElement("div");
    barFill.className = "result-bar-fill";
    // Inline width sets animation transition trigger
    barFill.style.width = "0%";
    barBg.appendChild(barFill);
    barRow.appendChild(barBg);
    
    likelyResultsList.appendChild(barRow);
    
    // Tiny delay to trigger CSS transition animation on draw
    setTimeout(() => {
      barFill.style.width = `${r.percentage}%`;
    }, 100);
  });
}

// Render the comments board
function renderComments(comments = []) {
  likelyCommentsList.replaceChildren();
  
  if (comments.length === 0) {
    const noComments = document.createElement("div");
    noComments.style.textAlign = "center";
    noComments.style.color = "var(--text-muted)";
    noComments.style.fontSize = "0.85rem";
    noComments.style.padding = "10px";
    noComments.textContent = "Er zijn nog geen reacties geplaatst.";
    likelyCommentsList.appendChild(noComments);
    return;
  }

  comments.forEach(c => {
    const commentDiv = document.createElement("div");
    commentDiv.className = "comment-item";

    const author = document.createElement("span");
    author.className = "comment-author";
    author.textContent = c.nickname;
    commentDiv.appendChild(author);

    const text = document.createElement("span");
    text.className = "comment-text";
    text.textContent = c.text;
    commentDiv.appendChild(text);

    likelyCommentsList.appendChild(commentDiv);
  });
}

// Real-time listener for today's votes document
function bindLiveVotes(dateKey) {
  if (unsubscribeVotes) {
    unsubscribeVotes();
    unsubscribeVotes = null;
  }

  if (state.user && state.user.uid === "demo_user") {
    console.log("Daily Game: Running in Demo Mode (Local Storage)");
    
    const defaultMockVotes = {
      votes: {
        "fallback_0": "fallback_1",
        "fallback_1": "fallback_2",
        "fallback_2": "fallback_1",
        "fallback_3": "fallback_1"
      },
      comments: [
        { nickname: "Eline", text: "Dit is sowieso Farah haha! 😂" },
        { nickname: "Lola", text: "100% mee eens!" }
      ]
    };

    const storageKey = `nobu_mock_likely_votes_${dateKey}`;
    let mockData = JSON.parse(localStorage.getItem(storageKey));
    if (!mockData) {
      mockData = defaultMockVotes;
      localStorage.setItem(storageKey, JSON.stringify(mockData));
    }

    const votes = mockData.votes || {};
    const comments = mockData.comments || [];

    hasVotedToday = votes.hasOwnProperty(state.user.uid);
    isPastDeadline = checkIfPast18();

    if (hasVotedToday || isPastDeadline) {
      likelyVoteBox.style.display = "none";
      likelyResultsBox.style.display = "block";
      
      if (isPastDeadline) {
        likelyResultsSubtitle.textContent = "Stemming is gesloten (sluiting om 18:00). Hier zijn de eindresultaten!";
        likelyResultsSubtitle.style.color = "var(--accent)";
      } else {
        likelyResultsSubtitle.textContent = "Bedankt voor het stemmen! Hier is de live tussenstand:";
        likelyResultsSubtitle.style.color = "var(--success)";
      }

      renderResults(votes);
      renderComments(comments);

      const myComment = comments.find(c => c.uid === state.user.uid);
      if (myComment || isPastDeadline) {
        likelyCommentInputContainer.style.display = "none";
      } else {
        likelyCommentInputContainer.style.display = "flex";
      }
    } else {
      likelyVoteBox.style.display = "block";
      likelyResultsBox.style.display = "none";
      renderVoteOptions();
    }
    return;
  }

  const voteDocRef = doc(db, "likely_votes", dateKey);
  
  unsubscribeVotes = onSnapshot(voteDocRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : { votes: {}, comments: [] };
    const votes = data.votes || {};
    const comments = data.comments || [];

    // Check if current user has already voted today
    hasVotedToday = state.user && votes.hasOwnProperty(state.user.uid);
    isPastDeadline = checkIfPast18();

    // 1. Lock screen logic (voted OR past 18:00 reveals results)
    if (hasVotedToday || isPastDeadline) {
      likelyVoteBox.style.display = "none";
      likelyResultsBox.style.display = "block";
      
      if (isPastDeadline) {
        likelyResultsSubtitle.textContent = "Stemming is gesloten (sluiting om 18:00). Hier zijn de eindresultaten!";
        likelyResultsSubtitle.style.color = "var(--accent)";
      } else {
        likelyResultsSubtitle.textContent = "Bedankt voor het stemmen! Hier is de live tussenstand:";
        likelyResultsSubtitle.style.color = "var(--success)";
      }

      // Render results leaderboard and comments board
      renderResults(votes);
      renderComments(comments);

      // 2. Comments input lock (only let users comment once, if they have voted)
      const myComment = comments.find(c => c.uid === state.user.uid);
      if (myComment || isPastDeadline) {
        likelyCommentInputContainer.style.display = "none"; // Hide comment bar if already commented or closed
      } else {
        likelyCommentInputContainer.style.display = "flex";
      }
    } else {
      // User has not voted yet and deadline is open: show ballot box
      likelyVoteBox.style.display = "block";
      likelyResultsBox.style.display = "none";
      
      renderVoteOptions();
    }
  }, (error) => {
    console.error("Failed to sync live votes:", error);
  });
}

// Handle Vote submission
async function castVote(dateKey) {
  if (!state.user || !currentSelectedUid) return;

  if (state.user.uid === "demo_user") {
    const storageKey = `nobu_mock_likely_votes_${dateKey}`;
    let mockData = JSON.parse(localStorage.getItem(storageKey)) || { votes: {}, comments: [] };
    mockData.votes[state.user.uid] = currentSelectedUid;
    localStorage.setItem(storageKey, JSON.stringify(mockData));
    
    console.log("Vote cast successfully locally!");
    bindLiveVotes(dateKey); // refresh UI locally
    return;
  }

  const voteDocRef = doc(db, "likely_votes", dateKey);
  
  // Prepare voting structure
  const updateData = {
    [`votes.${state.user.uid}`]: currentSelectedUid
  };

  try {
    // Attempt merge set in Firestore (or updates if exists)
    await setDoc(voteDocRef, {
      votes: {
        [state.user.uid]: currentSelectedUid
      }
    }, { merge: true });
    
    console.log("Vote cast successfully for candidate:", currentSelectedUid);
  } catch (e) {
    console.error("Failed to write vote to Firestore:", e);
    alert("Stemmen mislukt. Controleer je verbinding.");
  }
}

// Handle Comment submission (1-comment limit enforced)
async function postComment(dateKey, commentText) {
  if (!state.user || !state.profile || !commentText) return;

  if (state.user.uid === "demo_user") {
    const storageKey = `nobu_mock_likely_votes_${dateKey}`;
    let mockData = JSON.parse(localStorage.getItem(storageKey)) || { votes: {}, comments: [] };
    
    const existing = (mockData.comments || []).find(c => c.uid === state.user.uid);
    if (existing) {
      alert("Je hebt al gereageerd op deze stelling!");
      return;
    }
    
    mockData.comments.push({
      uid: state.user.uid,
      nickname: state.profile.nickname || "Lustrum Gast",
      text: commentText,
      createdAt: new Date().toISOString()
    });
    
    localStorage.setItem(storageKey, JSON.stringify(mockData));
    likelyMyCommentInput.value = "";
    console.log("Daily comment posted successfully locally!");
    bindLiveVotes(dateKey); // refresh UI locally
    return;
  }

  const voteDocRef = doc(db, "likely_votes", dateKey);
  
  const commentObj = {
    uid: state.user.uid,
    nickname: state.profile.nickname || "Lustrumganger",
    text: commentText,
    createdAt: new Date().toISOString()
  };

  try {
    // Validate again that user has not commented yet by fetching fresh snapshot
    const docSnap = await getDoc(voteDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const existing = (data.comments || []).find(c => c.uid === state.user.uid);
      if (existing) {
        alert("Je hebt al gereageerd op deze stelling!");
        return;
      }
    }

    // Atomic update to add the comment object
    await updateDoc(voteDocRef, {
      comments: arrayUnion(commentObj)
    });
    
    likelyMyCommentInput.value = "";
    console.log("Daily comment posted successfully!");
  } catch (e) {
    console.error("Failed to post daily comment:", e);
  }
}

// Main Module Entry
export async function init() {
  console.log("Initializing daily stelling game...");

  const dateKey = getLocalDateKey();
  
  // 1. Fetch stelling and display
  await fetchTodayStelling(dateKey);

  // 2. Check login state
  if (!state.user) {
    likelyLockoutMsg.style.display = "block";
    likelyVoteBox.style.display = "none";
    likelyResultsBox.style.display = "none";
    return;
  }
  likelyLockoutMsg.style.display = "none";

  // 3. Load user list and establish real-time updates
  await fetchRegisteredUsers();
  bindLiveVotes(dateKey);

  // 4. Set up action button listeners (once)
  likelySubmitVoteBtn.onclick = () => {
    castVote(dateKey);
  };

  likelySubmitCommentBtn.onclick = () => {
    const text = likelyMyCommentInput.value.trim();
    if (text) {
      postComment(dateKey, text);
    }
  };

  likelyMyCommentInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      const text = likelyMyCommentInput.value.trim();
      if (text) postComment(dateKey, text);
    }
  };
}
