// Packing Checklist Core Data
const defaultPackingItems = [
  "Paspoort of ID-kaart (Minimaal 6 maanden geldig!)",
  "Vliegtickets & Reserveringsbevestigingen (Zorg ook voor offline pdf's)",
  "Zorgverzekeringspas & Reisverzekering polisnummer",
  "Lustrum Gala Outfit (Dresscode: Black Tie met Neon-Groen accent!)",
  "Themafeest Outfit (Hou rekening met het geheime thema!)",
  "Meerdere bikini's / badkleding",
  "Sportieve kleding & Comfortabele wandelschoenen",
  "Zonnebril, pet of zonnehoed",
  "Zonnebrandcrème & Aftersun (Hoge bescherming!)",
  "Toiletartikelen (Max. 100ml flacons in doorzichtige zak voor handbagage)",
  "Telefoonoplader, oortjes & Powerbank",
  "Persoonlijke medicijnen & Paracetamol",
  "Contant geld (Euro's en lokale valuta indien nodig)",
  "Kleine rugzak of strandtas"
];

// DOM References
const packingContainer = document.getElementById("packing-list-container");

// Load checked states database from LocalStorage
function loadChecklistState() {
  const stored = localStorage.getItem("nobu_packing_checklist");
  return stored ? JSON.parse(stored) : {};
}

// Save checked states to LocalStorage
function saveChecklistState(states) {
  localStorage.setItem("nobu_packing_checklist", JSON.stringify(states));
}

// Render packing checklist items dynamically
export function init() {
  console.log("Initializing packing checklist module...");
  
  if (!packingContainer) return;
  
  const checkedStates = loadChecklistState();
  packingContainer.replaceChildren();

  defaultPackingItems.forEach((itemText, index) => {
    const isChecked = !!checkedStates[index];

    // Create container card
    const itemCard = document.createElement("div");
    itemCard.className = `packing-item ${isChecked ? 'checked' : ''}`;
    itemCard.setAttribute("data-index", index);

    // Create checkbox box
    const checkbox = document.createElement("div");
    checkbox.className = "packing-checkbox";
    // Check icon SVG
    checkbox.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
    `;
    itemCard.appendChild(checkbox);

    // Create Label
    const label = document.createElement("span");
    label.className = "packing-label";
    label.textContent = itemText;
    itemCard.appendChild(label);

    // Add click toggler listener
    itemCard.addEventListener("click", () => {
      const currentStates = loadChecklistState();
      const newCheckedState = !currentStates[index];
      
      // Update memory
      currentStates[index] = newCheckedState;
      saveChecklistState(currentStates);

      // Update UI classes
      if (newCheckedState) {
        itemCard.classList.add("checked");
      } else {
        itemCard.classList.remove("checked");
      }
    });

    packingContainer.appendChild(itemCard);
  });
}
