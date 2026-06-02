const DEFAULT_NAMES = ["Farah", "Eline", "Justine", "Floor", "Lola", "Roos", "Sascha", "Ymke", "Estelle", "Ine", "Mikkie"];

// State Variables
let namesList = [];
let currentAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let particles = []; // Confetti particles list

// DOM References
const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin-wheel-btn");
const winnerOverlay = document.getElementById("wheel-winner-overlay");
const winnerDisplay = document.getElementById("wheel-winner-display");
const tagsList = document.getElementById("wheel-tags-list");
const addNameInput = document.getElementById("wheel-add-name-input");
const addNameBtn = document.getElementById("wheel-add-name-btn");
const resetNamesBtn = document.getElementById("wheel-reset-names-btn");

// Load names list from localStorage or use default 11 names
function loadNames() {
  const stored = localStorage.getItem("nobu_wheel_names");
  if (stored) {
    namesList = JSON.parse(stored);
  } else {
    namesList = [...DEFAULT_NAMES];
  }
}

// Save names list to localStorage and redraw
function saveNames() {
  localStorage.setItem("nobu_wheel_names", JSON.stringify(namesList));
  renderNameTags();
  drawWheel();
}

// Render the tags under the wheel for easy addition/removal
function renderNameTags() {
  tagsList.replaceChildren();

  namesList.forEach((name, index) => {
    const tag = document.createElement("div");
    tag.className = "name-tag";
    tag.textContent = name;

    const removeBtn = document.createElement("span");
    removeBtn.className = "name-tag-remove";
    removeBtn.innerHTML = "&times;";
    
    tag.appendChild(removeBtn);
    
    // Clicking on a tag deletes it
    tag.addEventListener("click", () => {
      if (isSpinning) return;
      namesList.splice(index, 1);
      saveNames();
    });

    tagsList.appendChild(tag);
  });
}

// Draw the colorful wheel sections on the canvas
function drawWheel() {
  const numSectors = namesList.length;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (numSectors === 0) {
    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "bold 14px var(--font-body)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Voeg namen toe om te draaien!", cx, cy);
    return;
  }

  const arcSize = (2 * Math.PI) / numSectors;

  // Alternate segment color palette (luxurious darks and neon highlights)
  const colors = [
    "#151D30", // Slate Navy
    "#0B0F19", // Deep Black/Navy
    "#00E800", // Theme Neon Green (Highlight)
    "#1E2942"  // Medium Slate
  ];

  for (let i = 0; i < numSectors; i++) {
    const angle = currentAngle + i * arcSize;
    
    // 1. Draw segment path
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + arcSize);
    ctx.closePath();

    // Map color index (ensure neon green doesn't sit next to itself)
    let colorIdx = i % colors.length;
    if (colorIdx === 2 && numSectors % colors.length === 3 && i === numSectors - 1) {
      colorIdx = 0; // Avoid same color adjacent boundary collision
    }
    
    ctx.fillStyle = colors[colorIdx];
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Draw text labels inside segments
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + arcSize / 2);
    
    // Text Alignment
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    
    // Choose high contrast text color (black on neon green, white on darks)
    ctx.fillStyle = (colors[colorIdx] === "#00E800") ? "#000000" : "#FFFFFF";
    ctx.font = "bold 12px var(--font-body)";
    
    // Limit text length to prevent overflow in small segments
    const displayName = namesList[i].length > 12 ? namesList[i].substring(0, 10) + ".." : namesList[i];
    ctx.fillText(displayName, radius - 15, 0);
    ctx.restore();
  }

  // Draw inner circle border outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 4;
  ctx.stroke();
}

// Physics spin simulation loop
function animateSpin() {
  if (!isSpinning) return;

  // Add friction deceleration
  spinVelocity *= 0.985;
  currentAngle += spinVelocity;

  // Render wheel position
  drawWheel();

  if (spinVelocity < 0.002) {
    // Wheel stopped spinning: resolve winner!
    isSpinning = false;
    spinVelocity = 0;
    
    resolveWinner();
  } else {
    requestAnimationFrame(animateSpin);
  }
}

// Confetti burst animation class
class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.8) * 8;
    this.radius = Math.random() * 4 + 2;
    this.color = ["#00E800", "#F59E0B", "#EF4444", "#38BDF8", "#FFFFFF"][Math.floor(Math.random() * 5)];
    this.alpha = 1.0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // gravity
    this.alpha -= 0.015;
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }
}

// Loop to render confetti particles on the canvas
function animateConfetti() {
  if (particles.length === 0) return;

  drawWheel();

  particles = particles.filter(p => {
    p.update();
    p.draw(ctx);
    return p.alpha > 0;
  });

  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  }
}

// Calculate the winning sector index based on stopped pointer position
function resolveWinner() {
  const numSectors = namesList.length;
  if (numSectors === 0) return;

  const arcSize = (2 * Math.PI) / numSectors;

  // The pointer sits at the top (angle: -Math.PI / 2, which is 270 deg or 1.5 * Math.PI)
  // We calculate which slice intercepts this position
  let normalizedAngle = (3 * Math.PI / 2 - currentAngle) % (2 * Math.PI);
  if (normalizedAngle < 0) {
    normalizedAngle += 2 * Math.PI;
  }

  const winningIndex = Math.floor(normalizedAngle / arcSize);
  const winner = namesList[winningIndex];

  // Reveal UI announcement overlay
  winnerDisplay.textContent = winner.toUpperCase();
  winnerOverlay.style.display = "block";
  
  // Animate button scale return
  spinBtn.disabled = false;
  spinBtn.textContent = "DRAAIEN!";

  // Generate Confetti burst from center pin
  particles = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (let i = 0; i < 150; i++) {
    particles.push(new ConfettiParticle(cx, cy));
  }
  
  // Kick off confetti particle render loop
  animateConfetti();
}

// Set up UI Event listeners
export function init() {
  console.log("Initializing names spin wheel module...");

  loadNames();
  renderNameTags();
  drawWheel();

  // Reset Winner display
  winnerOverlay.style.display = "none";
  spinBtn.disabled = false;

  // Spin Wheel button trigger
  spinBtn.onclick = () => {
    if (isSpinning || namesList.length === 0) return;

    // Reset overlay
    winnerOverlay.style.display = "none";
    particles = [];

    // Trigger random starting speed (range: 0.35 to 0.55 rad/frame)
    spinVelocity = Math.random() * 0.2 + 0.35;
    isSpinning = true;
    
    spinBtn.disabled = true;
    spinBtn.textContent = "Draait...";

    animateSpin();
  };

  // Add Custom Name button trigger
  addNameBtn.onclick = () => {
    const name = addNameInput.value.trim();
    if (!name) return;
    
    if (namesList.includes(name)) {
      alert("Deze naam staat al in de lijst!");
      return;
    }

    namesList.push(name);
    addNameInput.value = "";
    saveNames();
  };

  // Bind Enter key on add input
  addNameInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      addNameBtn.click();
    }
  };

  // Reset default names list trigger
  resetNamesBtn.onclick = () => {
    if (isSpinning) return;
    if (confirm("Weet je zeker dat je de namenlijst wilt herstellen naar de 11 standaard namen?")) {
      namesList = [...DEFAULT_NAMES];
      saveNames();
    }
  };
}
