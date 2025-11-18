
// LOAD OPML FILE AND INITIALIZE PLAYER

async function loadOPML() {
  // URL of OPML playlist containing all radio stations
  const url = "https://raw.githubusercontent.com/lovehifi/playlist-radio/refs/heads/main/playlist-radio.opml";

  
  const response = await fetch(url);
  const xmlText = await response.text();

  
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");


  const json = xmlToJson(xml.documentElement);

  
  const stations = extractStations(json.body);


  stations.forEach(s => s.category = s.category || "Uncategorized");

  
  populateCategories(stations);

  
  setupSlider(stations);
  renderStationList(stations);

  
  document.getElementById("searchBox").addEventListener("input", () => filterStations(stations));
  document.getElementById("categoryDropdown").addEventListener("change", () => filterStations(stations));
}


// FILTER STATIONS BASED ON SEARCH OR CATEGORY
function filterStations(stations) {
  const filter = document.getElementById("searchBox").value.toLowerCase();
  const selectedCategory = document.getElementById("categoryDropdown").value;

  // Filter stations by search text and category
  const filtered = stations.filter(st => {
    const matchCategory = selectedCategory === "all" || st.category === selectedCategory;
    const matchText = st.title.toLowerCase().includes(filter);
    return matchCategory && matchText;
  });

  // Update station list and slider
  renderStationList(filtered);
  document.getElementById("stationSlider").max = filtered.length - 1;

  // Load first filtered station if available
  if (filtered.length) loadStation(filtered[0], 0, filtered.length);
}

// CONVERT XML NODE TO JSON-LIKE OBJECT
function xmlToJson(node) {
  const obj = {};

  // Map XML attributes to object properties
  if (node.attributes) for (const attr of node.attributes) obj[attr.name] = attr.value;

  // Recursively map child nodes
  for (const child of node.childNodes) {
    if (child.nodeType === 1) { // ELEMENT_NODE
      const name = child.nodeName;
      const value = xmlToJson(child);
      if (!obj[name]) obj[name] = value;
      else if (Array.isArray(obj[name])) obj[name].push(value);
      else obj[name] = [obj[name], value];
    }
    // Return text content for text nodes
    if (child.nodeType === 3 && child.nodeValue.trim()) return child.nodeValue.trim();
  }

  return obj;
}

// EXTRACT ALL STATIONS FROM JSON OBJECT
function extractStations(node) {
  const list = [];

  // Recursive walk function to traverse outlines
  function walk(n, parentCategory) {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(x => walk(x, parentCategory));

    // If station has URL, add it to list
    if (n.URL) {
      list.push({
        title: n.text || n.title || "(no name)",
        url: n.URL,
        quality: extractQuality(n.text || n.title || ""),
        category: parentCategory || "Uncategorized"
      });
    }

    // Recurse into child outlines with current category
    walk(n.outline, n.text || n.title || parentCategory);
  }

  walk(node);
  return list;
}

// EXTRACT STATION QUALITY FROM TITLE TEXT
function extractQuality(text) {
  const match = text.match(/(96|128|160|192|224|256|320)\s*kbps/i);
  return match ? match[1] + " kbps" : "Unknown quality";
}


// POPULATE CATEGORY DROPDOWN
function populateCategories(stations) {
  const dropdown = document.getElementById("categoryDropdown");
  
  // Get unique categories from stations
  const categories = Array.from(new Set(stations.map(s => s.category)));
  
  // Add an option for each category
  categories.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    dropdown.appendChild(option);
  });
}

// RENDER THE STATION LIST ABOVE PLAYER
function renderStationList(stations) {
  const container = document.getElementById("stationList");
  container.innerHTML = "";

  stations.forEach((st, i) => {
    const div = document.createElement("div");
    div.className = "station-item";
    div.textContent = `${st.title} (${st.quality})`;

    // Clicking station loads it into the player
    div.onclick = () => {
      loadStation(st, i, stations.length);
      document.getElementById("stationSlider").value = i;
    };

    container.appendChild(div);
  });
}

// INITIALIZE SLIDER FOR STATION NAVIGATION
function setupSlider(stations) {
  const slider = document.getElementById("stationSlider");
  slider.max = stations.length - 1;

  // Update station when slider changes
  slider.oninput = () => loadStation(stations[slider.value], slider.value, stations.length);

  // Load first station by default
  loadStation(stations[0], 0, stations.length);
}

// LOAD SELECTED STATION INTO AUDIO PLAYER
function loadStation(st, index, total) {
  document.getElementById("stationName").textContent = st.title;
  document.getElementById("stationQuality").textContent = "Quality: " + st.quality;
  document.getElementById("stationIndexText").textContent = `Station ${index + 1} of ${total}`;

  const player = document.getElementById("player");
  player.src = st.url;
  player.play(); // autoplay
}


loadOPML();
