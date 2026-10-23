// ============================================
// api.js — Shared API helper for all pages
// ============================================

const BASE_URL = "https://campusready-qa1p.onrender.com/api";

// ── Token helpers ──────────────────────────
function getToken() {
  return localStorage.getItem("token");
}
function saveToken(token) {
  localStorage.setItem("token", token);
}
function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("userType");
  localStorage.removeItem("userName");
  localStorage.removeItem("studentName");
  localStorage.removeItem("companyName");
}

// ── Page guard: only the right kind of user may open a page ──
function requireRole(role, loginPage) {
  if (!getToken() || localStorage.getItem("userType") !== role) {
    alert("Please login first!");
    window.location.href = loginPage;
    return false;
  }
  return true;
}

// ── Escape text before putting it inside HTML ──
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Core fetch wrapper ─────────────────────
async function apiCall(endpoint, method = "GET", body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (!token) {
      alert("Session expired. Please login again.");
      window.location.href = "index.html";
      return;
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, options);
  } catch (networkErr) {
    throw new Error("Cannot reach server. Make sure Flask is running on port 5000.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseErr) {
    data = {};
  }

  // Expired/invalid token on a protected call -> back to home.
  // A 401 from a login form (wrong password) is shown on the form instead.
  if (response.status === 401 && auth) {
    clearToken();
    alert(data.error || "Session expired. Please login again.");
    window.location.href = "index.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// ── Student APIs ───────────────────────────
const StudentAPI = {
  register : (data)    => apiCall("/student/register", "POST", data),
  login    : (data)    => apiCall("/student/login",    "POST", data),
  dashboard: ()        => apiCall("/student/dashboard", "GET", null, true),
  all      : (filters) => apiCall(`/student/all?${new URLSearchParams(filters)}`, "GET", null, true),
};

// ── Company APIs ───────────────────────────
const CompanyAPI = {
  register       : (data)       => apiCall("/company/register",           "POST",   data, false),
  login          : (data)       => apiCall("/company/login",              "POST",   data, false),
  shortlist      : (student_id) => apiCall("/company/shortlist",          "POST",   { student_id }, true),
  removeShortlist: (student_id) => apiCall(`/company/shortlist/${student_id}`, "DELETE", null, true),
  shortlisted    : ()           => apiCall("/company/shortlisted",        "GET",    null, true),
};

// ── Quiz APIs ──────────────────────────────
const QuizAPI = {
  questions: (topic)          => apiCall(`/quiz/questions?topic=${topic}`, "GET",  null,           true),
  submit   : (topic, answers) => apiCall("/quiz/submit",                   "POST", { topic, answers }, true),
};

// ── Admin APIs ─────────────────────────────
const AdminAPI = {
  login        : (data) => apiCall("/admin/login",              "POST",   data,  false),
  stats        : ()     => apiCall("/admin/stats",              "GET",    null,  true),
  students     : ()     => apiCall("/admin/students",           "GET",    null,  true),
  companies    : ()     => apiCall("/admin/companies",          "GET",    null,  true),
  questions    : (topic)=> apiCall(`/admin/questions?topic=${topic}`, "GET", null, true),
  allQuestions : ()     => apiCall("/admin/questions",          "GET",    null,  true),
  deleteStudent: (id)   => apiCall(`/admin/student/${id}`,     "DELETE", null,  true),
  deleteCompany: (id)   => apiCall(`/admin/company/${id}`,     "DELETE", null,  true),
  updateStudent: (id, d)=> apiCall(`/admin/student/${id}`,     "PUT",    d,     true),
  addQuestion  : (data) => apiCall("/admin/question",          "POST",   data,  true),
  deleteQuestion:(id)   => apiCall(`/admin/question/${id}`,    "DELETE", null,  true),
};
