import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ============================================================================
// 1. CONFIGURATION & FULL-STACK BACKEND INITIALIZATION
// ============================================================================
const FIREBASE_CONFIG = typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : null;
const APP_ID = typeof __app_id !== "undefined" ? __app_id : "unipulse-campus-portal";
const GEMINI_API_KEY = ""; // Optional: Add your Gemini API key for live LLM answers

let firebaseApp = null;
let auth = null;
let db = null;
let useCloudBackend = false;

if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    useCloudBackend = true;
  } catch (err) {
    console.warn("Firebase initialization fell back to local storage mode:", err);
  }
}

// ============================================================================
// 2. APPLICATION STATE & SEED CAMPUS DATA
// ============================================================================
const STORAGE_KEYS = {
  USER: "unipulse_current_user",
  USERS_DB: "unipulse_users_directory",
  POSTS: "unipulse_campus_posts",
  NOTIFS: "unipulse_notifications"
};

const now = Date.now();
const hoursFromNow = (h) => new Date(now + h * 3600 * 1000).toISOString().slice(0, 16);

const SEED_USERS = [
  {
    uid: "usr-student-1",
    name: "Nithish S",
    email: "nithish.cs24@college.edu",
    password: "password123",
    role: "student",
    department: "CSE",
    code: "1BY24CS042",
    verified: true,
    savedEvents: ["evt-1", "evt-3"],
    registeredEvents: ["evt-1"]
  },
  {
    uid: "usr-faculty-1",
    name: "Dr. Ananya Rao",
    email: "ananya.rao@college.edu",
    password: "password123",
    role: "faculty",
    department: "CSE",
    code: "FAC-CSE-108",
    verified: true,
    savedEvents: [],
    registeredEvents: []
  },
  {
    uid: "usr-admin-1",
    name: "Prof. Vikram Hegde (Dean Office)",
    email: "admin.dean@college.edu",
    password: "password123",
    role: "admin",
    department: "Administration",
    code: "ADM-001",
    verified: true,
    savedEvents: [],
    registeredEvents: []
  },
  {
    uid: "usr-student-2",
    name: "Riya Sharma",
    email: "riya.ece25@college.edu",
    password: "password123",
    role: "student",
    department: "ECE",
    code: "1BY25EC019",
    verified: false,
    savedEvents: [],
    registeredEvents: []
  }
];

const SEED_POSTS = [
  {
    id: "evt-1",
    title: "HackBMS 2026: 36-Hour National AI & Cloud Hackathon",
    category: "Technical & Hackathons",
    organizer: "Dept. of CSE & IEEE Student Branch",
    date: hoursFromNow(96),
    deadline: hoursFromNow(28),
    venue: "APJ Abdul Kalam Auditorium, Block A",
    description:
      "Build production-ready AI, FinTech, or Sustainability prototypes in teams of 2–4. Prize pool worth ₹1,50,000 plus direct fast-track internship interviews for top 5 teams. Dinner, midnight snacks, and high-speed Wi-Fi provided.",
    posterUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
    regLink: "https://unipulse.edu/hackbms-rules",
    pdfName: "HackBMS_2026_Rulebook.pdf",
    pdfData: "",
    authorId: "usr-faculty-1",
    authorName: "Dr. Ananya Rao",
    registrations: ["usr-student-1", "usr-student-2"],
    pinned: true,
    createdAt: now - 86400000 * 2
  },
  {
    id: "evt-2",
    title: "Google Cloud & Generative AI Hands-On Bootcamp",
    category: "Workshops & Seminars",
    organizer: "Google Developer Groups on Campus",
    date: hoursFromNow(72),
    deadline: hoursFromNow(18),
    venue: "Seminar Hall 2, Academic Block C",
    description:
      "Learn Gemini API integration, vector embeddings, and serverless deployment on Cloud Run. Bring your laptops with Node.js/Python pre-installed. Official completion badges will be issued to all attendees.",
    posterUrl:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
    regLink: "",
    pdfName: "Cloud_Lab_Prerequisites.pdf",
    pdfData: "",
    authorId: "usr-faculty-1",
    authorName: "Dr. Ananya Rao",
    registrations: ["usr-student-2"],
    pinned: false,
    createdAt: now - 86400000 * 1.5
  },
  {
    id: "evt-3",
    title: "Summer 2027 SDE Internship Drive — Atlassian & Razorpay",
    category: "Internships & Placements",
    organizer: "Training & Placement Cell",
    date: hoursFromNow(140),
    deadline: hoursFromNow(40),
    venue: "Placement Block & Online Assessment Portal",
    description:
      "Eligible branches: CSE, ISE, ECE (CGPA >= 7.5, zero active backlogs). Stipend: ₹65,000–₹90,000/month with PPO opportunity. Upload your updated single-page PDF resume before the cutoff.",
    posterUrl:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
    regLink: "https://placements.college.edu/apply",
    pdfName: "Placement_Eligibility_Circular.pdf",
    pdfData: "",
    authorId: "usr-faculty-1",
    authorName: "Dr. Ananya Rao",
    registrations: ["usr-student-1"],
    pinned: true,
    createdAt: now - 86400000
  },
  {
    id: "evt-4",
    title: "Utsav 2026: Inter-Collegiate Cultural & Music Fest",
    category: "Competitions & Fests",
    organizer: "Student Cultural Council",
    date: hoursFromNow(210),
    deadline: hoursFromNow(120),
    venue: "Open Air Amphitheatre & Main Quad",
    description:
      "Registrations open for Battle of Bands, Street Dance, Photography Walk, and Stand-Up Comedy. Auditions begin this Friday at 4:00 PM in the Student Activity Center.",
    posterUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80",
    regLink: "",
    pdfName: "",
    pdfData: "",
    authorId: "usr-faculty-1",
    authorName: "Dr. Ananya Rao",
    registrations: [],
    pinned: false,
    createdAt: now - 3600000 * 18
  },
  {
    id: "evt-5",
    title: "Inter-Department Football & Basketball Championship Trials",
    category: "Sports & Cultural",
    organizer: "Department of Physical Education",
    date: hoursFromNow(60),
    deadline: hoursFromNow(36),
    venue: "University Sports Complex Ground 1",
    description:
      "Selection trials for the Men's and Women's Varsity teams representing the college at the State University Tournament. Carry your college ID card and sports kit.",
    posterUrl:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80",
    regLink: "",
    pdfName: "",
    pdfData: "",
    authorId: "usr-faculty-1",
    authorName: "Dr. Ananya Rao",
    registrations: [],
    pinned: false,
    createdAt: now - 3600000 * 10
  },
  {
    id: "evt-6",
    title: "CIE-2 Examination Timetable & Hall Ticket Verification Notice",
    category: "Academic Notices",
    organizer: "Office of Controller of Examinations",
    date: hoursFromNow(168),
    deadline: hoursFromNow(65),
    venue: "All Engineering Blocks (3rd & 5th Semester)",
    description:
      "Internal Assessment Test-2 commences next Monday. Students must verify their registered elective subjects and clear any attendance shortages before downloading hall tickets.",
    posterUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
    regLink: "",
    pdfName: "CIE2_Exam_Schedule_2026.pdf",
    pdfData: "",
    authorId: "usr-admin-1",
    authorName: "Prof. Vikram Hegde",
    registrations: [],
    pinned: false,
    createdAt: now - 3600000 * 5
  }
];

let state = {
  currentUser: null,
  authSelectedRole: "student",
  authIsRegisterMode: false,
  activeView: "feed",
  selectedCategory: "ALL",
  searchQuery: "",
  sortBy: "newest",
  posts: [],
  usersDirectory: [],
  notifications: [],
  activeModalPostId: null,
  uploadedPosterBase64: "",
  uploadedPdfBase64: "",
  uploadedPdfName: ""
};

// ============================================================================
// 3. DATA PERSISTENCE & REAL-TIME SYNC LAYER
// ============================================================================
function loadLocalData() {
  const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB));
  state.usersDirectory = storedUsers && storedUsers.length ? storedUsers : SEED_USERS;

  // Ensure existing stored users have a password field
  state.usersDirectory.forEach((u) => {
    if (!u.password) u.password = "password123";
  });
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(state.usersDirectory));

  const storedPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS));
  state.posts = storedPosts && storedPosts.length ? storedPosts : SEED_POSTS;
  if (!storedPosts) localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(state.posts));

  const storedNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS));
  if (storedNotifs) {
    state.notifications = storedNotifs;
  } else {
    state.notifications = [
      {
        id: "notif-1",
        title: "HackBMS 2026 closing in 28 hours!",
        body: "Complete your team registration before cutoffs close.",
        time: "15 mins ago",
        read: false
      },
      {
        id: "notif-2",
        title: "New Placement Drive Published",
        body: "Summer 2027 SDE Internship Drive added by Training & Placement Cell.",
        time: "2 hours ago",
        read: false
      }
    ];
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(state.notifications));
  }

  const savedSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
  if (savedSession) {
    const freshUser = state.usersDirectory.find((u) => u.email === savedSession.email) || savedSession;
    state.currentUser = freshUser;
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(state.usersDirectory));
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(state.posts));
  localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(state.notifications));
  if (state.currentUser) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.currentUser));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

async function initCloudSync() {
  if (!useCloudBackend || !auth || !db) return;
  try {
    if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const postsCol = collection(db, "artifacts", APP_ID, "public", "data", "campus_posts");
    onSnapshot(
      postsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          state.posts = cloudPosts;
          persistLocalState();
          if (state.currentUser) renderAllViews();
        } else {
          SEED_POSTS.forEach(async (post) => {
            await setDoc(doc(postsCol, post.id), post);
          });
        }
      },
      (err) => console.warn("Cloud listener notice:", err)
    );
  } catch (e) {
    console.warn("Running in resilient local-first mode:", e);
  }
}

// ============================================================================
// 4. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================
window.switchAuthRole = function (role) {
  state.authSelectedRole = role;
  document.querySelectorAll(".auth-role-tab").forEach((btn) => {
    btn.classList.remove("bg-white", "text-indigo-600", "shadow-sm");
    btn.classList.add("text-slate-600");
  });
  const activeTab = document.getElementById(`tab-${role}`);
  activeTab.classList.add("bg-white", "text-indigo-600", "shadow-sm");
  activeTab.classList.remove("text-slate-600");

  const badge = document.getElementById("auth-role-badge");
  const heading = document.getElementById("auth-heading");
  const subtext = document.getElementById("auth-subtext");
  const emailInput = document.getElementById("auth-email");
  const idLabel = document.getElementById("auth-id-label");

  if (role === "student") {
    badge.textContent = "Student Portal";
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2";
    heading.textContent = state.authIsRegisterMode ? "Create Student Account" : "Welcome back, Scholar";
    subtext.innerHTML = 'Authenticate with your institutional student email (e.g., <code class="text-indigo-600 font-medium">@college.edu</code>).';
    emailInput.placeholder = "student@college.edu";
    if (idLabel) idLabel.textContent = "USN / Roll No.";
  } else if (role === "faculty") {
    badge.textContent = "Faculty & Coordinator Portal";
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mb-2";
    heading.textContent = state.authIsRegisterMode ? "Register Faculty Account" : "Faculty Publisher Sign In";
    subtext.innerHTML = 'Publish official circulars, hackathons, and placement drives using your <code class="text-emerald-600 font-medium">@college.edu</code> ID.';
    emailInput.placeholder = "professor@college.edu";
    if (idLabel) idLabel.textContent = "Employee ID";
  } else {
    badge.textContent = "Campus Administrator";
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 mb-2";
    heading.textContent = "Admin Governance Login";
    subtext.textContent = "Manage institutional verification, faculty roles, and campus-wide announcements.";
    emailInput.placeholder = "admin.dean@college.edu";
    if (idLabel) idLabel.textContent = "Admin Code";
  }
};

window.toggleAuthMode = function () {
  state.authIsRegisterMode = !state.authIsRegisterMode;
  const regFields = document.getElementById("register-fields");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-mode-toggle");

  if (state.authIsRegisterMode) {
    regFields.classList.remove("hidden");
    submitBtn.querySelector("span").textContent = "Create Verified Account";
    toggleBtn.textContent = "Already have an institutional account? Sign in";
  } else {
    regFields.classList.add("hidden");
    submitBtn.querySelector("span").textContent = "Sign In to Portal";
    toggleBtn.textContent = "New to UniPulse? Register with college email";
  }
  switchAuthRole(state.authSelectedRole);
};

function isInstitutionalEmail(email) {
  return /^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in|org)$/i.test(email.trim());
}

window.handleAuthSubmit = function (event) {
  event.preventDefault();
  const errorBox = document.getElementById("auth-error");
  errorBox.classList.add("hidden");

  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  const password = document.getElementById("auth-password").value;

  if (!isInstitutionalEmail(email)) {
    errorBox.textContent = "Please use an official college email domain (e.g., name@college.edu or name@bmsit.ac.in).";
    errorBox.classList.remove("hidden");
    return;
  }

  if (password.length < 6) {
    errorBox.textContent = "Password must be at least 6 characters long.";
    errorBox.classList.remove("hidden");
    return;
  }

  if (state.authIsRegisterMode) {
    const name = document.getElementById("auth-name").value.trim();
    const dept = document.getElementById("auth-dept").value;
    const code = document.getElementById("auth-id-code").value.trim() || "CAMPUS-2026";

    if (!name) {
      errorBox.textContent = "Please enter your full name.";
      errorBox.classList.remove("hidden");
      return;
    }

    const exists = state.usersDirectory.find((u) => u.email === email);
    if (exists) {
      errorBox.textContent = "An account with this college email already exists. Please sign in.";
      errorBox.classList.remove("hidden");
      return;
    }

    const newUser = {
      uid: "usr-" + Date.now(),
      name,
      email,
      password,
      role: state.authSelectedRole,
      department: dept,
      code,
      verified: state.authSelectedRole === "student",
      savedEvents: [],
      registeredEvents: []
    };

    state.usersDirectory.push(newUser);
    state.currentUser = newUser;
    persistLocalState();
    enterAppShell();
    showToast(`Welcome to UniPulse, ${newUser.name}!`, "success");
  } else {
    const user = state.usersDirectory.find((u) => u.email === email);

    if (!user) {
      errorBox.textContent = "No account found for this college email. Please register first.";
      errorBox.classList.remove("hidden");
      return;
    }

    if (user.role !== state.authSelectedRole) {
      errorBox.textContent = `This email is registered under the "${user.role.toUpperCase()}" role. Please switch to the ${user.role} tab above.`;
      errorBox.classList.remove("hidden");
      return;
    }

    if (user.password !== password) {
      errorBox.textContent = "Incorrect password. Please try again.";
      errorBox.classList.remove("hidden");
      return;
    }

    state.currentUser = user;
    persistLocalState();
    enterAppShell();
    showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`, "success");
  }
};

window.quickDemoLogin = function (role) {
  const demoUser = state.usersDirectory.find((u) => u.role === role) || SEED_USERS[0];
  switchAuthRole(role);
  if (state.authIsRegisterMode) toggleAuthMode();

  document.getElementById("auth-email").value = demoUser.email;
  document.getElementById("auth-password").value = "";
  document.getElementById("auth-password").focus();
  showToast(`Filled ${demoUser.email}. Enter password to sign in.`, "info");
};

window.handleLogout = function () {
  state.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.USER);

  const authForm = document.getElementById("auth-form");
  if (authForm) authForm.reset();
  document.getElementById("auth-email").value = "";
  document.getElementById("auth-password").value = "";
  document.getElementById("auth-error").classList.add("hidden");

  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("auth-view").classList.remove("hidden");
  showToast("Signed out safely. Password required to sign back in.", "info");
};

function enterAppShell() {
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");

  const user = state.currentUser;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  document.getElementById("user-avatar").textContent = initials;
  document.getElementById("user-display-name").textContent = user.name;
  document.getElementById("user-display-email").textContent = user.email;
  document.getElementById("welcome-banner-title").textContent = `Welcome back, ${user.name.split(" ")[0]}!`;

  const rolePill = document.getElementById("sidebar-role-pill");
  rolePill.textContent = user.role;

  const facultySection = document.getElementById("faculty-nav-section");
  const adminSection = document.getElementById("admin-nav-section");
  const headerPubBtn = document.getElementById("header-publish-btn");

  facultySection.classList.add("hidden");
  adminSection.classList.add("hidden");
  headerPubBtn.classList.add("hidden");

  if (user.role === "faculty" || user.role === "admin") {
    facultySection.classList.remove("hidden");
    headerPubBtn.classList.remove("hidden");
    headerPubBtn.classList.add("inline-flex");
  }
  if (user.role === "admin") {
    adminSection.classList.remove("hidden");
  }

  navigateTo("feed");
  renderAllViews();
  lucide.createIcons();
}

// ============================================================================
// 5. NAVIGATION & RESPONSIVE SIDEBAR
// ============================================================================
window.navigateTo = function (viewName) {
  if (viewName === "faculty-studio" && state.currentUser.role === "student") {
    showToast("Access Denied: Only authorized Faculty or Admins can publish listings.", "error");
    return;
  }
  if (viewName === "admin-panel" && state.currentUser.role !== "admin") {
    showToast("Access Denied: Administrator privileges required.", "error");
    return;
  }

  state.activeView = viewName;
  const views = ["feed", "my-registrations", "saved", "deadlines", "faculty-studio", "admin-panel"];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add("hidden");
  });

  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) activeEl.classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach((btn) => {
    if (btn.dataset.nav === viewName) {
      btn.classList.add("bg-indigo-50", "text-indigo-700", "font-semibold");
      btn.classList.remove("text-slate-600", "font-medium");
    } else {
      btn.classList.remove("bg-indigo-50", "text-indigo-700", "font-semibold");
      btn.classList.add("text-slate-600", "font-medium");
    }
  });

  toggleMobileSidebar(false);
  renderAllViews();
};

window.toggleMobileSidebar = function (open) {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (open) {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
  } else {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
  }
};

// ============================================================================
// 6. SEARCH, CATEGORY FILTERING & SORTING
// ============================================================================
window.setCategoryFilter = function (category) {
  state.selectedCategory = category;
  document.querySelectorAll(".cat-pill").forEach((pill) => {
    if (pill.dataset.cat === category) {
      pill.classList.add("bg-slate-900", "text-white", "shadow-sm");
      pill.classList.remove("bg-white", "text-slate-600", "border", "border-slate-200");
    } else {
      pill.classList.remove("bg-slate-900", "text-white", "shadow-sm");
      pill.classList.add("bg-white", "text-slate-600", "border", "border-slate-200");
    }
  });
  renderEventsFeed();
};

window.handleSearchFilter = function () {
  state.searchQuery = document.getElementById("global-search").value.trim().toLowerCase();
  state.sortBy = document.getElementById("sort-select").value;
  renderEventsFeed();
};

function getFilteredPosts() {
  let list = [...state.posts];

  if (state.selectedCategory !== "ALL") {
    list = list.filter((p) => p.category === state.selectedCategory);
  }

  if (state.searchQuery) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(state.searchQuery) ||
        p.description.toLowerCase().includes(state.searchQuery) ||
        p.organizer.toLowerCase().includes(state.searchQuery) ||
        p.venue.toLowerCase().includes(state.searchQuery) ||
        p.category.toLowerCase().includes(state.searchQuery)
    );
  }

  list.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (state.sortBy === "deadline") {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (state.sortBy === "popular") {
      return (b.registrations?.length || 0) - (a.registrations?.length || 0);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return list;
}

// ============================================================================
// 7. RENDERING ENGINE (CARDS, DEADLINES, REGISTRATIONS, FACULTY, ADMIN)
// ============================================================================
function formatReadableDate(isoStr) {
  if (!isoStr) return "TBA";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDeadlineMeta(deadlineStr) {
  const diffMs = new Date(deadlineStr) - Date.now();
  const diffHrs = Math.round(diffMs / 3600000);
  if (diffHrs < 0) return { label: "Closed", urgent: false, closed: true, badgeClass: "bg-slate-200 text-slate-600" };
  if (diffHrs <= 48) return { label: `Closes in ${diffHrs}h`, urgent: true, closed: false, badgeClass: "bg-amber-500 text-white" };
  const days = Math.ceil(diffHrs / 24);
  return { label: `${days}d left`, urgent: false, closed: false, badgeClass: "bg-emerald-600 text-white" };
}

function getCategoryBadgeColor(cat) {
  const map = {
    "Technical & Hackathons": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Workshops & Seminars": "bg-cyan-50 text-cyan-700 border-cyan-100",
    "Internships & Placements": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Sports & Cultural": "bg-orange-50 text-orange-700 border-orange-100",
    "Competitions & Fests": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
    "Academic Notices": "bg-amber-50 text-amber-800 border-amber-200"
  };
  return map[cat] || "bg-slate-100 text-slate-700 border-slate-200";
}

function buildEventCardHTML(post) {
  const user = state.currentUser;
  const isSaved = user.savedEvents?.includes(post.id);
  const isRegistered = post.registrations?.includes(user.uid) || user.registeredEvents?.includes(post.id);
  const deadlineMeta = getDeadlineMeta(post.deadline);
  const catStyle = getCategoryBadgeColor(post.category);

  return `
    <article class="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-200/80 transition-all duration-300 flex flex-col justify-between animate-fade-in">
      <div>
        <!-- Poster Header -->
        <div class="relative h-44 bg-slate-900 overflow-hidden cursor-pointer" onclick="openEventModal('${post.id}')">
          <img src="${post.posterUrl || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80"}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"></div>

          <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${deadlineMeta.badgeClass}">
              ${deadlineMeta.label}
            </span>
            <button onclick="event.stopPropagation(); toggleBookmark('${post.id}')" class="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-sm transition" title="${isSaved ? "Remove Bookmark" : "Save Event"}">
              <i data-lucide="bookmark" class="w-4 h-4 ${isSaved ? "fill-indigo-600 text-indigo-600" : ""}"></i>
            </button>
          </div>

          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90 text-[11px]">
            <span class="font-medium truncate">${post.organizer}</span>
            ${post.pinned ? '<span class="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold uppercase text-[10px]">Pinned</span>' : ""}
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5">
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <span class="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${catStyle}">
              ${post.category}
            </span>
            <span class="text-[11px] text-slate-400 font-medium">${post.registrations?.length || 0} registered</span>
          </div>

          <h3 onclick="openEventModal('${post.id}')" class="font-display font-bold text-base text-slate-900 group-hover:text-indigo-600 transition cursor-pointer line-clamp-2 mb-2">
            ${post.title}
          </h3>

          <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            ${post.description}
          </p>

          <div class="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i>
              <span class="truncate">${formatReadableDate(post.date)}</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 shrink-0"></i>
              <span class="truncate">${post.venue}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <button onclick="openEventModal('${post.id}')" class="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition">
          Details & Circular
        </button>

        <button onclick="toggleEventRegistration('${post.id}')" ${deadlineMeta.closed && !isRegistered ? "disabled" : ""} class="px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
          isRegistered
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            : deadlineMeta.closed
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
        }">
          <i data-lucide="${isRegistered ? "check-circle-2" : "plus-circle"}" class="w-3.5 h-3.5"></i>
          <span>${isRegistered ? "Registered" : deadlineMeta.closed ? "Closed" : "Register"}</span>
        </button>
      </div>
    </article>
  `;
}

function renderEventsFeed() {
  const grid = document.getElementById("events-grid");
  const filtered = getFilteredPosts();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <i data-lucide="search-x" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
        <h3 class="font-display font-bold text-lg text-slate-800">No matching campus updates found</h3>
        <p class="text-xs text-slate-500 mt-1">Try clearing your search filter or switching to "All Updates".</p>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(buildEventCardHTML).join("");
  }
  lucide.createIcons();
}

function renderRegistrationsAndSaved() {
  const user = state.currentUser;
  const regPosts = state.posts.filter((p) => p.registrations?.includes(user.uid) || user.registeredEvents?.includes(p.id));
  const savedPosts = state.posts.filter((p) => user.savedEvents?.includes(p.id));

  const regGrid = document.getElementById("registrations-grid");
  regGrid.innerHTML = regPosts.length
    ? regPosts.map(buildEventCardHTML).join("")
    : `<div class="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">You haven't registered for any events yet. Explore the Campus Feed to join hackathons, workshops, and drives!</div>`;

  const savedGrid = document.getElementById("saved-grid");
  savedGrid.innerHTML = savedPosts.length
    ? savedPosts.map(buildEventCardHTML).join("")
    : `<div class="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">No bookmarked items yet. Click the bookmark icon on any event card to save it here.</div>`;
}

function renderDeadlinesRadar() {
  const container = document.getElementById("deadlines-list");
  const sorted = [...state.posts].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  container.innerHTML = sorted
    .map((post) => {
      const meta = getDeadlineMeta(post.deadline);
      return `
        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div class="flex items-start gap-4">
            <div class="px-3 py-2 rounded-xl text-center shrink-0 ${meta.urgent ? "bg-amber-100 text-amber-800" : "bg-indigo-50 text-indigo-700"}">
              <span class="block text-xs font-extrabold uppercase">${meta.label}</span>
            </div>
            <div>
              <span class="text-[11px] font-semibold text-indigo-600">${post.category}</span>
              <h3 class="font-display font-bold text-base text-slate-900">${post.title}</h3>
              <p class="text-xs text-slate-500 mt-0.5">Cutoff: <strong>${formatReadableDate(post.deadline)}</strong> • Venue: ${post.venue}</p>
            </div>
          </div>
          <button onclick="openEventModal('${post.id}')" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition shrink-0">
            Open Details
          </button>
        </div>
      `;
    })
    .join("");
}

function renderFacultyManagedList() {
  const container = document.getElementById("faculty-managed-list");
  if (!container) return;

  container.innerHTML = state.posts
    .map(
      (post) => `
      <div class="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-bold text-slate-900 truncate">${post.title}</p>
          <p class="text-[11px] text-slate-500">${post.category} • ${post.registrations?.length || 0} regs</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="editAnnouncement('${post.id}')" class="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600" title="Edit">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteAnnouncement('${post.id}')" class="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-rose-300 text-rose-600" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderAdminPanel() {
  const tbody = document.getElementById("admin-users-tbody");
  const postsList = document.getElementById("admin-posts-list");
  if (!tbody || !postsList) return;

  document.getElementById("admin-stat-users").textContent = state.usersDirectory.length;
  document.getElementById("admin-stat-faculty").textContent = state.usersDirectory.filter((u) => u.role === "faculty").length;
  document.getElementById("admin-stat-posts").textContent = state.posts.length;

  tbody.innerHTML = state.usersDirectory
    .map(
      (u) => `
      <tr class="hover:bg-slate-50/80">
        <td class="py-3.5 px-6">
          <p class="font-semibold text-slate-900">${u.name}</p>
          <p class="text-xs text-slate-500">${u.email}</p>
        </td>
        <td class="py-3.5 px-4 text-xs font-medium text-slate-600">${u.department || "General"}</td>
        <td class="py-3.5 px-4">
          <select onchange="adminChangeUserRole('${u.uid}', this.value)" class="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white">
            <option value="student" ${u.role === "student" ? "selected" : ""}>Student</option>
            <option value="faculty" ${u.role === "faculty" ? "selected" : ""}>Faculty</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${u.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}">
            ${u.verified ? "Verified" : "Pending"}
          </span>
        </td>
        <td class="py-3.5 px-6 text-right">
          <button onclick="adminToggleVerify('${u.uid}')" class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-semibold transition">
            ${u.verified ? "Revoke" : "Verify Email"}
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  postsList.innerHTML = state.posts
    .map(
      (p) => `
      <div class="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-indigo-600">${p.category}</span>
            ${p.pinned ? '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">PINNED</span>' : ""}
          </div>
          <p class="font-bold text-sm text-slate-900">${p.title}</p>
          <p class="text-xs text-slate-500">Published by ${p.authorName || p.organizer}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="adminTogglePin('${p.id}')" class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50">
            ${p.pinned ? "Unpin" : "Pin Top"}
          </button>
          <button onclick="deleteAnnouncement('${p.id}')" class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
            Remove
          </button>
        </div>
      </div>
    `
    )
    .join("");
}

function updateStatsAndBadges() {
  const user = state.currentUser;
  if (!user) return;

  const myRegs = state.posts.filter((p) => p.registrations?.includes(user.uid) || user.registeredEvents?.includes(p.id)).length;
  const urgentPosts = state.posts.filter((p) => getDeadlineMeta(p.deadline).urgent);

  document.getElementById("stat-total-events").textContent = state.posts.length;
  document.getElementById("stat-my-regs").textContent = myRegs;
  document.getElementById("stat-urgent").textContent = urgentPosts.length;

  document.getElementById("nav-feed-count").textContent = state.posts.length;
  document.getElementById("nav-reg-count").textContent = myRegs;
  document.getElementById("nav-saved-count").textContent = user.savedEvents?.length || 0;
  document.getElementById("nav-urgent-count").textContent = urgentPosts.length;

  const urgentBanner = document.getElementById("urgent-reminder-banner");
  if (urgentPosts.length > 0) {
    urgentBanner.classList.remove("hidden");
    document.getElementById("urgent-reminder-text").textContent = `${urgentPosts.length} campus opportunity/notice (${urgentPosts[0].title}) closes within 48 hours.`;
  } else {
    urgentBanner.classList.add("hidden");
  }

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const notifBadge = document.getElementById("notif-badge");
  if (unreadCount > 0) {
    notifBadge.textContent = unreadCount;
    notifBadge.classList.remove("hidden");
  } else {
    notifBadge.classList.add("hidden");
  }

  const notifList = document.getElementById("notif-list");
  notifList.innerHTML = state.notifications
    .map(
      (n) => `
      <div class="p-3.5 ${n.read ? "bg-white" : "bg-indigo-50/50"}">
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs font-bold text-slate-900">${n.title}</p>
          <span class="text-[10px] text-slate-400 shrink-0">${n.time}</span>
        </div>
        <p class="text-xs text-slate-600 mt-1">${n.body}</p>
      </div>
    `
    )
    .join("");
}

function renderAllViews() {
  if (!state.currentUser) return;
  updateStatsAndBadges();
  renderEventsFeed();
  renderRegistrationsAndSaved();
  renderDeadlinesRadar();
  renderFacultyManagedList();
  renderAdminPanel();
  lucide.createIcons();
}

// ============================================================================
// 8. INTERACTIONS: REGISTRATION, BOOKMARKS, MODAL, NOTIFICATIONS
// ============================================================================
window.toggleEventRegistration = async function (postId) {
  const user = state.currentUser;
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  if (!post.registrations) post.registrations = [];
  if (!user.registeredEvents) user.registeredEvents = [];

  const alreadyReg = post.registrations.includes(user.uid);
  if (alreadyReg) {
    post.registrations = post.registrations.filter((id) => id !== user.uid);
    user.registeredEvents = user.registeredEvents.filter((id) => id !== postId);
    showToast(`Registration cancelled for "${post.title}"`, "info");
  } else {
    post.registrations.push(user.uid);
    if (!user.registeredEvents.includes(postId)) user.registeredEvents.push(postId);
    addNotification("Registration Confirmed!", `You are registered for ${post.title} (${formatReadableDate(post.date)}).`);
    showToast(`Successfully registered for "${post.title}"!`, "success");
  }

  const dirUser = state.usersDirectory.find((u) => u.uid === user.uid);
  if (dirUser) dirUser.registeredEvents = [...user.registeredEvents];

  persistLocalState();
  if (useCloudBackend && db) {
    try {
      await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "campus_posts", post.id), {
        registrations: post.registrations
      });
    } catch (e) {}
  }

  renderAllViews();
  if (state.activeModalPostId === postId) openEventModal(postId);
};

window.toggleBookmark = function (postId) {
  const user = state.currentUser;
  if (!user.savedEvents) user.savedEvents = [];

  if (user.savedEvents.includes(postId)) {
    user.savedEvents = user.savedEvents.filter((id) => id !== postId);
    showToast("Removed from saved bookmarks.", "info");
  } else {
    user.savedEvents.push(postId);
    showToast("Saved to your bookmarks!", "success");
  }

  const dirUser = state.usersDirectory.find((u) => u.uid === user.uid);
  if (dirUser) dirUser.savedEvents = [...user.savedEvents];

  persistLocalState();
  renderAllViews();
};

window.openEventModal = function (postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  state.activeModalPostId = postId;

  const user = state.currentUser;
  const isRegistered = post.registrations?.includes(user.uid) || user.registeredEvents?.includes(post.id);
  const meta = getDeadlineMeta(post.deadline);

  document.getElementById("modal-poster").src = post.posterUrl || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80";
  document.getElementById("modal-category").textContent = post.category;
  document.getElementById("modal-deadline-badge").textContent = `Deadline: ${formatReadableDate(post.deadline)}`;
  document.getElementById("modal-organizer").textContent = post.organizer;
  document.getElementById("modal-title").textContent = post.title;
  document.getElementById("modal-date").textContent = formatReadableDate(post.date);
  document.getElementById("modal-venue").textContent = post.venue;
  document.getElementById("modal-description").textContent = post.description;
  document.getElementById("modal-reg-count").textContent = post.registrations?.length || 0;

  const pdfBox = document.getElementById("modal-pdf-box");
  if (post.pdfName) {
    pdfBox.classList.remove("hidden");
    document.getElementById("modal-pdf-name").textContent = post.pdfName;
    const dlLink = document.getElementById("modal-pdf-download");
    if (post.pdfData) {
      dlLink.href = post.pdfData;
      dlLink.download = post.pdfName;
    } else {
      const blob = new Blob([`Official UniPulse Document: ${post.title}\nOrganizer: ${post.organizer}\n\n${post.description}`], { type: "text/plain" });
      dlLink.href = URL.createObjectURL(blob);
      dlLink.download = post.pdfName.replace(".pdf", ".txt");
    }
  } else {
    pdfBox.classList.add("hidden");
  }

  const extLink = document.getElementById("modal-ext-link");
  if (post.regLink) {
    extLink.href = post.regLink;
    extLink.classList.remove("hidden");
  } else {
    extLink.classList.add("hidden");
  }

  const regBtn = document.getElementById("modal-register-btn");
  if (isRegistered) {
    regBtn.className = "px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition flex items-center gap-2";
    regBtn.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4"></i><span>Registered (Click to Cancel)</span>';
  } else if (meta.closed) {
    regBtn.className = "px-5 py-2.5 rounded-xl bg-slate-300 text-slate-600 text-xs font-semibold cursor-not-allowed flex items-center gap-2";
    regBtn.innerHTML = '<span>Registrations Closed</span>';
  } else {
    regBtn.className = "px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2";
    regBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i><span>Confirm Instant Registration</span>';
  }

  document.getElementById("event-modal").classList.remove("hidden");
  lucide.createIcons();
};

window.closeEventModal = function () {
  state.activeModalPostId = null;
  document.getElementById("event-modal").classList.add("hidden");
};

window.toggleEventRegistrationFromModal = function () {
  if (state.activeModalPostId) {
    toggleEventRegistration(state.activeModalPostId);
  }
};

window.toggleNotifications = function () {
  document.getElementById("notif-dropdown").classList.toggle("hidden");
};

window.markAllNotificationsRead = function () {
  state.notifications.forEach((n) => (n.read = true));
  persistLocalState();
  updateStatsAndBadges();
};

function addNotification(title, body) {
  state.notifications.unshift({
    id: "notif-" + Date.now(),
    title,
    body,
    time: "Just now",
    read: false
  });
  persistLocalState();
  updateStatsAndBadges();
}

// ============================================================================
// 9. FACULTY CONTENT STUDIO (CREATE, UPLOAD POSTERS/PDFS, EDIT, DELETE)
// ============================================================================
window.handlePosterFileUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedPosterBase64 = e.target.result;
    document.getElementById("poster-preview-img").src = state.uploadedPosterBase64;
    showToast("Poster image attached!", "success");
  };
  reader.readAsDataURL(file);
};

window.updatePosterPreview = function () {
  const url = document.getElementById("post-poster-url").value.trim();
  if (url) {
    state.uploadedPosterBase64 = "";
    document.getElementById("poster-preview-img").src = url;
  }
};

window.handlePdfFileUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  state.uploadedPdfName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedPdfBase64 = e.target.result;
    document.getElementById("pdf-upload-status").textContent = `Attached: ${file.name}`;
    showToast(`Attached document: ${file.name}`, "success");
  };
  reader.readAsDataURL(file);
};

window.handleSaveAnnouncement = async function (event) {
  event.preventDefault();
  if (state.currentUser.role === "student") {
    showToast("Unauthorized action.", "error");
    return;
  }

  const editId = document.getElementById("edit-post-id").value;
  const title = document.getElementById("post-title").value.trim();
  const category = document.getElementById("post-category").value;
  const organizer = document.getElementById("post-organizer").value.trim();
  const date = document.getElementById("post-date").value;
  const deadline = document.getElementById("post-deadline").value;
  const venue = document.getElementById("post-venue").value.trim();
  const regLink = document.getElementById("post-reg-link").value.trim();
  const description = document.getElementById("post-description").value.trim();
  const posterUrlInput = document.getElementById("post-poster-url").value.trim();

  const finalPoster =
    state.uploadedPosterBase64 ||
    posterUrlInput ||
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80";

  if (editId) {
    const idx = state.posts.findIndex((p) => p.id === editId);
    if (idx !== -1) {
      state.posts[idx] = {
        ...state.posts[idx],
        title,
        category,
        organizer,
        date,
        deadline,
        venue,
        regLink,
        description,
        posterUrl: finalPoster,
        pdfName: state.uploadedPdfName || state.posts[idx].pdfName,
        pdfData: state.uploadedPdfBase64 || state.posts[idx].pdfData
      };
      showToast("Announcement updated successfully!", "success");
    }
  } else {
    const newPost = {
      id: "evt-" + Date.now(),
      title,
      category,
      organizer,
      date,
      deadline,
      venue,
      regLink,
      description,
      posterUrl: finalPoster,
      pdfName: state.uploadedPdfName || "",
      pdfData: state.uploadedPdfBase64 || "",
      authorId: state.currentUser.uid,
      authorName: state.currentUser.name,
      registrations: [],
      pinned: false,
      createdAt: Date.now()
    };

    state.posts.unshift(newPost);
    addNotification(`New ${category}`, `${title} published by ${organizer}.`);
    showToast("Published to Campus Feed & notified students!", "success");

    if (useCloudBackend && db) {
      try {
        await setDoc(doc(db, "artifacts", APP_ID, "public", "data", "campus_posts", newPost.id), newPost);
      } catch (e) {}
    }
  }

  persistLocalState();
  resetFacultyForm();
  navigateTo("feed");
};

window.editAnnouncement = function (postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  navigateTo("faculty-studio");
  document.getElementById("studio-form-title").textContent = "Edit Campus Listing";
  document.getElementById("edit-post-id").value = post.id;
  document.getElementById("post-title").value = post.title;
  document.getElementById("post-category").value = post.category;
  document.getElementById("post-organizer").value = post.organizer;
  document.getElementById("post-date").value = post.date;
  document.getElementById("post-deadline").value = post.deadline;
  document.getElementById("post-venue").value = post.venue;
  document.getElementById("post-reg-link").value = post.regLink || "";
  document.getElementById("post-description").value = post.description;
  document.getElementById("post-poster-url").value = post.posterUrl || "";
  document.getElementById("poster-preview-img").src = post.posterUrl || "";
  document.getElementById("save-post-btn").querySelector("span").textContent = "Save Changes";
};

window.deleteAnnouncement = async function (postId) {
  state.posts = state.posts.filter((p) => p.id !== postId);
  persistLocalState();
  if (useCloudBackend && db) {
    try {
      await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "campus_posts", postId));
    } catch (e) {}
  }
  renderAllViews();
  showToast("Listing removed from campus portal.", "info");
};

window.resetFacultyForm = function () {
  document.getElementById("faculty-post-form").reset();
  document.getElementById("edit-post-id").value = "";
  document.getElementById("studio-form-title").textContent = "Publish Campus Event or Official Notice";
  document.getElementById("save-post-btn").querySelector("span").textContent = "Publish to Campus Feed";
  document.getElementById("pdf-upload-status").textContent = "Attach syllabus, rulebook, or signed circular (PDF).";
  state.uploadedPosterBase64 = "";
  state.uploadedPdfBase64 = "";
  state.uploadedPdfName = "";
};

// ============================================================================
// 10. ADMIN PANEL ACTIONS
// ============================================================================
window.adminChangeUserRole = function (uid, newRole) {
  const user = state.usersDirectory.find((u) => u.uid === uid);
  if (user) {
    user.role = newRole;
    persistLocalState();
    renderAdminPanel();
    showToast(`Updated ${user.name}'s role to ${newRole.toUpperCase()}`, "success");
  }
};

window.adminToggleVerify = function (uid) {
  const user = state.usersDirectory.find((u) => u.uid === uid);
  if (user) {
    user.verified = !user.verified;
    persistLocalState();
    renderAdminPanel();
    showToast(`${user.name} verification status: ${user.verified ? "Verified" : "Revoked"}`, "info");
  }
};

window.adminTogglePin = function (postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (post) {
    post.pinned = !post.pinned;
    persistLocalState();
    renderAllViews();
    showToast(post.pinned ? "Pinned to top of Campus Feed" : "Unpinned announcement", "info");
  }
};

// ============================================================================
// 11. AI-POWERED CAMPUS CHATBOT (RETRIEVAL-AUGMENTED ON LIVE PORTAL DATA)
// ============================================================================
window.toggleChatbot = function (open) {
  const drawer = document.getElementById("chatbot-drawer");
  if (open) {
    drawer.classList.remove("hidden");
    document.getElementById("chat-input").focus();
  } else {
    drawer.classList.add("hidden");
  }
};

window.askSuggestedPrompt = function (question) {
  document.getElementById("chat-input").value = question;
  handleChatSubmit(new Event("submit"));
};

function appendChatMessage(sender, text) {
  const box = document.getElementById("chat-messages");
  const isUser = sender === "user";
  const html = isUser
    ? `
      <div class="flex justify-end">
        <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs max-w-[82%] leading-relaxed shadow-xs">
          ${text}
        </div>
      </div>
    `
    : `
      <div class="flex items-start gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="bot" class="w-4 h-4"></i>
        </div>
        <div class="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-3 text-xs text-slate-700 leading-relaxed shadow-xs max-w-[85%]">
          ${text}
        </div>
      </div>
    `;
  box.insertAdjacentHTML("beforeend", html);
  box.scrollTop = box.scrollHeight;
  lucide.createIcons();
}

function generateLocalCampusRAGAnswer(queryText) {
  const q = queryText.toLowerCase();
  const posts = state.posts;

  if (q.includes("deadline") || q.includes("closing") || q.includes("soon") || q.includes("last date")) {
    const sorted = [...posts].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);
    const lines = sorted
      .map((p) => `• <strong>${p.title}</strong> (${p.category}) — closes <em>${formatReadableDate(p.deadline)}</em>`)
      .join("<br/>");
    return `Here are the nearest upcoming deadlines on UniPulse:<br/><br/>${lines}`;
  }

  if (q.includes("hackathon") || q.includes("technical") || q.includes("coding")) {
    const matches = posts.filter((p) => p.category.toLowerCase().includes("technical") || p.title.toLowerCase().includes("hack"));
    if (!matches.length) return "There are currently no active hackathons listed.";
    return matches
      .map((p) => `<strong>${p.title}</strong><br/>Venue: ${p.venue}<br/>Date: ${formatReadableDate(p.date)}<br/>Deadline: ${formatReadableDate(p.deadline)}`)
      .join("<br/><br/>");
  }

  if (q.includes("internship") || q.includes("placement") || q.includes("job") || q.includes("stipend")) {
    const matches = posts.filter((p) => p.category.toLowerCase().includes("internship") || p.category.toLowerCase().includes("placement"));
    if (!matches.length) return "No placement or internship drives are listed at the moment.";
    return matches
      .map((p) => `<strong>${p.title}</strong><br/>${p.description}<br/>Apply before: <strong>${formatReadableDate(p.deadline)}</strong>`)
      .join("<br/><br/>");
  }

  if (q.includes("workshop") || q.includes("seminar") || q.includes("cloud") || q.includes("bootcamp")) {
    const matches = posts.filter((p) => p.category.toLowerCase().includes("workshop"));
    return matches.length
      ? matches.map((p) => `<strong>${p.title}</strong> at ${p.venue} on ${formatReadableDate(p.date)}.`).join("<br/><br/>")
      : "No upcoming workshops found.";
  }

  if (q.includes("exam") || q.includes("notice") || q.includes("cie") || q.includes("academic")) {
    const matches = posts.filter((p) => p.category.toLowerCase().includes("academic"));
    return matches.length
      ? matches.map((p) => `<strong>${p.title}</strong>: ${p.description}`).join("<br/><br/>")
      : "No academic circulars are currently posted.";
  }

  if (q.includes("my registration") || q.includes("registered")) {
    const user = state.currentUser;
    const myPosts = posts.filter((p) => p.registrations?.includes(user.uid) || user.registeredEvents?.includes(p.id));
    return myPosts.length
      ? `You are currently registered for <strong>${myPosts.length}</strong> event(s):<br/>` + myPosts.map((p) => `• ${p.title} (${formatReadableDate(p.date)})`).join("<br/>")
      : "You haven't registered for any events yet. Click 'Register' on any card in the feed!";
  }

  const keywords = q.split(/\s+/).filter((w) => w.length > 3);
  const scored = posts
    .map((p) => {
      const hay = `${p.title} ${p.description} ${p.category} ${p.venue} ${p.organizer}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 1 : acc), 0);
      return { post: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const top = scored[0].post;
    return `Based on published campus notices, here is what I found:<br/><br/><strong>${top.title}</strong> (${top.category})<br/>• <strong>When:</strong> ${formatReadableDate(top.date)}<br/>• <strong>Where:</strong> ${top.venue}<br/>• <strong>Deadline:</strong> ${formatReadableDate(top.deadline)}<br/>• <strong>Details:</strong> ${top.description}`;
  }

  return `We currently have <strong>${posts.length} active campus listings</strong> across Hackathons, Workshops, Placements, Sports, Fests, and Academic Notices. Try asking about <em>"hackathons"</em>, <em>"internship eligibility"</em>, or <em>"nearest deadlines"</em>!`;
}

window.handleChatSubmit = async function (event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const queryText = input.value.trim();
  if (!queryText) return;

  input.value = "";
  appendChatMessage("user", queryText);

  if (GEMINI_API_KEY) {
    try {
      const campusContext = state.posts
        .map(
          (p) =>
            `Title: ${p.title} | Category: ${p.category} | Organizer: ${p.organizer} | Date: ${p.date} | Deadline: ${p.deadline} | Venue: ${p.venue} | Details: ${p.description}`
        )
        .join("\n");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are UniBot, the official college campus assistant. Answer the student's question concisely using ONLY the published campus portal data below.\n\nPORTAL DATA:\n${campusContext}\n\nSTUDENT QUESTION: ${queryText}`
                  }
                ]
              }
            ]
          })
        }
      );
      const data = await res.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        appendChatMessage("bot", aiText.replace(/\n/g, "<br/>"));
        return;
      }
    } catch (e) {
      console.warn("Falling back to local RAG engine:", e);
    }
  }

  setTimeout(() => {
    const reply = generateLocalCampusRAGAnswer(queryText);
    appendChatMessage("bot", reply);
  }, 250);
};

// ============================================================================
// 12. TOAST NOTIFICATION UTILITY & BOOTSTRAP
// ============================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const colors = {
    success: "bg-emerald-900 text-white border-emerald-700",
    error: "bg-rose-900 text-white border-rose-700",
    info: "bg-slate-900 text-white border-slate-700"
  };

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  loadLocalData();
  initCloudSync();
  lucide.createIcons();

  if (state.currentUser) {
    enterAppShell();
  }
});