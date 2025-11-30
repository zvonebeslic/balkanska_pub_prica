// Basic demo data - in real app this would come from backend / database
const demoQuizzes = [
  {
    id: 1,
    title: "Pub Quiz – Sarajevo Classic",
    type: "opce",
    datetime: offsetDays(3, 20, 0),
    venue: "Craft Beer Pub, Sarajevo",
    lat: 43.8563,
    lng: 18.4131
  },
  {
    id: 2,
    title: "Kafanski kviz – Mostar Night",
    type: "kafanski",
    datetime: offsetDays(8, 21, 0),
    venue: "Stari Grad Pub, Mostar",
    lat: 43.3438,
    lng: 17.8078
  },
  {
    id: 3,
    title: "Nogometni kviz – Balkan Derbi",
    type: "nogometni",
    datetime: offsetDays(12, 19, 30),
    venue: "Sports Bar, Zagreb",
    lat: 45.8150,
    lng: 15.9819
  },
  {
    id: 4,
    title: "Kviz beskorisnog znanja",
    type: "beskorisno",
    datetime: offsetDays(20, 20, 30),
    venue: "Pub Lavirint, Beograd",
    lat: 44.7866,
    lng: 20.4489
  },
  {
    id: 5,
    title: "Sportski kviz – Planine & Sport",
    type: "sportski",
    datetime: offsetDays(5, 18, 0),
    venue: "Planinski bar, Podgorica",
    lat: 42.4304,
    lng: 19.2594
  }
];

let map;
let markersLayer;
let allQuizzes = [...demoQuizzes];
let userLocation = null;
let isAddQuizMode = false;
let addQuizMarker = null;

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initMap();
  initFilters();
  initLocationSearch();
  initAddQuizModal();
  renderQuizzes();
});

function initYear() {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

function initMap() {
  map = L.map("map", {
    zoomControl: true
  }).setView([44.5, 18], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Map click for adding quiz in modal mode
  map.on("click", (e) => {
    if (!isAddQuizMode) return;
    const { lat, lng } = e.latlng;
    setAddQuizMarker(lat, lng);
    const latInput = document.getElementById("quiz-lat");
    const lngInput = document.getElementById("quiz-lng");
    if (latInput && lngInput) {
      latInput.value = lat.toFixed(6);
      lngInput.value = lng.toFixed(6);
    }
  });

  refreshMarkers();
}

function refreshMarkers() {
  markersLayer.clearLayers();

  const filters = getActiveTypeFilters();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

  allQuizzes.forEach((quiz) => {
    const quizDate = new Date(quiz.datetime);
    if (quizDate < now || quizDate > thirtyDaysFromNow) {
      return;
    }

    if (!filters.includes(quiz.type)) {
      return;
    }

    const color = getMarkerColor(quiz.datetime);
    const icon = createColoredIcon(color);
    const marker = L.marker([quiz.lat, quiz.lng], { icon });

    const formattedDate = formatDateTime(quiz.datetime);
    const typeLabel = getTypeLabel(quiz.type);

    marker.bindPopup(
      `<strong>${quiz.title}</strong><br>` +
      `${quiz.venue}<br>` +
      `<span style="font-size: 0.8rem;">${formattedDate}</span><br>` +
      `<span style="font-size: 0.75rem; opacity: 0.8;">${typeLabel}</span>`
    );

    markersLayer.addLayer(marker);
  });
}

function createColoredIcon(color) {
  let bg;
  if (color === "green") bg = "#7fd95b";
  else if (color === "yellow") bg = "#ffd45b";
  else bg = "#ff6b6b";

  const svg = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)" />
        </filter>
      </defs>
      <path filter="url(#shadow)"
        d="M16 0C9 0 3.6 5.37 3.6 12.4C3.6 20.49 13.04 31.73 15.32 34.33C15.69 34.77 16.31 34.77 16.68 34.33C18.96 31.73 28.4 20.49 28.4 12.4C28.4 5.37 23 0 16 0Z"
        fill="${bg}" stroke="#ffffff" stroke-width="1.2"/>
      <circle cx="16" cy="13" r="5.2" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
    </svg>
  `;

  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32]
  });
}

function getMarkerColor(datetimeStr) {
  const now = new Date();
  const eventDate = new Date(datetimeStr);
  const diffMs = eventDate - now;
  const diffDays = diffMs / 86400000;

  if (diffDays <= 7) return "green";
  if (diffDays <= 14) return "yellow";
  return "red";
}

function getActiveTypeFilters() {
  const checkboxes = document.querySelectorAll(".quiz-type-filter");
  const active = [];
  checkboxes.forEach((cb) => {
    if (cb.checked) {
      active.push(cb.value);
    }
  });
  return active;
}

function initFilters() {
  const checkboxes = document.querySelectorAll(".quiz-type-filter");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      renderQuizzes();
      refreshMarkers();
    });
  });
}

/* Location & distance */

function initLocationSearch() {
  const useLocationBtn = document.getElementById("use-location-btn");
  const radiusSelect = document.getElementById("radius-select");
  const statusEl = document.getElementById("location-status");

  if (!useLocationBtn || !radiusSelect || !statusEl) return;

  useLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      statusEl.textContent = "Tvoj preglednik ne podržava geolokaciju.";
      return;
    }

    statusEl.textContent = "Dohvaćam tvoju lokaciju...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation = { lat: latitude, lng: longitude };
        statusEl.textContent = "Lokacija spremna! Filtriram kvizove u blizini.";

        const radiusKm = parseFloat(radiusSelect.value) || 25;
        focusOnNearby(radiusKm);
      },
      (err) => {
        console.error(err);
        statusEl.textContent = "Ne mogu dohvatiti lokaciju (možda je blokirana).";
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  });

  radiusSelect.addEventListener("change", () => {
    if (!userLocation) return;
    const radiusKm = parseFloat(radiusSelect.value) || 25;
    focusOnNearby(radiusKm);
  });
}

function focusOnNearby(radiusKm) {
  if (!userLocation) return;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

  // Filter quizzes by distance and date
  const inRadius = allQuizzes.filter((quiz) => {
    const quizDate = new Date(quiz.datetime);
    if (quizDate < now || quizDate > thirtyDaysFromNow) return false;

    const dist = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      quiz.lat,
      quiz.lng
    );
    quiz._distanceKm = dist;
    return dist <= radiusKm;
  });

  // Sort by distance
  inRadius.sort((a, b) => (a._distanceKm || 0) - (b._distanceKm || 0));

  // Zoom map to user + nearest markers
  const bounds = L.latLngBounds();
  bounds.extend([userLocation.lat, userLocation.lng]);
  inRadius.forEach((quiz) => {
    bounds.extend([quiz.lat, quiz.lng]);
  });

  if (inRadius.length > 0) {
    map.fitBounds(bounds.pad(0.2));
  } else {
    map.setView([userLocation.lat, userLocation.lng], 11);
  }

  // Re-render list with distance info
  renderQuizzes(inRadius);
  refreshMarkers();
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* Quiz rendering */

function renderQuizzes(filteredList = null) {
  const listEl = document.getElementById("quiz-list");
  const emptyMsg = document.getElementById("quiz-empty-message");
  if (!listEl || !emptyMsg) return;

  const filters = getActiveTypeFilters();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

  let quizzesToRender = filteredList || allQuizzes;

  // Filter by date and type
  quizzesToRender = quizzesToRender.filter((quiz) => {
    const quizDate = new Date(quiz.datetime);
    if (quizDate < now || quizDate > thirtyDaysFromNow) return false;
    return filters.includes(quiz.type);
  });

  // Sort by date
  quizzesToRender.sort(
    (a, b) => new Date(a.datetime) - new Date(b.datetime)
  );

  listEl.innerHTML = "";

  if (quizzesToRender.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  } else {
    emptyMsg.classList.add("hidden");
  }

  quizzesToRender.forEach((quiz) => {
    const li = document.createElement("li");
    li.className = "quiz-item";

    const header = document.createElement("div");
    header.className = "quiz-item-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "quiz-title";
    titleSpan.textContent = quiz.title;

    const typeSpan = document.createElement("span");
    typeSpan.className = "quiz-tag";
    typeSpan.textContent = getTypeLabel(quiz.type);

    header.appendChild(titleSpan);
    header.appendChild(typeSpan);

    const venueP = document.createElement("p");
    venueP.className = "quiz-venue";
    venueP.textContent = quiz.venue;

    const metaRow = document.createElement("div");
    metaRow.className = "quiz-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "quiz-date";
    dateSpan.textContent = formatDateTime(quiz.datetime);

    metaRow.appendChild(dateSpan);

    if (userLocation && typeof quiz._distanceKm === "number") {
      const distSpan = document.createElement("span");
      distSpan.className = "quiz-distance";
      distSpan.textContent = `${quiz._distanceKm.toFixed(1)} km`;
      metaRow.appendChild(distSpan);
    }

    li.appendChild(header);
    li.appendChild(venueP);
    li.appendChild(metaRow);

    listEl.appendChild(li);
  });
}

function getTypeLabel(type) {
  switch (type) {
    case "opce":
      return "Opće znanje";
    case "kafanski":
      return "Kafanski kviz";
    case "nogometni":
      return "Nogometni kviz";
    case "sportski":
      return "Sportski kviz";
    case "beskorisno":
      return "Beskorisno znanje";
    case "ostalo":
      return "Ostalo";
    default:
      return "Kviz";
  }
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year}. ${hours}:${mins}h`;
}

function offsetDays(days, hours, minutes) {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
    hours,
    minutes,
    0
  );
  return target.toISOString();
}

/* Add quiz modal & form */

function initAddQuizModal() {
  const modal = document.getElementById("add-quiz-modal");
  const openBtn = document.getElementById("add-quiz-open");
  const floatingBtn = document.getElementById("add-quiz-floating");
  const closeBtn = document.getElementById("add-quiz-close");
  const form = document.getElementById("add-quiz-form");

  if (!modal || !openBtn || !floatingBtn || !closeBtn || !form) return;

  const openModal = () => {
    modal.classList.remove("hidden");
    isAddQuizMode = true;
    if (map) {
      map._onResize();
    }
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    isAddQuizMode = false;
  };

  openBtn.addEventListener("click", openModal);
  floatingBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("quiz-title").value.trim();
    const type = document.getElementById("quiz-type").value;
    const datetime = document.getElementById("quiz-datetime").value;
    const venue = document.getElementById("quiz-venue").value.trim();
    const latStr = document.getElementById("quiz-lat").value.trim();
    const lngStr = document.getElementById("quiz-lng").value.trim();

    if (!title || !type || !datetime || !venue || !latStr || !lngStr) {
      alert("Molim ispuni sva polja i klikni na kartu za lokaciju.");
      return;
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert("Koordinate lokacije nisu valjane.");
      return;
    }

    const isoDate = new Date(datetime).toISOString();
    const now = new Date();
    const diffDays = (new Date(isoDate) - now) / 86400000;
    if (diffDays < 0 || diffDays > 30) {
      alert("Kviz može biti najkasnije 30 dana unaprijed.");
      return;
    }

    const newQuiz = {
      id: Date.now(),
      title,
      type,
      datetime: isoDate,
      venue,
      lat,
      lng
    };

    allQuizzes.push(newQuiz);

    alert(
      "Kviz je dodan u demo listu. U pravoj verziji ovdje bi išlo plaćanje 10 KM i spremanje u bazu."
    );

    form.reset();
    clearAddQuizMarker();
    document.getElementById("quiz-lat").value = "";
    document.getElementById("quiz-lng").value = "";

    renderQuizzes();
    refreshMarkers();
    closeModal();
  });
}

function setAddQuizMarker(lat, lng) {
  if (addQuizMarker) {
    addQuizMarker.setLatLng([lat, lng]);
  } else {
    addQuizMarker = L.marker([lat, lng]).addTo(map);
  }
}

function clearAddQuizMarker() {
  if (addQuizMarker) {
    map.removeLayer(addQuizMarker);
    addQuizMarker = null;
  }
}
