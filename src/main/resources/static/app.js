const USER_BASE = "/users";
const MOVIE_BASE = "/movies";
const BOOKING_BASE = "/bookings";
let selectedUserId = "";
let lastUsers = [];
let lastMovies = [];

const el = {
  createMovieForm: document.getElementById("createMovieForm"),
  getMovieForm: document.getElementById("getMovieForm"),
  updateMovieForm: document.getElementById("updateMovieForm"),
  deleteMovieForm: document.getElementById("deleteMovieForm"),
  reloadDashboard: document.getElementById("reloadDashboard"),
  loadAllUsers: document.getElementById("loadAllUsers"),
  loadAllMovies: document.getElementById("loadAllMovies"),
  loadAllBookings: document.getElementById("loadAllBookings"),
  selectedUser: document.getElementById("selectedUser"),
  userTableBody: document.getElementById("userTableBody"),
  movieTableBody: document.getElementById("movieTableBody"),
  bookingTableBody: document.getElementById("bookingTableBody"),
  status: document.getElementById("status"),
  requestMeta: document.getElementById("requestMeta"),
  errorBox: document.getElementById("errorBox"),
  errorOutput: document.getElementById("errorOutput"),
  output: document.getElementById("output")
};

function setStatus(message, kind = "warn") {
  el.status.textContent = message;
  el.status.classList.remove("ok", "warn", "error");
  el.status.classList.add(kind);
}

function showOutput(payload) {
  hideError();

  if (typeof payload === "string") {
    el.output.textContent = payload;
    return;
  }
  el.output.textContent = JSON.stringify(payload, null, 2);
}

function setRequestMeta(method, url) {
  el.requestMeta.textContent = `${method} ${url}`;
}

function hideError() {
  el.errorBox.hidden = true;
  el.errorOutput.textContent = "";
}

function formatUnknownError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object") {
    return error;
  }

  return { message: "Unknown error", value: error };
}

function showError(error) {
  const normalized = formatUnknownError(error);
  el.errorBox.hidden = false;
  el.errorOutput.textContent = JSON.stringify(normalized, null, 2);
  el.output.textContent = JSON.stringify(normalized, null, 2);
}

function toObject(formElement) {
  const formData = new FormData(formElement);
  const result = {};

  for (const [key, value] of formData.entries()) {
    const trimmed = String(value).trim();
    if (trimmed !== "") {
      result[key] = trimmed;
    }
  }

  return result;
}

function toNumber(value) {
  return Number.parseInt(String(value), 10);
}

function toLocalDateTimeString(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function normalizeDateTimeInput(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  // datetime-local often returns yyyy-MM-ddTHH:mm; add seconds for LocalDateTime.
  return text.length === 16 ? `${text}:00` : text;
}

async function apiRequest(base, path, method, body) {
  const headers = {
    "Content-Type": "application/json"
  };

  const url = base + path;
  setRequestMeta(method, url);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw {
      type: "network-error",
      message: "Request could not reach the server.",
      url,
      detail: formatUnknownError(error)
    };
  }

  const raw = await response.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_err) {
    data = raw;
  }

  if (!response.ok) {
    throw {
      status: response.status,
      statusText: response.statusText,
      body: data
    };
  }

  return data;
}

function renderUsers(users) {
  lastUsers = Array.isArray(users) ? users : [];

  if (!Array.isArray(users) || users.length === 0) {
    el.userTableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
    selectedUserId = "";
    el.selectedUser.textContent = "선택된 사용자 없음";
    return;
  }

  if (!users.some((user) => user.userId === selectedUserId)) {
    selectedUserId = users[0].userId || "";
  }

  el.userTableBody.innerHTML = users
    .map((user) => {
      const userId = user.userId ?? "";
      const name = user.name ?? "";
      const address = user.address ?? "";
      const isSelected = userId === selectedUserId;

      return `<tr class="${isSelected ? "is-selected" : ""}">
        <td>${userId}</td>
        <td>${name}</td>
        <td>${address}</td>
        <td><button type="button" class="btn-inline ${isSelected ? "selected" : ""}" data-action="select-user" data-user-id="${userId}">${isSelected ? "선택됨" : "선택"}</button></td>
      </tr>`;
    })
    .join("");

  el.selectedUser.textContent = selectedUserId
    ? `선택된 사용자: ${selectedUserId}`
    : "선택된 사용자 없음";
}

function renderMovies(movies) {
  lastMovies = Array.isArray(movies) ? movies : [];

  if (!Array.isArray(movies) || movies.length === 0) {
    el.movieTableBody.innerHTML = '<tr><td colspan="6">No movies found.</td></tr>';
    return;
  }

  el.movieTableBody.innerHTML = movies
    .map((movie) => {
      const id = movie.movieId ?? "";
      const title = movie.title ?? "";
      const producer = movie.producer ?? "";
      const price = movie.price ?? "";
      const openDate = movie.openDate ?? "";

      return `<tr>
        <td>${id}</td>
        <td>${title}</td>
        <td>${producer}</td>
        <td>${price}</td>
        <td>${openDate}</td>
        <td><button type="button" class="btn-inline" data-action="book" data-movie-id="${id}">Book Now</button></td>
      </tr>`;
    })
    .join("");
}

function renderBookings(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    el.bookingTableBody.innerHTML = '<tr><td colspan="4">예매 내역이 없습니다.</td></tr>';
    return;
  }

  el.bookingTableBody.innerHTML = bookings
    .map((booking) => {
      const bookingId = booking.bookingId ?? "";
      const userId = booking.userId ?? "";
      const movieId = booking.movieId ?? "";
      const bookingDate = booking.bookingDate ?? "";

      return `<tr>
        <td>${bookingId}</td>
        <td>${userId}</td>
        <td>${movieId}</td>
        <td>${bookingDate}</td>
      </tr>`;
    })
    .join("");
}

async function loadAllMovies() {
  setStatus("Loading all movies...", "warn");

  try {
    const data = await apiRequest(MOVIE_BASE, "", "GET");
    renderMovies(data);
    setStatus("Loaded all movies", "ok");
    showOutput(data);
  } catch (error) {
    setStatus("Failed to load movies", "error");
    showError(error);
  }
}

async function loadAllUsers() {
  setStatus("Loading all users...", "warn");

  try {
    const data = await apiRequest(USER_BASE, "", "GET");
    renderUsers(data);
    setStatus("Loaded all users", "ok");
    showOutput(data);
  } catch (error) {
    setStatus("Failed to load users", "error");
    showError(error);
  }
}

async function reloadDashboard() {
  setStatus("Refreshing dashboard...", "warn");

  const results = await Promise.allSettled([loadAllUsers(), loadAllMovies()]);
  const hasFailure = results.some((result) => result.status === "rejected");

  if (!hasFailure) {
    setStatus("Dashboard refreshed", "ok");
  }
}

async function createBookingForMovie(movieId) {
  const userId = selectedUserId;
  if (!userId) {
    setStatus("먼저 사용자 목록에서 사용자를 선택하세요", "warn");
    return;
  }

  const payload = {
    userId,
    movieId: String(movieId),
    bookingDate: toLocalDateTimeString(new Date())
  };

  setStatus("Creating booking...", "warn");

  try {
    const data = await apiRequest(BOOKING_BASE, "", "POST", payload);
    setStatus("Booking created (201)", "ok");
    showOutput(data);
    await loadAllBookings();
  } catch (error) {
    setStatus("Failed to create booking", "error");
    showError(error);
  }
}

async function loadAllBookings() {
  setStatus("Loading all bookings...", "warn");

  try {
    const data = await apiRequest(BOOKING_BASE, "", "GET");
    renderBookings(data);
    setStatus("Loaded all bookings", "ok");
    showOutput(data);
  } catch (error) {
    setStatus("Failed to load bookings", "error");
    showError(error);
  }
}

el.createMovieForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Creating movie...", "warn");

  try {
    const payload = toObject(el.createMovieForm);
    payload.price = toNumber(payload.price);
    payload.openDate = normalizeDateTimeInput(payload.openDate);
    const data = await apiRequest(MOVIE_BASE, "", "POST", payload);
    setStatus("Movie created (201)", "ok");
    showOutput(data);
    el.createMovieForm.reset();
    await loadAllMovies();
  } catch (error) {
    setStatus("Failed to create movie", "error");
    showError(error);
  }
});

el.getMovieForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const dataObject = toObject(el.getMovieForm);
  const movieId = dataObject.movieId;

  if (!movieId) {
    setStatus("Movie ID is required", "warn");
    return;
  }

  setStatus("Loading movie...", "warn");

  try {
    const data = await apiRequest(MOVIE_BASE, `/${encodeURIComponent(movieId)}`, "GET");
    setStatus("Loaded movie", "ok");
    showOutput(data);
  } catch (error) {
    setStatus("Failed to load movie", "error");
    showError(error);
  }
});

el.updateMovieForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = toObject(el.updateMovieForm);
  const movieId = payload.targetMovieId;
  if (!movieId) {
    setStatus("Target Movie ID is required", "warn");
    return;
  }

  delete payload.targetMovieId;
  payload.price = toNumber(payload.price);
  payload.openDate = normalizeDateTimeInput(payload.openDate);

  setStatus("Updating movie...", "warn");

  try {
    const data = await apiRequest(MOVIE_BASE, `/${encodeURIComponent(movieId)}`, "PUT", payload);
    setStatus("Updated movie", "ok");
    showOutput(data);
    await loadAllMovies();
  } catch (error) {
    setStatus("Failed to update movie", "error");
    showError(error);
  }
});

el.deleteMovieForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toObject(el.deleteMovieForm);
  const movieId = payload.movieId;

  if (!movieId) {
    setStatus("Movie ID is required", "warn");
    return;
  }

  setStatus("Deleting movie...", "warn");

  try {
    await apiRequest(MOVIE_BASE, `/${encodeURIComponent(movieId)}`, "DELETE");
    setStatus("Deleted movie", "ok");
    showOutput({ message: `Deleted movie '${movieId}'` });
    el.deleteMovieForm.reset();
    await loadAllMovies();
  } catch (error) {
    setStatus("Failed to delete movie", "error");
    showError(error);
  }
});

el.loadAllUsers.addEventListener("click", async () => {
  await loadAllUsers();
});

el.loadAllMovies.addEventListener("click", async () => {
  await loadAllMovies();
});

el.reloadDashboard.addEventListener("click", async () => {
  await reloadDashboard();
});

el.loadAllBookings.addEventListener("click", async () => {
  await loadAllBookings();
});

el.movieTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.dataset.action !== "book") {
    return;
  }

  const movieId = target.dataset.movieId;
  if (!movieId) {
    setStatus("Cannot book without movie ID", "warn");
    return;
  }

  await createBookingForMovie(movieId);
});

el.userTableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.dataset.action !== "select-user") {
    return;
  }

  selectedUserId = target.dataset.userId || "";
  el.selectedUser.textContent = selectedUserId
    ? `선택된 사용자: ${selectedUserId}`
    : "선택된 사용자 없음";
  renderUsers(lastUsers);
});

window.addEventListener("error", (event) => {
  setStatus("Runtime error", "error");
  showError({
    type: "runtime-error",
    message: event.message,
    file: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener("unhandledrejection", (event) => {
  setStatus("Unhandled promise rejection", "error");
  showError({
    type: "unhandled-promise",
    reason: formatUnknownError(event.reason)
  });
});

showOutput({ message: "Ready. Select a user, then book a movie from the list." });
reloadDashboard();
