import { cocktailsList } from "./cocktails-data.js";

// Travel Start Date (Anchor today: Friday, May 29, 2026)
const START_DATE = new Date("2026-06-01T00:00:00");

// Calculate week index (0-67) based on current local date
function getCurrentWeekIndex() {
  const now = new Date();
  if (now < START_DATE) return 0;
  
  const diffTime = Math.abs(now - START_DATE);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const weekIndex = Math.floor(diffDays / 7);
  
  // Cap at 67 (which corresponds to our 68th signature cocktail)
  if (weekIndex >= 68) return 67;
  return weekIndex;
}

// Generate Dutch date range string for a given week index
function getWeekRangeString(weekIndex) {
  const start = new Date(START_DATE.getTime() + (weekIndex * 7 * 24 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + (6 * 24 * 60 * 60 * 1000));
  
  const startStr = start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  
  return `${startStr} t/m ${endStr}`;
}

// High-quality category cocktail images from Unsplash
const cocktailImages = {
  martini: "https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?auto=format&fit=crop&w=2000&q=100",
  mojito: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=2000&q=100",
  coffee: "https://images.unsplash.com/photo-1545696911-c4379e49b88d?auto=format&fit=crop&w=2000&q=100",
  spritz: "https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&w=2000&q=100",
  tropical: "https://images.unsplash.com/photo-1587888637140-849b25d80ef9?auto=format&fit=crop&w=2000&q=100",
  sour: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=2000&q=100",
  sunset: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=2000&q=100",
  amber: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=2000&q=100",
  mule: "https://images.unsplash.com/photo-1600359756098-8bc52195bbf4?auto=format&fit=crop&w=2000&q=100",
  signature: "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=2000&q=100",
  default: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=2000&q=100"
};

// Curation of 68 specific beautiful Unsplash photo IDs for each recipe in sequence
const specificCocktailImages = [
  "1551024709-8f23befc6f87", // 1. Pornstar Martini
  "1513558161293-cdaf765ed2fd", // 2. Classic Mojito
  "1545696911-c4379e49b88d", // 3. Espresso Martini
  "1560512823-829485b8bf24", // 4. Aperol Spritz
  "1587888637140-849b25d80ef9", // 5. Piña Colada
  "1600359756098-8bc52195bbf4", // 6. Moscow Mule
  "1536935338788-846bb9981813", // 7. Classic Margarita
  "1497534446932-c925b458314e", // 8. Whiskey Sour
  "1524156868115-e696b44a8335", // 9. Nobu Gin & Tonic
  "1551538827-9c02ecd27999", // 10. Negroni
  "1518692938218-cf47d4514bc5", // 11. Cosmopolitan
  "1514362545857-3bc16c4c7d1b", // 12. Old Fashioned
  "1595981267035-7b04ca84a82d", // 13. Classic Daiquiri
  "1530991808291-7e157454758c", // 14. Dark 'n Stormy
  "1621263764928-df1444c5e859", // 15. Caipirinha
  "1551024709-8f23befc6f87", // 16. Tequila Sunrise
  "1541544741938-0af808871cc0", // 17. Bloody Mary
  "1556881286-fc6915169721", // 18. Long Island Iced Tea
  "1544161515-4ab6ce6db874", // 19. Classic Mimosa
  "1556679343-c7306c1976bc", // 20. Bellini
  "1556742049-0cfed4f6a45d", // 21. Amaretto Sour
  "1592318791185-3be91f589998", // 22. Tom Collins
  "1605270012917-bf157c5a9541", // 23. Hugo
  "1510626176961-4b57d4f40a13", // 24. Cuba Libre
  "1621263765154-cb1d3106173a", // 25. Sex on the Beach
  "1598880940381-862d8b4dc36f", // 26. French 75
  "1615887023516-9b6bcd559e87", // 27. Paloma
  "1607622750671-6cd9a99eabd1", // 28. Mai Tai
  "1576092768241-dec231879fc3", // 29. Irish Coffee
  "1599021456807-25db0f974333", // 30. Zombie
  "1502819126416-d387f86d47a1", // 31. Sidecar
  "1602931316694-ff85dfccf80f", // 32. White Russian
  "1609121214018-0200240d4e76", // 33. Black Russian
  "1582298538104-fe2e74c27f59", // 34. Clover Club
  "1614313511387-1436a4480edd", // 35. Classic Manhattan
  "1572268611455-8edc6b288925", // 36. Mint Julep
  "1595981266686-0cf387d0a608", // 37. Singapore Sling
  "1618413988350-0a256a422055", // 38. Bramble
  "1597403491447-3ab08f8e44dc", // 39. Gimlet
  "1556881286-fc6915169721", // 40. Rusty Nail
  "1563227812-0ea4c22e6cc8", // 41. Pisco Sour
  "1625126815333-909fdb221917", // 42. Boulevardier
  "1610630789642-7a2e8c25381e", // 43. Aviation
  "1518692938218-cf47d4514bc5", // 44. French Martini
  "1613478223719-2ab802602423", // 45. Limoncello Spritz
  "1609121214018-0200240d4e76", // 46. Mezcalita
  "1551024709-8f23befc6f87", // 47. Sea Breeze
  "1621263765154-cb1d3106173a", // 48. Virgin Mojito (Mocktail)
  "1551024709-8f23befc6f87", // 49. Shirley Temple (Mocktail)
  "1587888637140-849b25d80ef9", // 50. Virgin Piña Colada (Mocktail)
  "1536935338788-846bb9981813", // 51. Gin Basil Smash
  "1615887023516-9b6bcd559e87", // 52. Spicy Mango Margarita
  "1599021456807-25db0f974333", // 53. Hurricane
  "1570598912132-0ba1dc952b7d", // 54. Gibson
  "1514362545857-3bc16c4c7d1b", // 55. Godfather
  "1595981266686-0cf387d0a608", // 56. Grasshopper
  "1544161515-4ab6ce6db874", // 57. Kir Royale
  "1613478223719-2ab802602423", // 58. Lemon Drop Martini
  "1556881286-fc6915169721", // 59. Long Beach Iced Tea
  "1497534446932-c925b458314e", // 60. Midori Sour
  "1514362545857-3bc16c4c7d1b", // 61. Rob Roy
  "1551024709-8f23befc6f87", // 62. Salty Dog
  "1551024709-8f23befc6f87", // 63. Sangria Pitcher
  "1536935338788-846bb9981813", // 64. Tequila Mockingbird
  "1513558161293-cdaf765ed2fd", // 65. Blueberry Tom Collins
  "1597403491447-3ab08f8e44dc", // 66. White Lady
  "1551024709-8f23befc6f87", // 67. Strawberry Daiquiri
  "1536935338788-846bb9981813"  // 68. Nobu Emerald Mist
];

// Return a beautiful theme image based on cocktail category names
function getImageUrlForCocktail(cocktailOrName) {
  if (cocktailOrName && typeof cocktailOrName === "object" && cocktailOrName.id) {
    const specificImage = specificCocktailImages[cocktailOrName.id - 1];
    if (specificImage) {
      return `https://images.unsplash.com/photo-${specificImage}?auto=format&fit=crop&w=2000&q=100`;
    }
  }

  const name = typeof cocktailOrName === "string" ? cocktailOrName : (cocktailOrName?.name || "");
  const lowercase = name.toLowerCase();
  if (lowercase.includes("emerald") || lowercase.includes("emerald mist")) return cocktailImages.signature;
  if (lowercase.includes("martini") || lowercase.includes("gimlet") || lowercase.includes("aviation") || lowercase.includes("cosmopolitan")) return cocktailImages.martini;
  if (lowercase.includes("mojito") || lowercase.includes("hugo") || lowercase.includes("mint") || lowercase.includes("smash")) return cocktailImages.mojito;
  if (lowercase.includes("espresso") || lowercase.includes("coffee") || lowercase.includes("russian")) return cocktailImages.coffee;
  if (lowercase.includes("spritz") || lowercase.includes("bellini") || lowercase.includes("mimosa") || lowercase.includes("kir")) return cocktailImages.spritz;
  if (lowercase.includes("colada") || lowercase.includes("zombie") || lowercase.includes("hurricane") || lowercase.includes("mai tai")) return cocktailImages.tropical;
  if (lowercase.includes("sour") || lowercase.includes("margarita") || lowercase.includes("lemon") || lowercase.includes("sidecar") || lowercase.includes("lady")) return cocktailImages.sour;
  if (lowercase.includes("sunrise") || lowercase.includes("sex") || lowercase.includes("daiquiri") || lowercase.includes("breeze") || lowercase.includes("bramble")) return cocktailImages.sunset;
  if (lowercase.includes("whiskey") || lowercase.includes("fashioned") || lowercase.includes("manhattan") || lowercase.includes("negroni") || lowercase.includes("boulevardier") || lowercase.includes("godfather") || lowercase.includes("rob roy")) return cocktailImages.amber;
  if (lowercase.includes("mule") || lowercase.includes("stormy")) return cocktailImages.mule;
  return cocktailImages.default;
}

// DOM References
const weekTag = document.getElementById("cocktail-week-tag");
const dateTag = document.getElementById("cocktail-date-tag");
const titleEl = document.getElementById("cocktail-title");
const descEl = document.getElementById("cocktail-desc");
const ingredientsEl = document.getElementById("cocktail-ingredients");
const stepsEl = document.getElementById("cocktail-steps");

const searchInput = document.getElementById("cocktail-search-input");
const listContainer = document.getElementById("cocktails-full-list");
const exportPdfBtn = document.getElementById("export-cocktails-pdf-btn");
const printContainer = document.getElementById("print-cocktails-rows-container");

// Render a selected cocktail into the main display card
export function renderCocktailCard(cocktail, weekNum = null) {
  titleEl.textContent = cocktail.name;
  descEl.textContent = cocktail.desc;
  stepsEl.textContent = cocktail.steps;

  // Render the matching category image
  const imgEl = document.getElementById("cocktail-image");
  if (imgEl) {
    imgEl.src = getImageUrlForCocktail(cocktail);
  }

  // Render week number indicator if provided
  if (weekNum !== null) {
    weekTag.textContent = `Week ${weekNum}`;
    dateTag.textContent = getWeekRangeString(weekNum - 1);
  } else {
    weekTag.textContent = `Cocktail details`;
    dateTag.textContent = "Lijstoverzicht";
  }

  // Clear and safely render ingredients list items (XSS prevention)
  ingredientsEl.replaceChildren();
  cocktail.ingredients.forEach(ingText => {
    const li = document.createElement("li");
    li.textContent = ingText;
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    
    // Add dot point
    const dot = document.createElement("span");
    dot.style.color = "var(--primary)";
    dot.innerHTML = "&#8226;";
    li.prepend(dot);
    
    ingredientsEl.appendChild(li);
  });
}

// Render dynamic searchable sidebar index list of all cocktails
function renderFullList(filterText = "") {
  listContainer.replaceChildren();
  
  const queryText = filterText.toLowerCase();

  cocktailsList.forEach((cocktail, index) => {
    const weekNum = index + 1;
    
    // Match by name or ingredients
    const nameMatch = cocktail.name.toLowerCase().includes(queryText);
    const ingredientsMatch = cocktail.ingredients.some(ing => ing.toLowerCase().includes(queryText));

    if (queryText && !nameMatch && !ingredientsMatch) {
      return; // Skip if no search match
    }

    const itemRow = document.createElement("div");
    itemRow.style.display = "flex";
    itemRow.style.alignItems = "center";
    itemRow.style.justifyContent = "space-between";
    itemRow.style.padding = "10px 14px";
    itemRow.style.backgroundColor = "rgba(0, 0, 0, 0.15)";
    itemRow.style.borderRadius = "12px";
    itemRow.style.border = "1px solid var(--border)";
    itemRow.style.cursor = "pointer";
    itemRow.style.transition = "var(--transition)";

    // Hover transitions
    itemRow.addEventListener("mouseenter", () => {
      itemRow.style.borderColor = "var(--primary-glow)";
      itemRow.style.backgroundColor = "rgba(0, 232, 0, 0.03)";
    });
    itemRow.addEventListener("mouseleave", () => {
      itemRow.style.borderColor = "var(--border)";
      itemRow.style.backgroundColor = "rgba(0, 0, 0, 0.15)";
    });

    const infoDiv = document.createElement("div");
    infoDiv.style.display = "flex";
    infoDiv.style.flexDirection = "column";
    
    const nameSpan = document.createElement("span");
    nameSpan.style.fontWeight = "600";
    nameSpan.style.fontSize = "0.9rem";
    nameSpan.textContent = cocktail.name;
    infoDiv.appendChild(nameSpan);

    const weekSpan = document.createElement("span");
    weekSpan.style.fontSize = "0.75rem";
    weekSpan.style.color = "var(--text-muted)";
    weekSpan.textContent = `Week ${weekNum} (${getWeekRangeString(index)})`;
    infoDiv.appendChild(weekSpan);
    itemRow.appendChild(infoDiv);

    // Chevron Icon indicator
    const arrow = document.createElement("span");
    arrow.style.color = "var(--primary)";
    arrow.style.fontSize = "1rem";
    arrow.innerHTML = "&#8250;";
    itemRow.appendChild(arrow);

    // Clicking a list entry loads it into the main preview card
    itemRow.addEventListener("click", () => {
      renderCocktailCard(cocktail, weekNum);
      
      // Scroll the main content window to top to view card details
      document.getElementById("main-content").scrollTop = 0;
    });

    listContainer.appendChild(itemRow);
  });
  
  if (listContainer.children.length === 0) {
    const empty = document.createElement("div");
    empty.style.textAlign = "center";
    empty.style.padding = "20px";
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "0.85rem";
    empty.textContent = "Geen cocktails gevonden met deze zoekterm.";
    listContainer.appendChild(empty);
  }
}

// Compile all 68 cocktails into print layout and invoke native PDF print engine
function generatePrintSheet() {
  printContainer.replaceChildren();

  cocktailsList.forEach((cocktail, index) => {
    const weekNum = index + 1;

    const row = document.createElement("div");
    row.className = "print-cocktail-item";

    const title = document.createElement("div");
    title.className = "print-cocktail-title";
    title.textContent = `Week ${weekNum}: ${cocktail.name}`;
    row.appendChild(title);

    const dates = document.createElement("div");
    dates.style.fontSize = "10pt";
    dates.style.color = "#666666";
    dates.style.marginBottom = "8px";
    dates.textContent = `Looptijd: ${getWeekRangeString(index)}`;
    row.appendChild(dates);

    const desc = document.createElement("div");
    desc.style.fontStyle = "italic";
    desc.style.marginBottom = "12px";
    desc.textContent = cocktail.desc;
    row.appendChild(desc);

    const columns = document.createElement("div");
    columns.style.display = "flex";
    columns.style.gap = "40px";

    const ingCol = document.createElement("div");
    ingCol.style.flex = "1";
    
    const ingHeader = document.createElement("h4");
    ingHeader.style.fontSize = "12pt";
    ingHeader.style.marginBottom = "6px";
    ingHeader.textContent = "Ingrediënten:";
    ingCol.appendChild(ingHeader);

    const ul = document.createElement("ul");
    ul.style.paddingLeft = "20px";
    cocktail.ingredients.forEach(ingText => {
      const li = document.createElement("li");
      li.textContent = ingText;
      ul.appendChild(li);
    });
    ingCol.appendChild(ul);
    columns.appendChild(ingCol);

    const prepCol = document.createElement("div");
    prepCol.style.flex = "1.5";
    
    const prepHeader = document.createElement("h4");
    prepHeader.style.fontSize = "12pt";
    prepHeader.style.marginBottom = "6px";
    prepHeader.textContent = "Bereidingswijze:";
    prepCol.appendChild(prepHeader);

    const prepText = document.createElement("p");
    prepText.style.fontSize = "10.5pt";
    prepText.style.lineHeight = "1.4";
    prepText.textContent = cocktail.steps;
    prepCol.appendChild(prepText);
    
    columns.appendChild(prepCol);
    row.appendChild(columns);
    
    printContainer.appendChild(row);
  });
}

// Main Module Entry
export function init() {
  console.log("Initializing weekly cocktails module...");

  // 1. Calculate active week and render initial card
  const currentWeek = getCurrentWeekIndex();
  const defaultCocktail = cocktailsList[currentWeek];
  renderCocktailCard(defaultCocktail, currentWeek + 1);

  // 2. Render searchable browse index list
  if (listContainer) {
    renderFullList();
  }

  // 3. Search Keypress listener
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderFullList(e.target.value);
    });
  }

  // 4. PDF Export Button handler
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      console.log("Compiling full cocktails overview print layout...");
      generatePrintSheet();
      
      // Tiny delay to let rendering queue process, then open browser print window
      setTimeout(() => {
        window.print();
      }, 300);
    });
  }
}
