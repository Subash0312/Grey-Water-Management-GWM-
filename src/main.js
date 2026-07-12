// Grey Water Management (GWM) System Controller & Entry point

import './style.css';
import { initDB, getTable, saveTable, insertRecord } from './db.js';
import { renderView } from './views.js';

// User Role Mappings to User IDs
const ROLE_USER_MAP = {
  admin: { id: 1, name: "Subash" },
  plant_manager: { id: 2, name: "Sarah Connor" },
  operator: { id: 3, name: "John Doe" },
  maintenance: { id: 4, name: "Mike Miller" },
  resident: { id: 5, name: "Alice Smith" }
};

// Permitted views per Role
const ROLE_PERMISSIONS = {
  admin: ["dashboard", "collections", "treatment", "quality", "maintenance", "users", "sql-console", "reports"],
  plant_manager: ["dashboard", "collections", "treatment", "quality", "maintenance", "reports"],
  operator: ["dashboard", "collections", "treatment", "quality"],
  maintenance: ["dashboard", "maintenance"],
  resident: ["dashboard", "collections"]
};

// Application State
let currentRole = localStorage.getItem("gwm_current_role") || "admin";
let activeView = localStorage.getItem("gwm_active_view") || "dashboard";
let currentUser = null;

// Select DOM Elements
const roleSelect = document.getElementById("role-select");
const notifToggle = document.getElementById("notif-toggle");
const notifDropdown = document.getElementById("notif-dropdown");
const notifBadge = document.getElementById("notif-badge-count");
const notifListContainer = document.getElementById("notif-list-container");
const clearNotifBtn = document.getElementById("clear-notif-btn");
const userCardContainer = document.getElementById("current-user-card");
const sidebarMenu = document.getElementById("sidebar-menu");
const pageHeading = document.getElementById("page-heading");
const contentBody = document.getElementById("content-body");

// Initialize Application
function init() {
  // Initialize Mock Local Database
  initDB();

  // Bind role selector select box
  roleSelect.value = currentRole;
  roleSelect.addEventListener("change", (e) => {
    switchRole(e.target.value);
  });

  // Sidebar navigation click handler
  sidebarMenu.addEventListener("click", (e) => {
    const menuItem = e.target.closest(".menu-item");
    if (menuItem) {
      const view = menuItem.getAttribute("data-view");
      navigateTo(view);
    }
  });

  // Notifications dropdown toggler
  notifToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = notifDropdown.style.display === "flex";
    notifDropdown.style.display = isVisible ? "none" : "flex";
  });

  document.addEventListener("click", () => {
    notifDropdown.style.display = "none";
  });

  notifDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Clear notifications click
  clearNotifBtn.addEventListener("click", () => {
    clearNotifications();
  });

  // Listen to dynamic notification changes
  window.addEventListener("notificationsUpdated", () => {
    loadNotifications();
  });

  // Set initial role & navigate to default view
  switchRole(currentRole);
}

// Switch user role and restrict access
function switchRole(role) {
  currentRole = role;
  localStorage.setItem("gwm_current_role", role);

  const mappedUser = ROLE_USER_MAP[role];
  const users = getTable("users");
  currentUser = users.find(u => u.user_id == mappedUser.id) || users[0];

  // Update user badge card in UI
  updateUserCard();

  // Adjust sidebar menu options visibility
  renderSidebar();

  // Adjust current view if current view is not permitted for the new role
  const permitted = ROLE_PERMISSIONS[role];
  if (!permitted.includes(activeView)) {
    activeView = "dashboard";
    localStorage.setItem("gwm_active_view", "dashboard");
  }

  // Load and refresh notifications list
  loadNotifications();

  // Render view
  navigateTo(activeView);
}

// Navigate to view
function navigateTo(viewName) {
  activeView = viewName;
  localStorage.setItem("gwm_active_view", viewName);

  // Update Sidebar active state styling
  const menuItems = sidebarMenu.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    if (item.getAttribute("data-view") === viewName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update Heading Text
  const headingMapping = {
    "dashboard": "Dashboard",
    "collections": "Water Collections",
    "treatment": "Treatment Stage Pipeline",
    "quality": "Water Quality Parameters",
    "maintenance": "Maintenance Schedule",
    "users": "User Accounts",
    "sql-console": "SQL Query Console",
    "reports": "Purification Reports"
  };
  pageHeading.innerText = headingMapping[viewName] || "GWM System";

  // Trigger Views Manager
  renderView(viewName, contentBody, currentRole);
}

// Update UI User Profile Card
function updateUserCard() {
  if (!currentUser) return;
  const initials = currentUser.name.split(" ").map(w => w[0]).join("");
  userCardContainer.innerHTML = `
    <div class="user-avatar">${initials}</div>
    <div class="user-info">
      <span class="user-name">${currentUser.name}</span>
      <span class="user-role-badge">${currentUser.role.replace("_", " ")}</span>
    </div>
  `;
}

// Show/Hide sidebar links according to permitted view array
function renderSidebar() {
  const permitted = ROLE_PERMISSIONS[currentRole];
  const menuItems = sidebarMenu.querySelectorAll(".menu-item");
  
  menuItems.forEach(item => {
    const view = item.getAttribute("data-view");
    if (permitted.includes(view)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Load and populate notifications matching permissions
function loadNotifications() {
  const notifications = getTable("notifications");
  let filtered = [];

  // Filter rules: Admins & Managers see all alerts, Operators see Operator/System messages, etc.
  if (currentRole === "admin" || currentRole === "plant_manager") {
    filtered = notifications;
  } else {
    // Show only messages assigned to current user
    filtered = notifications.filter(n => n.user_id == currentUser.user_id);
  }

  // Sort: newest first
  filtered.sort((a, b) => b.notification_id - a.notification_id);

  // Update Badge
  notifBadge.innerText = filtered.length;
  notifBadge.style.display = filtered.length > 0 ? "flex" : "none";

  // Render list
  notifListContainer.innerHTML = "";
  if (filtered.length === 0) {
    notifListContainer.innerHTML = `<div class="notif-empty">No active notifications.</div>`;
  } else {
    filtered.forEach(n => {
      notifListContainer.innerHTML += `
        <div class="notif-item">
          <div class="notif-item-text">${n.message}</div>
          <div class="notif-item-date"><i class="fa-regular fa-clock"></i> ${n.notification_date}</div>
        </div>
      `;
    });
  }
}

// Clear all notifications visible to user
function clearNotifications() {
  const notifications = getTable("notifications");
  let remaining = [];

  if (currentRole === "admin" || currentRole === "plant_manager") {
    // Admins and managers clear all
    remaining = [];
  } else {
    // Keep notifications that are not for current user
    remaining = notifications.filter(n => n.user_id != currentUser.user_id);
  }

  saveTable("notifications", remaining);
  loadNotifications();
}

// Bootstrap when DOM ready
document.addEventListener("DOMContentLoaded", init);
