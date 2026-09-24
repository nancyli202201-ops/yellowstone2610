const places = [
  { id: "old-faithful", name: "Old Faithful", region: "UPPER GEYSER BASIN", lat: 44.4605, lng: -110.8281, description: "Watch one of Yellowstone’s best-known geysers send water and steam into the sky.", fact: "Old Faithful is famous for its frequent eruptions. The time between eruptions varies, so each one is its own event.", video: "wilkPE-1XwU", creator: "Volkan Yuksel", quality: "4K eruption film", prompts: ["Why does Old Faithful erupt?", "How often does it erupt?"], answer: "Old Faithful erupts when groundwater is heated by rock below, builds pressure, and escapes as steam and water. Its timing varies, even though it is more predictable than many geysers." },
  { id: "grand-prismatic", name: "Grand Prismatic Spring", region: "MIDWAY GEYSER BASIN", lat: 44.5251, lng: -110.8382, description: "See the vivid blue center and rings of color surrounding Yellowstone’s largest hot spring.", fact: "Different heat-loving microorganisms help create the bands of color around the spring. Its deep blue center is too hot for most of them.", video: "635UZAPkElg", creator: "Amazing Places on Our Planet", quality: "4K scenic film", prompts: ["Why is the spring so colorful?", "How big is it?"], answer: "The bright rings come largely from heat-loving microorganisms living at different temperatures around the spring. The very hot center appears a deep blue." },
  { id: "mammoth", name: "Mammoth Hot Springs", region: "NORTHERN YELLOWSTONE", lat: 44.9679, lng: -110.7056, description: "Wander past pale terraces shaped by flowing mineral-rich thermal water.", fact: "The terraces are made of travertine, a form of limestone deposited as hot water reaches the surface.", video: "oz5CvNRoEf8", creator: "Scenic walking film", quality: "4K walking film", prompts: ["How are the terraces formed?", "Do the terraces change?"], answer: "At Mammoth, hot water carries dissolved minerals through limestone. When the water reaches the surface, calcium carbonate builds the layered travertine terraces." },
  { id: "grand-canyon", name: "Grand Canyon of the Yellowstone", region: "CANYON COUNTRY", lat: 44.7197, lng: -110.4874, description: "Follow the river through a colorful canyon and take in the sight of the Lower Falls.", fact: "The canyon’s yellow, orange, and red walls were shaped by volcanic heat and erosion over time.", video: "GzxlyTJD66Q", creator: "Amazing Places on Our Planet", quality: "4K scenic film", prompts: ["Why are the canyon walls yellow?", "Where are the Lower Falls?"], answer: "Heat altered the rocks around the canyon, and the Yellowstone River later cut through them. Minerals in the rock help give the canyon its warm colors." },
  { id: "hayden", name: "Hayden Valley", region: "CENTRAL YELLOWSTONE", lat: 44.6662, lng: -110.4586, description: "Take in wide open meadows, the Yellowstone River, and a landscape known for wildlife.", fact: "The valley’s broad, open landscape follows the Yellowstone River between Yellowstone Lake and the canyon area.", video: "SA23J5n1yPA", start: 2968, creator: "World of Drives", quality: "4K scenic drive · Hayden Valley chapter", prompts: ["What animals live in Hayden Valley?", "Where does the river go?"], answer: "Hayden Valley is known for broad meadows and wildlife, including bison and birds. The Yellowstone River runs north through the valley toward the canyon." },
  { id: "yellowstone-lake", name: "Yellowstone Lake", region: "SOUTHERN YELLOWSTONE", lat: 44.4592, lng: -110.3665, description: "Pause beside the immense high-elevation lake at the heart of Yellowstone.", fact: "Yellowstone Lake sits within the park’s volcanic landscape, with thermal features in and around parts of the lake.", video: "SA23J5n1yPA", start: 1471, creator: "World of Drives", quality: "4K scenic drive · lake chapter", prompts: ["Is the lake volcanic?", "How large is the lake?"], answer: "Yellowstone Lake lies over part of the Yellowstone volcanic system. Thermal features occur around its shores and under its waters." },
  { id: "norris", name: "Norris Geyser Basin", region: "WESTERN YELLOWSTONE", lat: 44.7285, lng: -110.7042, description: "Explore an active basin of steaming vents, geysers, colorful water, and boardwalks.", fact: "Norris is one of the park’s most changeable thermal areas. The film visits both Porcelain Basin and Back Basin.", video: "7v1uOUMdUB8", creator: "Prowalk Tours", quality: "4K 60fps walking tour", prompts: ["What makes Norris special?", "What is Steamboat Geyser?"], answer: "Norris is a very active thermal basin where hot water, steam, and minerals constantly reshape what visitors see. Its boardwalks pass many different thermal features." },
  { id: "fountain", name: "Fountain Paint Pot Trail", region: "LOWER GEYSER BASIN", lat: 44.5506, lng: -110.8073, description: "Take a virtual walk past mudpots, hot springs, steam vents, and geysers on one compact trail.", fact: "This boardwalk trail brings together all four major kinds of hydrothermal features: geysers, hot springs, mudpots, and fumaroles.", video: "RJFGtSLT8kk", creator: "Voyager’s Diary", quality: "Walking tour · resolution varies", prompts: ["What can I see on this trail?", "What is a mudpot?"], answer: "Fountain Paint Pot Trail passes geysers, hot springs, mudpots, and fumaroles. A mudpot forms where acidic water breaks rock into clay, which bubbles as gas and steam rise through it." }
];

const placeList = document.querySelector("#place-list");
const mapView = document.querySelector("#map-view");
const detailView = document.querySelector("#detail-view");
const conversation = document.querySelector("#conversation");
const suggestions = document.querySelector("#suggestions");
const chatInput = document.querySelector("#chat-input");
const voiceStatus = document.querySelector("#voice-status");
let activePlace = null;
let map = null;
let markers = [];
let recognition = null;

function videoUrl(place) {
  return `https://www.youtube.com/watch?v=${place.video}${place.start ? `&t=${place.start}s` : ""}`;
}

function renderPlaceList() {
  placeList.innerHTML = places.map((place, index) => `<button class="place-item" type="button" data-place="${place.id}" aria-label="Explore ${place.name}"><span class="place-number">${String(index + 1).padStart(2, "0")}</span><span class="place-name">${place.name}</span><span class="place-arrow" aria-hidden="true">↗</span></button>`).join("");
  placeList.addEventListener("click", event => {
    const button = event.target.closest("[data-place]");
    if (button) showPlace(button.dataset.place);
  });
}

function initializeMap() {
  if (!window.L) {
    document.querySelector("#map").innerHTML = '<div class="map-unavailable">The map is unavailable right now. Choose a place from the list to keep exploring.</div>';
    return;
  }
  map = L.map("map", { scrollWheelZoom: false, zoomControl: false, maxZoom: 13, minZoom: 7 }).setView([44.69, -110.57], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
  L.control.zoom({ position: "topright" }).addTo(map);
  markers = places.map((place, index) => {
    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({ className: "custom-marker", html: `<span class="marker-core">${String(index + 1).padStart(2, "0")}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
      title: place.name,
      keyboard: true
    }).addTo(map);
    marker.bindPopup(`<div class="pin-popup"><span class="mini-label">${place.region}</span><strong>${place.name}</strong><button type="button" data-popup-place="${place.id}">Explore this place →</button></div>`);
    marker.on("popupopen", () => {
      document.querySelector(`[data-popup-place="${place.id}"]`)?.addEventListener("click", () => showPlace(place.id));
    });
    return marker;
  });
  const desktop = window.innerWidth > 760;
  map.fitBounds(L.latLngBounds(places.map(place => [place.lat, place.lng])).pad(.08), {
    paddingTopLeft: desktop ? [370, 120] : [25, 245],
    paddingBottomRight: desktop ? [35, 45] : [25, 315]
  });
}

function showPlace(id) {
  const place = places.find(item => item.id === id);
  if (!place) return;
  activePlace = place;
  const index = places.indexOf(place);
  mapView.hidden = true;
  detailView.hidden = false;
  document.querySelector("#detail-position").textContent = `${String(index + 1).padStart(2, "0")} / 08`;
  document.querySelector("#detail-region").textContent = place.region;
  document.querySelector("#detail-title").textContent = place.name;
  document.querySelector("#detail-description").textContent = place.description;
  document.querySelector("#detail-fact").textContent = place.fact;
  document.querySelector("#video-credit").textContent = `${place.quality} · ${place.creator}`;
  document.querySelector("#youtube-link").href = videoUrl(place);
  document.querySelector("#detail-navigation-label").textContent = `${index + 1} OF ${places.length}`;
  const frame = document.querySelector("#video-frame");
  frame.replaceChildren();
  const image = document.createElement("img");
  image.src = `https://i.ytimg.com/vi/${place.video}/hqdefault.jpg`;
  image.alt = `Video preview for ${place.name}`;
  const play = document.createElement("button");
  play.className = "video-play";
  play.type = "button";
  play.setAttribute("aria-label", `Play video of ${place.name}`);
  play.textContent = "▶";
  play.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${place.video}?autoplay=1&rel=0${place.start ? `&start=${place.start}` : ""}`;
    iframe.title = `${place.name} video by ${place.creator}`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
  });
  frame.append(image, play);
  detailView.scrollTop = 0;
  updateSuggestions();
  history.replaceState(null, "", `#${place.id}`);
}

function showMap() {
  activePlace = null;
  detailView.hidden = true;
  mapView.hidden = false;
  document.querySelector("#video-frame").replaceChildren();
  updateSuggestions();
  history.replaceState(null, "", location.pathname + location.search);
  requestAnimationFrame(() => map?.invalidateSize());
}

function updateSuggestions() {
  const prompts = activePlace?.prompts || ["What makes Yellowstone special?", "Which place should I explore first?"];
  suggestions.replaceChildren(...prompts.map(question => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => askGuide(question));
    return button;
  }));
}

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  const meta = document.createElement("span");
  meta.className = "message-meta";
  meta.textContent = role === "assistant" ? "YOUR GUIDE" : "YOU";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  message.append(meta, bubble);
  if (role === "assistant" && "speechSynthesis" in window) {
    const speak = document.createElement("button");
    speak.type = "button";
    speak.className = "speak-reply";
    speak.textContent = "♪ Listen to answer";
    speak.addEventListener("click", () => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = "en-US";
      utterance.rate = .9;
      speechSynthesis.speak(utterance);
    });
    message.append(speak);
  }
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
}

function getGuideAnswer(question) {
  const q = question.toLowerCase();
  const matchingPlace = places.find(place => q.includes(place.name.toLowerCase()) || (place.id === "fountain" && /paint pot|mudpot/.test(q)) || (place.id === "old-faithful" && /old faithful/.test(q)));
  if (matchingPlace) return matchingPlace.answer;
  if (/where|which place|start|first|recommend|begin/.test(q)) return "A lovely place to begin is Old Faithful for a geyser eruption, then Grand Prismatic Spring for color. You can choose any of the eight map markers and explore at your own pace.";
  if (/color|colour|rainbow/.test(q)) return places[1].answer;
  if (/geyser|erupt|volcan|thermal|hot spring/.test(q)) return "Yellowstone’s underground heat warms water that rises as hot springs and steam. Where pressure builds in a suitable plumbing system, a geyser can erupt. Try Old Faithful or Norris Geyser Basin for a closer look.";
  if (/animal|wildlife|bison|bird/.test(q)) return places[4].answer;
  if (/access|wheelchair|walk|mobility/.test(q)) return "This virtual visit is here for exploring from anywhere. For on-site access details, check the National Park Service before visiting because trail conditions can change.";
  if (activePlace) return `${activePlace.answer} You can ask about another feature here, or choose a different place on the map.`;
  return "I can help with the eight places on this map, Yellowstone’s geysers, hot springs, wildlife, and virtual visit. Try choosing a place or asking what makes Yellowstone special.";
}

function askGuide(question) {
  const clean = question.trim();
  if (!clean) return;
  addMessage("user", clean);
  addMessage("assistant", getGuideAnswer(clean));
  chatInput.value = "";
}

function setupVoice() {
  const voiceButton = document.querySelector("#voice-button");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    voiceButton.addEventListener("click", () => { voiceStatus.textContent = "Voice input is unavailable in this browser. Please type your question."; });
    return;
  }
  recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = () => { voiceButton.classList.add("listening"); voiceButton.setAttribute("aria-label", "Stop listening"); voiceStatus.textContent = "Listening…"; };
  recognition.onend = () => { voiceButton.classList.remove("listening"); voiceButton.setAttribute("aria-label", "Speak your question"); if (voiceStatus.textContent === "Listening…") voiceStatus.textContent = ""; };
  recognition.onresult = event => { const spoken = event.results[0][0].transcript; voiceStatus.textContent = `Heard: ${spoken}`; askGuide(spoken); };
  recognition.onerror = () => { voiceStatus.textContent = "Voice input could not start. Please type your question."; };
  voiceButton.addEventListener("click", () => { if (voiceButton.classList.contains("listening")) recognition.stop(); else { voiceStatus.textContent = ""; recognition.start(); } });
}

document.querySelector("#back-button").addEventListener("click", showMap);
document.querySelector("#previous-place").addEventListener("click", () => showPlace(places[(places.indexOf(activePlace) - 1 + places.length) % places.length].id));
document.querySelector("#next-place").addEventListener("click", () => showPlace(places[(places.indexOf(activePlace) + 1) % places.length].id));
document.querySelector("#chat-form").addEventListener("submit", event => { event.preventDefault(); askGuide(chatInput.value); });
window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (id) showPlace(id); else showMap(); });
renderPlaceList();
initializeMap();
updateSuggestions();
addMessage("assistant", "Welcome to Yellowstone. Pick a place on the map, or ask me what you’d like to discover first.");
setupVoice();
const initialId = location.hash.slice(1);
if (places.some(place => place.id === initialId)) showPlace(initialId);
