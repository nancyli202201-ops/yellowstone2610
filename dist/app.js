const places = [
  { id: "old-faithful", name: "Old Faithful", region: "UPPER GEYSER BASIN", lat: 44.4605, lng: -110.8281, description: "Watch one of Yellowstone’s best-known geysers send water and steam into the sky.", fact: "Old Faithful is famous for its frequent eruptions. The time between eruptions varies, so each one is its own event.", prompts: ["Why does Old Faithful erupt?", "How often does it erupt?"] },
  { id: "grand-prismatic", name: "Grand Prismatic Spring", region: "MIDWAY GEYSER BASIN", lat: 44.5251, lng: -110.8382, description: "See the vivid blue center and rings of color surrounding Yellowstone’s largest hot spring.", fact: "Different heat-loving microorganisms help create the bands of color around the spring. Its deep blue center is too hot for most of them.", prompts: ["Why is the spring so colorful?", "How big is it?"] },
  { id: "mammoth", name: "Mammoth Hot Springs", region: "NORTHERN YELLOWSTONE", lat: 44.9679, lng: -110.7056, description: "Wander past pale terraces shaped by flowing mineral-rich thermal water.", fact: "The terraces are made of travertine, a form of limestone deposited as hot water reaches the surface.", prompts: ["How are the terraces formed?", "Do the terraces change?"] },
  { id: "grand-canyon", name: "Grand Canyon of the Yellowstone", region: "CANYON COUNTRY", lat: 44.7197, lng: -110.4874, description: "Follow the river through a colorful canyon and take in the sight of the Lower Falls.", fact: "The canyon’s yellow, orange, and red walls were shaped by volcanic heat and erosion over time.", prompts: ["Why are the canyon walls yellow?", "Where are the Lower Falls?"] },
  { id: "hayden", name: "Hayden Valley", region: "CENTRAL YELLOWSTONE", lat: 44.6662, lng: -110.4586, description: "Take in wide open meadows, the Yellowstone River, and a landscape known for wildlife.", fact: "The valley’s broad, open landscape follows the Yellowstone River between Yellowstone Lake and the canyon area.", prompts: ["What animals live in Hayden Valley?", "Where does the river go?"] },
  { id: "yellowstone-lake", name: "Yellowstone Lake", region: "SOUTHERN YELLOWSTONE", lat: 44.4592, lng: -110.3665, description: "Pause beside the immense high-elevation lake at the heart of Yellowstone.", fact: "Yellowstone Lake sits within the park’s volcanic landscape, with thermal features in and around parts of the lake.", prompts: ["Is the lake volcanic?", "How large is the lake?"] },
  { id: "norris", name: "Norris Geyser Basin", region: "WESTERN YELLOWSTONE", lat: 44.7285, lng: -110.7042, description: "Explore an active basin of steaming vents, geysers, colorful water, and boardwalks.", fact: "Norris is one of the park’s most changeable thermal areas. The film visits both Porcelain Basin and Back Basin.", prompts: ["What makes Norris special?", "What is Steamboat Geyser?"] },
  { id: "fountain", name: "Fountain Paint Pot Trail", region: "LOWER GEYSER BASIN", lat: 44.5506, lng: -110.8073, description: "Take a virtual walk past mudpots, hot springs, steam vents, and geysers on one compact trail.", fact: "This boardwalk trail brings together all four major kinds of hydrothermal features: geysers, hot springs, mudpots, and fumaroles.", prompts: ["What can I see on this trail?", "What is a mudpot?"] }
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
let guideBusy = false;
let videoCatalog = {};

function videoFor(place) {
  const video = videoCatalog[place.id];
  if (!video || !["youtube", "file"].includes(video.type) || typeof video.url !== "string") return null;
  try {
    const url = new URL(video.url, location.href);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (video.type === "file") return { ...video, url: url.href };
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return null;
    const start = Number.isInteger(video.startSeconds) && video.startSeconds > 0 ? video.startSeconds : 0;
    return { ...video, url: url.href, id, start };
  } catch {
    return null;
  }
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
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
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
  const video = videoFor(place);
  document.querySelector("#video-credit").textContent = video?.credit || "Video unavailable";
  const videoLink = document.querySelector("#video-link");
  videoLink.hidden = !video;
  if (video) {
    const linkUrl = new URL(video.url);
    if (video.type === "youtube" && video.start) linkUrl.searchParams.set("t", `${video.start}s`);
    videoLink.href = linkUrl.href;
    videoLink.textContent = video.type === "youtube" ? "Watch on YouTube ↗" : "Open video ↗";
  }
  document.querySelector("#detail-navigation-label").textContent = `${index + 1} OF ${places.length}`;
  const frame = document.querySelector("#video-frame");
  frame.replaceChildren();
  if (video?.type === "file") {
    const player = document.createElement("video");
    player.src = video.url;
    player.controls = true;
    player.playsInline = true;
    player.preload = "metadata";
    if (typeof video.poster === "string") player.poster = new URL(video.poster, location.href).href;
    player.setAttribute("aria-label", `${place.name} video`);
    frame.append(player);
  } else if (video?.type === "youtube") {
    const image = document.createElement("img");
    image.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    image.alt = `Video preview for ${place.name}`;
    const play = document.createElement("button");
    play.className = "video-play";
    play.type = "button";
    play.setAttribute("aria-label", `Play video of ${place.name}`);
    play.textContent = "▶";
    play.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0${video.start ? `&start=${video.start}` : ""}`;
      iframe.title = `${place.name} video`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });
    frame.append(image, play);
  } else {
    const notice = document.createElement("p");
    notice.className = "video-unavailable";
    notice.textContent = "This video is unavailable right now.";
    frame.append(notice);
  }
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

function addMessage(role, content, speakable = true) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  const meta = document.createElement("span");
  meta.className = "message-meta";
  meta.textContent = role === "assistant" ? "YOUR GUIDE" : "YOU";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  message.append(meta, bubble);
  if (role === "assistant" && speakable && "speechSynthesis" in window) {
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
  return message;
}

async function askGuide(question) {
  const clean = question.trim();
  if (!clean || guideBusy) return;
  guideBusy = true;
  document.querySelector("#send-button").disabled = true;
  addMessage("user", clean);
  chatInput.value = "";
  const waiting = addMessage("assistant", "Thinking about your question…", false);
  try {
    const response = await fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean, placeId: activePlace?.id || null })
    });
    const data = await response.json();
    waiting.remove();
    addMessage("assistant", response.ok ? data.answer : (data.error || "The guide is unavailable. Please try again."));
  } catch {
    waiting.remove();
    addMessage("assistant", "The guide is unavailable. Please try again.");
  } finally {
    guideBusy = false;
    document.querySelector("#send-button").disabled = false;
  }
}

async function checkGuideReady() {
  const status = document.querySelector("#guide-service-status");
  const badge = document.querySelector("#guide-badge");
  try {
    const response = await fetch("/api/guide", { cache: "no-store" });
    const data = await response.json();
    status.textContent = data.ready ? "KEY CONFIGURED" : "SETUP NEEDED";
    badge.textContent = data.ready ? "AI GUIDE" : "OFFLINE";
  } catch {
    status.textContent = "GUIDE OFFLINE";
    badge.textContent = "OFFLINE";
  }
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
async function start() {
  try {
    const response = await fetch("./videos.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Video catalog unavailable");
    videoCatalog = await response.json();
  } catch {
    videoCatalog = {};
  }
  renderPlaceList();
  initializeMap();
  updateSuggestions();
  addMessage("assistant", "Welcome to Yellowstone. Pick a place on the map, or ask me what you’d like to discover first.");
  setupVoice();
  checkGuideReady();
  const initialId = location.hash.slice(1);
  if (places.some(place => place.id === initialId)) showPlace(initialId);
}

start();
