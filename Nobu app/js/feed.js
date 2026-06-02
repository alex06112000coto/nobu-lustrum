import { auth, db, storage } from "./firebase-config.js?v=19";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
// Retrieve the unified global state from window to completely prevent module duplication and circular dependencies
const state = window.__NOBU_APP__.state;

// DOM References
const feedItemsContainer = document.getElementById("feed-items-container");
const addPhotoFab = document.getElementById("add-photo-fab");
const uploadModalOverlay = document.getElementById("upload-modal-overlay");
const closeUploadModalBtn = document.getElementById("close-upload-modal-btn");
const cancelUploadBtn = document.getElementById("cancel-upload-btn");
const photoUploadForm = document.getElementById("photo-upload-form");
const uploadPreviewContainer = document.getElementById("upload-preview-container");
const uploadPrompt = document.getElementById("upload-prompt");
const uploadPreviewImage = document.getElementById("upload-preview-image");
const feedPhotoFileInput = document.getElementById("feed-photo-file-input");
const feedPhotoCaption = document.getElementById("feed-photo-caption");
const submitUploadBtn = document.getElementById("submit-upload-btn");
const uploadProgressContainer = document.getElementById("upload-progress-container");
const uploadProgressBar = document.getElementById("upload-progress-bar");
const uploadProgressText = document.getElementById("upload-progress-text");
const uploadErrorMsg = document.getElementById("upload-error-msg");

let unsubscribeFeed = null;
let activeUploadTask = null;

// Initialize Feed module (listening to real-time Firestore updates)
export function init() {
  console.log("Initializing shared photo feed module...");
  
  if (unsubscribeFeed) {
    unsubscribeFeed();
    unsubscribeFeed = null;
  }

  if (state.user && state.user.uid === "demo_user") {
    console.log("Feed: Running in Demo Mode (Local Storage)");
    feedItemsContainer.innerHTML = "";
    
    const fallbackMockFeed = [];

    let mockFeed = JSON.parse(localStorage.getItem("nobu_mock_feed"));
    if (mockFeed) {
      // Clear out the previous hardcoded mock posts to give a clean empty feed
      mockFeed = mockFeed.filter(post => post.id !== "mock_post_1" && post.id !== "mock_post_2");
      localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
    } else {
      mockFeed = fallbackMockFeed;
      localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
    }
    
    if (mockFeed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.textAlign = "center";
      emptyDiv.style.padding = "40px";
      emptyDiv.style.color = "var(--text-muted)";
      emptyDiv.textContent = "Nog geen foto's geüpload. Wees de eerste die een herinnering deelt!";
      feedItemsContainer.appendChild(emptyDiv);
      return;
    }

    mockFeed.forEach((photoData) => {
      const feedItem = renderFeedCard(photoData.id, photoData);
      feedItemsContainer.appendChild(feedItem);
    });
    return;
  }

  // Set up real-time listener for photos ordered by creation date descending
  const feedQuery = query(collection(db, "photos"), orderBy("createdAt", "desc"));
  
  unsubscribeFeed = onSnapshot(feedQuery, (snapshot) => {
    feedItemsContainer.innerHTML = "";
    
    if (snapshot.empty) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.textAlign = "center";
      emptyDiv.style.padding = "40px";
      emptyDiv.style.color = "var(--text-muted)";
      emptyDiv.textContent = "Nog geen foto's geüpload. Wees de eerste die een herinnering deelt!";
      feedItemsContainer.appendChild(emptyDiv);
      return;
    }

    snapshot.forEach((docSnap) => {
      const photoId = docSnap.id;
      const photoData = docSnap.data();
      
      const feedItem = renderFeedCard(photoId, photoData);
      feedItemsContainer.appendChild(feedItem);
    });
  }, (error) => {
    console.error("Failed to fetch feed updates in real-time:", error);
    feedItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--danger);">
        Fout bij het laden van de feed. Controleer je internetverbinding.
      </div>
    `;
  });
}

// Safely generate HTML to display a single photo post card (XSS prevention)
function renderFeedCard(id, data) {
  const card = document.createElement("div");
  card.className = "feed-item";

  // User avatar URL or default
  const avatarUrl = data.avatarUrl || "nobu logo.jpg";
  const nickname = data.nickname || "Lustrumganger";
  const realname = data.realname || "";
  const likesCount = data.likes ? data.likes.length : 0;
  const isLiked = state.user && data.likes && data.likes.includes(state.user.uid);

  // Format Date String nicely
  let dateText = "";
  if (data.createdAt) {
    try {
      const date = new Date(data.createdAt);
      dateText = date.toLocaleDateString("nl-NL", { 
        day: "numeric", 
        month: "short", 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch (e) {
      dateText = "";
    }
  }

  // 1. User Bar Row
  const userBar = document.createElement("div");
  userBar.className = "feed-user-bar";
  
  const userInfo = document.createElement("div");
  userInfo.className = "feed-user-info";
  
  const avatar = document.createElement("img");
  avatar.className = "feed-avatar";
  avatar.src = avatarUrl;
  avatar.alt = `${nickname}'s avatar`;
  userInfo.appendChild(avatar);

  const usernames = document.createElement("div");
  usernames.className = "feed-usernames";
  
  const nicknameSpan = document.createElement("span");
  nicknameSpan.className = "feed-nickname";
  nicknameSpan.textContent = nickname;
  usernames.appendChild(nicknameSpan);

  if (realname) {
    const realnameSpan = document.createElement("span");
    realnameSpan.className = "feed-realname";
    realnameSpan.textContent = realname;
    usernames.appendChild(realnameSpan);
  }
  
  userInfo.appendChild(usernames);
  userBar.appendChild(userInfo);

  const rightContainer = document.createElement("div");
  rightContainer.className = "feed-user-bar-right";

  const timestamp = document.createElement("span");
  timestamp.className = "feed-timestamp";
  timestamp.textContent = dateText;
  rightContainer.appendChild(timestamp);

  // If current user is the owner of the photo
  if (state.user && state.user.uid === data.uid) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "feed-delete-btn";
    deleteBtn.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    `;
    deleteBtn.title = "Foto verwijderen";
    deleteBtn.addEventListener("click", () => handleDeletePhoto(id, data.photoUrl));
    rightContainer.appendChild(deleteBtn);
  }

  userBar.appendChild(rightContainer);
  card.appendChild(userBar);

  // 2. Main Post Photo Container
  const imgContainer = document.createElement("div");
  imgContainer.className = "feed-image-container";
  
  const img = document.createElement("img");
  img.className = "feed-image";
  img.src = data.photoUrl;
  img.loading = "lazy";
  img.alt = "Feed Foto";
  imgContainer.appendChild(img);
  card.appendChild(imgContainer);

  // 3. Action Row (Likes count and toggle btn)
  const actionBar = document.createElement("div");
  actionBar.className = "feed-action-bar";

  const likeBtn = document.createElement("button");
  likeBtn.className = `feed-action-btn ${isLiked ? 'liked' : ''}`;
  // SVG Heart
  likeBtn.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
    <span class="likes-count">${likesCount}</span>
  `;
  
  likeBtn.addEventListener("click", () => handleLikeToggle(id, data.likes));
  actionBar.appendChild(likeBtn);

  const commentIconBtn = document.createElement("div");
  commentIconBtn.className = "feed-action-btn";
  // SVG Message Bubble
  commentIconBtn.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    <span>${data.comments ? data.comments.length : 0}</span>
  `;
  actionBar.appendChild(commentIconBtn);
  card.appendChild(actionBar);

  // 4. Description Caption Box
  if (data.caption) {
    const captionBox = document.createElement("div");
    captionBox.className = "feed-caption-box";
    
    const captionAuthor = document.createElement("span");
    captionAuthor.className = "comment-author";
    captionAuthor.textContent = nickname;
    captionBox.appendChild(captionAuthor);

    const captionText = document.createElement("span");
    captionText.className = "comment-text";
    captionText.textContent = data.caption;
    captionBox.appendChild(captionText);
    
    card.appendChild(captionBox);
  }

  // 5. Comments Box
  const commentsBox = document.createElement("div");
  commentsBox.className = "feed-comments-box";

  const commentsPreview = document.createElement("div");
  commentsPreview.className = "feed-comments-preview";

  if (data.comments && data.comments.length > 0) {
    data.comments.forEach((c) => {
      const commentDiv = document.createElement("div");
      commentDiv.className = "comment-item";

      const authorSpan = document.createElement("span");
      authorSpan.className = "comment-author";
      authorSpan.textContent = c.nickname || "Lustrumganger";
      commentDiv.appendChild(authorSpan);

      const textSpan = document.createElement("span");
      textSpan.className = "comment-text";
      textSpan.textContent = c.text;
      commentDiv.appendChild(textSpan);

      commentsPreview.appendChild(commentDiv);
    });
  }
  commentsBox.appendChild(commentsPreview);

  // 6. Comment Form Input Row
  const inputRow = document.createElement("div");
  inputRow.className = "feed-comment-input-row";

  const commentInput = document.createElement("input");
  commentInput.className = "feed-comment-input";
  commentInput.type = "text";
  commentInput.placeholder = "Plaats een reactie...";
  inputRow.appendChild(commentInput);

  const commentSendBtn = document.createElement("button");
  commentSendBtn.className = "btn-primary";
  commentSendBtn.style.padding = "8px 14px";
  commentSendBtn.style.borderRadius = "20px";
  commentSendBtn.style.fontSize = "0.75rem";
  commentSendBtn.textContent = "Reageer";
  
  const submitComment = () => {
    const text = commentInput.value.trim();
    if (!text) return;
    handleCommentSubmit(id, text);
    commentInput.value = "";
  };

  commentSendBtn.addEventListener("click", submitComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      submitComment();
    }
  });

  inputRow.appendChild(commentSendBtn);
  commentsBox.appendChild(inputRow);
  card.appendChild(commentsBox);

  return card;
}

// Atomic like toggler
async function handleLikeToggle(photoId, likesArray = []) {
  if (!state.user) return;
  
  if (state.user.uid === "demo_user") {
    let mockFeed = JSON.parse(localStorage.getItem("nobu_mock_feed")) || [];
    const item = mockFeed.find(f => f.id === photoId);
    if (item) {
      if (!item.likes) item.likes = [];
      const idx = item.likes.indexOf("demo_user");
      if (idx > -1) {
        item.likes.splice(idx, 1);
      } else {
        item.likes.push("demo_user");
      }
      localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
      init(); // Re-render feed locally
    }
    return;
  }
  
  const photoDocRef = doc(db, "photos", photoId);
  const userLiked = likesArray.includes(state.user.uid);

  try {
    if (userLiked) {
      await updateDoc(photoDocRef, {
        likes: arrayRemove(state.user.uid)
      });
    } else {
      await updateDoc(photoDocRef, {
        likes: arrayUnion(state.user.uid)
      });
    }
  } catch (error) {
    console.error("Failed to toggle like:", error);
  }
}

// Atomic comment submitter
async function handleCommentSubmit(photoId, text) {
  if (!state.user || !state.profile) return;

  if (state.user.uid === "demo_user") {
    let mockFeed = JSON.parse(localStorage.getItem("nobu_mock_feed")) || [];
    const item = mockFeed.find(f => f.id === photoId);
    if (item) {
      if (!item.comments) item.comments = [];
      item.comments.push({
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        uid: state.user.uid,
        nickname: state.profile.nickname || "Lustrum Gast",
        text: text,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
      init(); // Re-render feed locally
    }
    return;
  }

  const photoDocRef = doc(db, "photos", photoId);
  const commentObj = {
    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
    uid: state.user.uid,
    nickname: state.profile.nickname || "Lustrumganger",
    text: text,
    createdAt: new Date().toISOString()
  };

  try {
    await updateDoc(photoDocRef, {
      comments: arrayUnion(commentObj)
    });
  } catch (error) {
    console.error("Failed to submit comment:", error);
  }
}

// Delete Photo Post (both from Storage and Firestore, or Local Storage in demo mode)
async function handleDeletePhoto(photoId, photoUrl) {
  if (!confirm("Weet je zeker dat je deze foto wilt verwijderen?")) {
    return;
  }

  if (state.user && state.user.uid === "demo_user") {
    try {
      let mockFeed = JSON.parse(localStorage.getItem("nobu_mock_feed")) || [];
      mockFeed = mockFeed.filter(post => post.id !== photoId);
      localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
      console.log("Mock photo deleted locally!");
      init(); // Re-render feed locally
    } catch (e) {
      console.error("Failed to delete mock photo:", e);
    }
    return;
  }

  try {
    console.log("Deleting photo from Firestore and Storage:", photoId);

    // 1. Delete document from Firestore
    const photoDocRef = doc(db, "photos", photoId);
    await deleteDoc(photoDocRef);
    console.log("Firestore entry deleted successfully!");

    // 2. Delete file from Storage if it exists and is a valid URL
    if (photoUrl && photoUrl.includes("firebasestorage.googleapis.com")) {
      try {
        const storageRef = ref(storage, photoUrl);
        await deleteObject(storageRef);
        console.log("Storage file deleted successfully!");
      } catch (err) {
        console.warn("Storage deletion warning or skipped:", err);
      }
    }
  } catch (error) {
    console.error("Failed to delete photo post:", error);
    alert(`Verwijderen mislukt: ${error.message || error}`);
  }
}

// Upload Modal Controller Actions
addPhotoFab.addEventListener("click", () => {
  if (!state.user) {
    alert("Je moet ingelogd zijn om foto's te uploaden.");
    return;
  }
  
  // Reset form views
  uploadPreviewImage.style.display = "none";
  uploadPrompt.style.display = "flex";
  feedPhotoFileInput.value = "";
  feedPhotoCaption.value = "";
  submitUploadBtn.disabled = true;
  uploadProgressContainer.style.display = "none";
  uploadProgressBar.style.width = "0%";
  uploadProgressText.textContent = "0% geüpload...";
  uploadErrorMsg.style.display = "none";
  
  uploadModalOverlay.classList.add("active");
});

const hideModal = () => {
  if (activeUploadTask) {
    if (confirm("Weet je zeker dat je het uploaden wilt annuleren?")) {
      activeUploadTask = null;
    } else {
      return;
    }
  }
  uploadModalOverlay.classList.remove("active");
};

closeUploadModalBtn.addEventListener("click", hideModal);
cancelUploadBtn.addEventListener("click", hideModal);

// Trigger file selection when clicking preview card
uploadPreviewContainer.addEventListener("click", () => {
  feedPhotoFileInput.click();
});

// Render Image Preview on selection
feedPhotoFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Max size check: 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert("Geselecteerde foto is te groot. Selecteer een foto van maximaal 5MB.");
    feedPhotoFileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    uploadPreviewImage.src = event.target.result;
    uploadPreviewImage.style.display = "block";
    uploadPrompt.style.display = "none";
    submitUploadBtn.disabled = false;
  };
  reader.readAsDataURL(file);
});

// Handle Upload Form Submission (PWA upload progress + Firestore write)
photoUploadForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const file = feedPhotoFileInput.files[0];
  const caption = feedPhotoCaption.value.trim();
  
  if (!file || !state.user || !state.profile) return;

  if (state.user.uid === "demo_user") {
    submitUploadBtn.disabled = true;
    uploadProgressContainer.style.display = "block";
    uploadProgressBar.style.width = "50%";
    uploadProgressText.textContent = "50% verwerken...";

    const reader = new FileReader();
    reader.onload = () => {
      uploadProgressBar.style.width = "100%";
      uploadProgressText.textContent = "Voltooid!";
      
      setTimeout(() => {
        let mockFeed = JSON.parse(localStorage.getItem("nobu_mock_feed")) || [];
        mockFeed.unshift({
          id: "mock_post_" + Math.random().toString(36).substring(2) + Date.now().toString(36),
          uid: state.user.uid,
          nickname: state.profile.nickname || "Lustrum Gast",
          realname: state.profile.realname || "Gast (Offline Preview)",
          avatarUrl: state.profile.avatarUrl || "nobu logo.jpg",
          photoUrl: reader.result, // base64 DataURL
          caption: caption,
          likes: [],
          comments: [],
          createdAt: new Date().toISOString()
        });
        
        localStorage.setItem("nobu_mock_feed", JSON.stringify(mockFeed));
        
        uploadProgressContainer.style.display = "none";
        uploadModalOverlay.classList.remove("active");
        init(); // refresh UI locally
        document.getElementById("main-content").scrollTop = 0;
      }, 500);
    };
    reader.readAsDataURL(file);
    return;
  }

  submitUploadBtn.disabled = true;
  uploadProgressContainer.style.display = "block";
  uploadErrorMsg.style.display = "none";
  uploadProgressBar.style.width = "10%";
  uploadProgressText.textContent = "10% geüpload...";

  // Start simulated progress for a smoother visual feedback, up to 90%
  let currentProgress = 10;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.floor(Math.random() * 10) + 5;
      if (currentProgress > 90) currentProgress = 90;
      uploadProgressBar.style.width = `${currentProgress}%`;
      uploadProgressText.textContent = `${currentProgress}% geüpload...`;
    }
  }, 200);

  try {
    // Security naming standard: generate a pure random UUID, preventing any folder traversal sequences
    // Fallback to random generator if crypto.randomUUID is not available in insecure contexts (non-HTTPS mobile IP connections)
    const randomFilename = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const storageRef = ref(storage, `feed_photos/${randomFilename}${fileExtension}`);

    activeUploadTask = true;
    console.log("Feed: Starting uploadBytes to", storageRef.fullPath);

    uploadBytes(storageRef, file)
      .then(async (snapshot) => {
        console.log("Feed: uploadBytes resolved successfully!", snapshot);
        clearInterval(progressInterval);
        uploadProgressBar.style.width = "100%";
        uploadProgressText.textContent = "100% geüpload!";
        
        try {
          const downloadUrl = await getDownloadURL(snapshot.ref);
          console.log("Feed: Download URL fetched:", downloadUrl);
          
          // Write post metadata to Firestore
          await addDoc(collection(db, "photos"), {
            uid: state.user.uid,
            nickname: state.profile.nickname || "Lustrumganger",
            realname: state.profile.realname || "",
            avatarUrl: state.profile.avatarUrl || "nobu logo.jpg",
            photoUrl: downloadUrl,
            caption: caption,
            likes: [],
            comments: [],
            createdAt: new Date().toISOString()
          });

          console.log("Feed entry created successfully inside Firestore!");
          activeUploadTask = null;
          uploadModalOverlay.classList.remove("active");
          
          // Scroll main main window to top to see new photo
          document.getElementById("main-content").scrollTop = 0;
        } catch (e) {
          console.error("Firestore photo metadata save failed:", e);
          uploadErrorMsg.textContent = `Foto geüpload maar registreren mislukt: ${e.message || e}`;
          uploadErrorMsg.style.display = "block";
          submitUploadBtn.disabled = false;
          activeUploadTask = null;
        }
      })
      .catch((error) => {
        clearInterval(progressInterval);
        console.error("Photo upload failed (promise catch):", error);
        uploadErrorMsg.textContent = `Uploaden mislukt: ${error.message || error} (Controleer of Storage is geactiveerd in de Firebase Console)`;
        uploadErrorMsg.style.display = "block";
        submitUploadBtn.disabled = false;
        activeUploadTask = null;
      });
  } catch (err) {
    clearInterval(progressInterval);
    console.error("Synchronous error during upload creation:", err);
    uploadErrorMsg.textContent = `Systeemfout bij upload: ${err.message || err}`;
    uploadErrorMsg.style.display = "block";
    submitUploadBtn.disabled = false;
    activeUploadTask = null;
  }
});
