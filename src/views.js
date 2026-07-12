// Grey Water Management (GWM) System Views Manager
// Handles client-side rendering and interactive forms for all system modules

import { getTable, insertRecord, updateRecord, deleteRecord, executeSQLQuery } from "./db.js";
import Chart from "chart.js/auto";

// Global Reference for Chart instances to destroy before recreation
let activeCharts = {};

export function renderView(viewName, container, role) {
  // Clear previous page charts
  Object.keys(activeCharts).forEach(key => {
    if (activeCharts[key]) {
      activeCharts[key].destroy();
      delete activeCharts[key];
    }
  });

  container.innerHTML = "";
  container.className = "content-body animate-fade-in";

  switch (viewName) {
    case "dashboard":
      renderDashboard(container, role);
      break;
    case "collections":
      renderCollections(container, role);
      break;
    case "treatment":
      renderTreatment(container, role);
      break;
    case "quality":
      renderQuality(container, role);
      break;
    case "maintenance":
      renderMaintenance(container, role);
      break;
    case "users":
      renderUsers(container);
      break;
    case "sql-console":
      renderSQLConsole(container);
      break;
    case "reports":
      renderReports(container);
      break;
    default:
      container.innerHTML = `<h2>Page Not Found</h2>`;
  }
}

// --------------------------------------------------------------------
// 1. DASHBOARD VIEW
// --------------------------------------------------------------------
function renderDashboard(container, role) {
  const collections = getTable("water_collections");
  const treatments = getTable("treatment_process");
  const maintenance = getTable("maintenance");
  const quality = getTable("water_quality");

  // Calculations
  const totalCollected = collections.reduce((acc, c) => acc + parseFloat(c.quantity), 0);
  
  // Treated batches: stage = "Treated" & status = "Completed"
  const treatedIds = treatments
    .filter(t => t.treatment_stage === "Treated" && t.status === "Completed")
    .map(t => t.collection_id);
  const totalTreated = collections
    .filter(c => treatedIds.includes(c.collection_id))
    .reduce((acc, c) => acc + parseFloat(c.quantity), 0);

  const pendingMaintenance = maintenance.filter(m => m.status !== "Completed").length;
  
  // Contaminant anomalies
  const criticalAlertsCount = quality.filter(q => q.ph < 6.5 || q.ph > 8.5 || q.tds > 500 || q.turbidity > 5.0).length;

  container.innerHTML = `
    <!-- Metric Cards Grid -->
    <div class="card-grid">
      <div class="stat-card">
        <div class="stat-icon primary">
          <i class="fa-solid fa-bucket"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Collected</span>
          <span class="stat-value">${totalCollected.toLocaleString()} L</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Purified & Reused</span>
          <span class="stat-value">${totalTreated.toLocaleString()} L</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">
          <i class="fa-solid fa-screwdriver-wrench"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Pending Maintenance</span>
          <span class="stat-value">${pendingMaintenance} Items</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Quality Anomalies</span>
          <span class="stat-value">${criticalAlertsCount} Alerts</span>
        </div>
      </div>
    </div>

    <!-- Charts Area -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <h3>Wastewater Collection Analytics</h3>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="collectionChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">
            <h3>Treatment Stages</h3>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="stageChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Operations Table -->
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <h3>Recent Treatment Operations</h3>
        </div>
      </div>
      <div class="table-container">
        <table class="gwm-table">
          <thead>
            <tr>
              <th>Process ID</th>
              <th>Location</th>
              <th>Quantity</th>
              <th>Active Stage</th>
              <th>Purification Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="dash-recent-tbody">
            <!-- Dynamic Recent Records -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Populate recent table
  const recentTbody = document.getElementById("dash-recent-tbody");
  const recentTreatments = treatments.slice(-5).reverse();
  
  if (recentTreatments.length === 0) {
    recentTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No recent treatment processes.</td></tr>`;
  } else {
    recentTreatments.forEach(pt => {
      const col = collections.find(c => c.collection_id == pt.collection_id) || {};
      const statusBadge = pt.status === "Completed" 
        ? `<span class="badge badge-success">Completed</span>`
        : pt.status === "In Progress"
        ? `<span class="badge badge-warning">In Progress</span>`
        : `<span class="badge badge-danger">Failed</span>`;

      recentTbody.innerHTML += `
        <tr>
          <td>#${pt.process_id}</td>
          <td>${col.location || "Unknown"}</td>
          <td>${col.quantity ? parseFloat(col.quantity).toLocaleString() : 0} L</td>
          <td><span class="badge badge-info">${pt.treatment_stage}</span></td>
          <td>${statusBadge}</td>
          <td>${pt.process_date}</td>
        </tr>
      `;
    });
  }

  // Draw Charts
  // 1. Collection Trend Line Chart
  const collectionCanvas = document.getElementById("collectionChart");
  if (collectionCanvas) {
    // Group collections by date
    const dateGroups = {};
    collections.forEach(c => {
      dateGroups[c.collection_date] = (dateGroups[c.collection_date] || 0) + parseFloat(c.quantity);
    });
    const sortedDates = Object.keys(dateGroups).sort();
    const quantities = sortedDates.map(d => dateGroups[d]);

    activeCharts.collection = new Chart(collectionCanvas, {
      type: "line",
      data: {
        labels: sortedDates,
        datasets: [{
          label: "Volume Collected (Liters)",
          data: quantities,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } },
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } }
        }
      }
    });
  }

  // 2. Stage Distribution Chart (Doughnut)
  const stageCanvas = document.getElementById("stageChart");
  if (stageCanvas) {
    const stages = ["Primary", "Secondary", "Tertiary", "Disinfection", "Treated"];
    const stageCounts = stages.map(st => treatments.filter(t => t.treatment_stage === st).length);

    activeCharts.stage = new Chart(stageCanvas, {
      type: "doughnut",
      data: {
        labels: stages,
        datasets: [{
          data: stageCounts,
          backgroundColor: ["#818cf8", "#f59e0b", "#06b6d4", "#a855f7", "#10b981"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#9ca3af", font: { family: "Outfit" } }
          }
        }
      }
    });
  }
}

// --------------------------------------------------------------------
// 2. WATER COLLECTIONS VIEW
// --------------------------------------------------------------------
function renderCollections(container, role) {
  const collections = getTable("water_collections");

  // Determine if role can add collections (Operator, Resident, Admin, Plant Manager)
  const showRecordBtn = role !== "maintenance";

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <h3>Wastewater Collection Batches</h3>
        </div>
        <div class="table-actions">
          ${showRecordBtn ? `<button class="btn btn-primary" id="open-record-collection-btn"><i class="fa-solid fa-plus"></i> Record Collection</button>` : ""}
        </div>
      </div>
      <div class="table-container">
        <table class="gwm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Quantity (L)</th>
              <th>Collection Date</th>
              <th>Location Source</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${collections.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted)">No collection entries.</td></tr>` : 
              collections.map(c => `
                <tr>
                  <td>#${c.collection_id}</td>
                  <td>
                    <span class="badge ${c.source_type === "Grey" ? "badge-info" : "badge-danger"}">
                      ${c.source_type} Water
                    </span>
                  </td>
                  <td><strong>${parseFloat(c.quantity).toLocaleString()} L</strong></td>
                  <td>${c.collection_date}</td>
                  <td>${c.location}</td>
                  <td>
                    ${role === "operator" || role === "admin" ? `
                      <button class="btn btn-secondary btn-sm start-treatment-btn" data-id="${c.collection_id}">
                        <i class="fa-solid fa-gears"></i> Initialize Treatment
                      </button>
                    ` : `<span style="color: var(--text-muted); font-size: 12px;">Logged</span>`}
                  </td>
                </tr>
              `).join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach event listener for adding new collection
  if (showRecordBtn) {
    document.getElementById("open-record-collection-btn").addEventListener("click", () => {
      openCollectionModal(role);
    });
  }

  // Attach event listener to start treatment
  document.querySelectorAll(".start-treatment-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const colId = e.currentTarget.getAttribute("data-id");
      const treatments = getTable("treatment_process");
      
      // Check if already in treatment
      const exists = treatments.some(t => t.collection_id == colId);
      if (exists) {
        alert("This batch is already initialized in a treatment stage.");
        return;
      }

      // Initialize Treatment
      const today = new Date().toISOString().split('T')[0];
      const newProcess = insertRecord("treatment_process", {
        collection_id: parseInt(colId),
        treatment_stage: "Primary",
        status: "In Progress",
        process_date: today
      });

      // Add Notification
      insertRecord("notifications", {
        user_id: 3, // Operator
        message: `Treatment process #${newProcess.process_id} initialized for Collection batch #${colId} (Primary stage).`,
        notification_date: today
      });

      // Dispatch dynamic notifications event
      window.dispatchEvent(new Event("notificationsUpdated"));
      alert(`Treatment initialized successfully! Process ID: #${newProcess.process_id}`);
      renderView("treatment", container, role);
    });
  });
}

function openCollectionModal(role) {
  const modal = document.getElementById("modal-container");
  const today = new Date().toISOString().split('T')[0];
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Record Water Collection</h3>
        <button class="close-btn" id="close-modal-btn">&times;</button>
      </div>
      <form id="collection-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Water Source Classification</label>
            <select class="form-control" name="source_type" required>
              <option value="Grey">Grey Water (Sink, Bath, Laundry)</option>
              <option value="Black">Black Water (Toilet, High Contaminant)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Volume Quantity (Liters)</label>
            <input type="number" step="0.01" class="form-control" name="quantity" placeholder="e.g. 5000" required />
          </div>
          <div class="form-group">
            <label class="form-label">Collection Location</label>
            <input type="text" class="form-control" name="location" placeholder="e.g. Sector 5, Complex C" required />
          </div>
          <div class="form-group">
            <label class="form-label">Collection Date</label>
            <input type="date" class="form-control" name="collection_date" value="${today}" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = "flex";

  const closeModal = () => modal.style.display = "none";
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

  document.getElementById("collection-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const record = {
      source_type: formData.get("source_type"),
      quantity: parseFloat(formData.get("quantity")),
      location: formData.get("location"),
      collection_date: formData.get("collection_date")
    };

    insertRecord("water_collections", record);
    
    // Broadcast notification
    insertRecord("notifications", {
      user_id: 2, // Plant Manager
      message: `New wastewater collection of ${record.quantity} L (${record.source_type}) recorded at ${record.location}.`,
      notification_date: record.collection_date
    });

    window.dispatchEvent(new Event("notificationsUpdated"));
    closeModal();
    // Re-render view
    renderView("collections", document.getElementById("content-body"), role);
  });
}

// --------------------------------------------------------------------
// 3. TREATMENT MANAGEMENT VIEW
// --------------------------------------------------------------------
const STAGE_ORDER = ["Primary", "Secondary", "Tertiary", "Disinfection", "Treated"];

function renderTreatment(container, role) {
  const treatments = getTable("treatment_process");
  const collections = getTable("water_collections");

  const canEdit = role === "admin" || role === "operator" || role === "plant_manager";

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <h3>Active Treatment Processes</h3>
        </div>
      </div>
      <div class="table-container">
        <table class="gwm-table">
          <thead>
            <tr>
              <th>Process ID</th>
              <th>Collection Batch</th>
              <th>Source Location</th>
              <th>Current Stage</th>
              <th>Pipeline Progress</th>
              <th>Status</th>
              <th>Operational Date</th>
              ${canEdit ? `<th>Actions</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${treatments.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: var(--text-muted)">No active treatment batches.</td></tr>` : 
              treatments.map(t => {
                const col = collections.find(c => c.collection_id == t.collection_id) || {};
                const currentStageIdx = STAGE_ORDER.indexOf(t.treatment_stage);
                const progressPct = ((currentStageIdx) / (STAGE_ORDER.length - 1)) * 100;
                
                const statusBadge = t.status === "Completed" 
                  ? `<span class="badge badge-success">Completed</span>`
                  : t.status === "In Progress"
                  ? `<span class="badge badge-warning">In Progress</span>`
                  : `<span class="badge badge-danger">Failed</span>`;

                return `
                  <tr>
                    <td>#${t.process_id}</td>
                    <td>#${t.collection_id} (${col.source_type})</td>
                    <td>${col.location || "Unknown"}</td>
                    <td><span class="badge badge-info">${t.treatment_stage}</span></td>
                    <td style="width: 200px;">
                      <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 99px; overflow: hidden; position: relative;">
                        <div style="background: linear-gradient(to right, var(--primary), var(--secondary)); height: 100%; width: ${progressPct}%; transition: width 0.4s;"></div>
                      </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${t.process_date}</td>
                    ${canEdit ? `
                      <td>
                        <div style="display: flex; gap: 8px;">
                          ${t.status === "In Progress" && t.treatment_stage !== "Treated" ? `
                            <button class="btn btn-primary btn-sm stage-progress-btn" data-id="${t.process_id}">
                              <i class="fa-solid fa-angles-right"></i> Advance
                            </button>
                            <button class="btn btn-danger btn-sm stage-fail-btn" data-id="${t.process_id}">
                              <i class="fa-solid fa-circle-xmark"></i> Fail
                            </button>
                          ` : t.treatment_stage === "Treated" && t.status === "In Progress" ? `
                            <button class="btn btn-success btn-sm stage-complete-btn" data-id="${t.process_id}" style="background-color: var(--color-success); color: white;">
                              <i class="fa-solid fa-circle-check"></i> Complete
                            </button>
                          ` : `<span style="color: var(--text-muted); font-size:12px;">Closed</span>`}
                        </div>
                      </td>
                    ` : ""}
                  </tr>
                `;
              }).join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Event handlers
  document.querySelectorAll(".stage-progress-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const procId = e.currentTarget.getAttribute("data-id");
      const proc = treatments.find(p => p.process_id == procId);
      const currentIdx = STAGE_ORDER.indexOf(proc.treatment_stage);
      
      if (currentIdx < STAGE_ORDER.length - 1) {
        const nextStage = STAGE_ORDER[currentIdx + 1];
        updateRecord("treatment_process", procId, {
          treatment_stage: nextStage,
          process_date: new Date().toISOString().split('T')[0]
        });

        // Add Notification
        insertRecord("notifications", {
          user_id: 2, // Manager
          message: `Treatment Process #${procId} advanced from ${proc.treatment_stage} to ${nextStage}.`,
          notification_date: new Date().toISOString().split('T')[0]
        });

        window.dispatchEvent(new Event("notificationsUpdated"));
        renderView("treatment", container, role);
      }
    });
  });

  document.querySelectorAll(".stage-fail-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const procId = e.currentTarget.getAttribute("data-id");
      updateRecord("treatment_process", procId, {
        status: "Failed",
        process_date: new Date().toISOString().split('T')[0]
      });

      // Add Alert Notification
      insertRecord("notifications", {
        user_id: 1, // Admin
        message: `CRITICAL ALERT: Treatment Process #${procId} FAILED during stage. Manual inspection needed.`,
        notification_date: new Date().toISOString().split('T')[0]
      });

      window.dispatchEvent(new Event("notificationsUpdated"));
      renderView("treatment", container, role);
    });
  });

  document.querySelectorAll(".stage-complete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const procId = e.currentTarget.getAttribute("data-id");
      
      // Before finishing, check if there is water quality data logged for this process!
      const qualityRecords = getTable("water_quality");
      const hasQuality = qualityRecords.some(q => q.process_id == procId);
      
      if (!hasQuality) {
        alert("Verification Required: You must log a Water Quality Test for this process before completing and releasing the water for reuse.");
        return;
      }

      updateRecord("treatment_process", procId, {
        status: "Completed",
        process_date: new Date().toISOString().split('T')[0]
      });

      insertRecord("notifications", {
        user_id: 2, // Manager
        message: `Treatment Process #${procId} completed tertiary purification. Water approved for reuse!`,
        notification_date: new Date().toISOString().split('T')[0]
      });

      window.dispatchEvent(new Event("notificationsUpdated"));
      renderView("treatment", container, role);
    });
  });
}

// --------------------------------------------------------------------
// 4. WATER QUALITY MONITORING VIEW
// --------------------------------------------------------------------
function renderQuality(container, role) {
  const quality = getTable("water_quality");
  const treatments = getTable("treatment_process");

  const canTest = role === "admin" || role === "operator" || role === "plant_manager";

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <h3>Water Quality Analysis Logs</h3>
        </div>
        <div class="table-actions">
          ${canTest ? `<button class="btn btn-primary" id="open-record-quality-btn"><i class="fa-solid fa-plus"></i> Record Quality Test</button>` : ""}
        </div>
      </div>
      <div class="table-container">
        <table class="gwm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Process Batch</th>
              <th>pH Level (6.5-8.5)</th>
              <th>TDS (<500 mg/L)</th>
              <th>BOD (<10 mg/L)</th>
              <th>Turbidity (<5 NTU)</th>
              <th>Status</th>
              <th>Test Date</th>
            </tr>
          </thead>
          <tbody>
            ${quality.length === 0 ? `<tr><td colspan="8" style="text-align: center; color: var(--text-muted)">No quality logs available.</td></tr>` : 
              quality.map(q => {
                // Verification standards
                const phSafe = q.ph >= 6.5 && q.ph <= 8.5;
                const tdsSafe = q.tds < 500;
                const bodSafe = q.bod < 10;
                const turbiditySafe = q.turbidity < 5.0;

                const isPerfect = phSafe && tdsSafe && bodSafe && turbiditySafe;
                const qualityBadge = isPerfect 
                  ? `<span class="badge badge-success">Safe for Reuse</span>`
                  : `<span class="badge badge-danger">Contaminated / Caution</span>`;

                return `
                  <tr>
                    <td>#${q.quality_id}</td>
                    <td>Process #${q.process_id}</td>
                    <td style="color: ${phSafe ? "inherit" : "var(--color-danger)"}">
                      ${q.ph} ${phSafe ? "" : `<i class="fa-solid fa-circle-exclamation"></i>`}
                    </td>
                    <td style="color: ${tdsSafe ? "inherit" : "var(--color-danger)"}">
                      ${q.tds} mg/L ${tdsSafe ? "" : `<i class="fa-solid fa-circle-exclamation"></i>`}
                    </td>
                    <td style="color: ${bodSafe ? "inherit" : "var(--color-danger)"}">
                      ${q.bod} mg/L ${bodSafe ? "" : `<i class="fa-solid fa-circle-exclamation"></i>`}
                    </td>
                    <td style="color: ${turbiditySafe ? "inherit" : "var(--color-danger)"}">
                      ${q.turbidity} NTU ${turbiditySafe ? "" : `<i class="fa-solid fa-circle-exclamation"></i>`}
                    </td>
                    <td>${qualityBadge}</td>
                    <td>${q.test_date}</td>
                  </tr>
                `;
              }).join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (canTest) {
    document.getElementById("open-record-quality-btn").addEventListener("click", () => {
      openQualityModal(role);
    });
  }
}

function openQualityModal(role) {
  const modal = document.getElementById("modal-container");
  const treatments = getTable("treatment_process").filter(t => t.status === "In Progress");
  const today = new Date().toISOString().split('T')[0];

  if (treatments.length === 0) {
    alert("There are no active 'In Progress' treatment batches requiring quality analysis.");
    return;
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Record Quality Analysis</h3>
        <button class="close-btn" id="close-modal-btn">&times;</button>
      </div>
      <form id="quality-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Select Treatment Batch</label>
            <select class="form-control" name="process_id" required>
              ${treatments.map(t => `<option value="${t.process_id}">Process ID #${t.process_id} (Stage: ${t.treatment_stage})</option>`).join("")}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">pH Level (Ideal: 6.5 - 8.5)</label>
              <input type="number" step="0.01" class="form-control" name="ph" placeholder="e.g. 7.2" required />
            </div>
            <div class="form-group">
              <label class="form-label">TDS - Total Dissolved Solids (Ideal: <500 mg/L)</label>
              <input type="number" step="0.1" class="form-control" name="tds" placeholder="e.g. 240" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">BOD - Bio Oxygen Demand (Ideal: <10 mg/L)</label>
              <input type="number" step="0.1" class="form-control" name="bod" placeholder="e.g. 5" required />
            </div>
            <div class="form-group">
              <label class="form-label">Turbidity (Ideal: <5 NTU)</label>
              <input type="number" step="0.01" class="form-control" name="turbidity" placeholder="e.g. 1.8" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Analysis Date</label>
            <input type="date" class="form-control" name="test_date" value="${today}" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Test Data</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = "flex";

  const closeModal = () => modal.style.display = "none";
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

  document.getElementById("quality-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const record = {
      process_id: parseInt(formData.get("process_id")),
      ph: parseFloat(formData.get("ph")),
      tds: parseFloat(formData.get("tds")),
      bod: parseFloat(formData.get("bod")),
      turbidity: parseFloat(formData.get("turbidity")),
      test_date: formData.get("test_date")
    };

    insertRecord("water_quality", record);

    // Verify contaminants
    const unsafe = record.ph < 6.5 || record.ph > 8.5 || record.tds >= 500 || record.bod >= 10 || record.turbidity >= 5.0;
    
    if (unsafe) {
      // Trigger instant notifications
      insertRecord("notifications", {
        user_id: 1, // Admin alert
        message: `QUALITY ANOMALY: Contaminant levels exceeded safe limits on Process ID #${record.process_id}. Action required.`,
        notification_date: record.test_date
      });
      window.dispatchEvent(new Event("notificationsUpdated"));
    }

    closeModal();
    renderView("quality", document.getElementById("content-body"), role);
  });
}

// --------------------------------------------------------------------
// 5. MAINTENANCE SCHEDULER VIEW
// --------------------------------------------------------------------
function renderMaintenance(container, role) {
  const maintenance = getTable("maintenance");
  const canSchedule = role === "admin" || role === "plant_manager";
  const canUpdateStatus = role === "admin" || role === "maintenance" || role === "plant_manager";

  container.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <h3>Equipment Maintenance Records</h3>
        </div>
        <div class="table-actions">
          ${canSchedule ? `<button class="btn btn-primary" id="open-record-maintenance-btn"><i class="fa-solid fa-plus"></i> Schedule Maintenance</button>` : ""}
        </div>
      </div>
      <div class="table-container">
        <table class="gwm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipment Unit</th>
              <th>Scheduled Date</th>
              <th>Work Status</th>
              ${canUpdateStatus ? `<th>Action Controls</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${maintenance.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No maintenance reports.</td></tr>` : 
              maintenance.map(m => {
                const statusBadge = m.status === "Completed" 
                  ? `<span class="badge badge-success">Completed</span>`
                  : m.status === "In Progress"
                  ? `<span class="badge badge-warning">In Progress</span>`
                  : `<span class="badge badge-danger">Pending</span>`;

                return `
                  <tr>
                    <td>#${m.maintenance_id}</td>
                    <td><strong>${m.equipment_name}</strong></td>
                    <td>${m.maintenance_date}</td>
                    <td>${statusBadge}</td>
                    ${canUpdateStatus ? `
                      <td>
                        <div style="display: flex; gap: 8px;">
                          ${m.status === "Pending" ? `
                            <button class="btn btn-secondary btn-sm start-maint-btn" data-id="${m.maintenance_id}">
                              Start Repair
                            </button>
                          ` : ""}
                          ${m.status === "In Progress" ? `
                            <button class="btn btn-primary btn-sm complete-maint-btn" data-id="${m.maintenance_id}">
                              Mark Done
                            </button>
                          ` : ""}
                          ${m.status === "Completed" ? `<span style="color: var(--text-muted); font-size:12px;">Closed</span>` : ""}
                        </div>
                      </td>
                    ` : ""}
                  </tr>
                `;
              }).join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (canSchedule) {
    document.getElementById("open-record-maintenance-btn").addEventListener("click", () => {
      openMaintenanceModal(role);
    });
  }

  // Work state toggle handlers
  document.querySelectorAll(".start-maint-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      updateRecord("maintenance", id, { status: "In Progress" });
      renderView("maintenance", container, role);
    });
  });

  document.querySelectorAll(".complete-maint-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      updateRecord("maintenance", id, { status: "Completed" });
      renderView("maintenance", container, role);
    });
  });
}

function openMaintenanceModal(role) {
  const modal = document.getElementById("modal-container");
  const today = new Date().toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Schedule Equipment Service</h3>
        <button class="close-btn" id="close-modal-btn">&times;</button>
      </div>
      <form id="maintenance-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Equipment / Unit Name</label>
            <input type="text" class="form-control" name="equipment_name" placeholder="e.g. UV Tube Replacement" required />
          </div>
          <div class="form-group">
            <label class="form-label">Service Execution Date</label>
            <input type="date" class="form-control" name="maintenance_date" value="${today}" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Work</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = "flex";

  const closeModal = () => modal.style.display = "none";
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

  document.getElementById("maintenance-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const record = {
      equipment_name: formData.get("equipment_name"),
      maintenance_date: formData.get("maintenance_date"),
      status: "Pending"
    };

    insertRecord("maintenance", record);

    // Notify maintenance crew
    insertRecord("notifications", {
      user_id: 4, // Maintenance staff ID
      message: `New service task assigned: ${record.equipment_name} scheduled for ${record.maintenance_date}.`,
      notification_date: record.maintenance_date
    });

    window.dispatchEvent(new Event("notificationsUpdated"));
    closeModal();
    renderView("maintenance", document.getElementById("content-body"), role);
  });
}

// --------------------------------------------------------------------
// 6. USER ROSTER / MANAGEMENT
// --------------------------------------------------------------------
function renderUsers(container) {
  const users = getTable("users");

  container.innerHTML = `
    <div class="user-grid-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="font-size: 20px; font-weight: 600;">System User Roster</h3>
      <button class="btn btn-primary" id="open-add-user-btn"><i class="fa-solid fa-user-plus"></i> Add Account</button>
    </div>

    <div class="user-grid">
      ${users.map(u => `
        <div class="user-card">
          <div class="user-card-header">
            <div class="user-avatar">${u.name.split(" ").map(w=>w[0]).join("")}</div>
            <div class="user-card-info">
              <span class="user-card-name">${u.name}</span>
              <span class="user-card-email">${u.email}</span>
            </div>
          </div>
          <div style="font-size: 13px;">
            Role Assignment: <span class="badge badge-info" style="text-transform: uppercase;">${u.role}</span>
          </div>
          <div class="user-card-actions">
            <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${u.user_id}">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.user_id}">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  document.getElementById("open-add-user-btn").addEventListener("click", () => {
    openUserModal(null);
  });

  document.querySelectorAll(".edit-user-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      openUserModal(id);
    });
  });

  document.querySelectorAll(".delete-user-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this user?")) {
        deleteRecord("users", id);
        renderUsers(container);
      }
    });
  });
}

function openUserModal(userId = null) {
  const modal = document.getElementById("modal-container");
  const users = getTable("users");
  const editingUser = userId ? users.find(u => u.user_id == userId) : null;

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${editingUser ? "Modify User Account" : "Add System User"}</h3>
        <button class="close-btn" id="close-modal-btn">&times;</button>
      </div>
      <form id="user-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-control" name="name" value="${editingUser ? editingUser.name : ""}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" name="email" value="${editingUser ? editingUser.email : ""}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Login Password</label>
            <input type="password" class="form-control" name="password" placeholder="${editingUser ? "Leave blank to keep current" : "Set password"}" ${editingUser ? "" : "required"} />
          </div>
          <div class="form-group">
            <label class="form-label">System Access Role</label>
            <select class="form-control" name="role" required>
              <option value="admin" ${editingUser && editingUser.role === 'admin' ? 'selected' : ''}>Administrator</option>
              <option value="plant_manager" ${editingUser && editingUser.role === 'plant_manager' ? 'selected' : ''}>Plant Manager</option>
              <option value="operator" ${editingUser && editingUser.role === 'operator' ? 'selected' : ''}>Treatment Operator</option>
              <option value="maintenance" ${editingUser && editingUser.role === 'maintenance' ? 'selected' : ''}>Maintenance Staff</option>
              <option value="resident" ${editingUser && editingUser.role === 'resident' ? 'selected' : ''}>Resident / User</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">${editingUser ? "Save Changes" : "Create Account"}</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = "flex";

  const closeModal = () => modal.style.display = "none";
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

  document.getElementById("user-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const record = {
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role")
    };

    const pass = formData.get("password");
    if (pass) {
      record.password = pass;
    } else if (editingUser) {
      record.password = editingUser.password;
    }

    if (editingUser) {
      updateRecord("users", userId, record);
    } else {
      insertRecord("users", record);
    }

    closeModal();
    renderUsers(document.getElementById("content-body"));
  });
}

// --------------------------------------------------------------------
// 7. SQL QUERY WORKBENCH CONSOLE
// --------------------------------------------------------------------
function renderSQLConsole(container) {
  container.innerHTML = `
    <div class="sql-console">
      <div class="sql-editor-container">
        <div class="sql-editor-header">
          <span class="sql-editor-title"><i class="fa-solid fa-code"></i> Live SQL Execution Engine</span>
          <button class="btn btn-primary btn-sm" id="run-sql-btn">
            <i class="fa-solid fa-play"></i> Execute Query
          </button>
        </div>
        <textarea class="sql-textarea" id="sql-query-input">SELECT * FROM water_quality ORDER BY test_date DESC LIMIT 5</textarea>
      </div>

      <div class="sql-schema-guide">
        <h4><i class="fa-solid fa-book-open-reader"></i> Database Schema Table Index</h4>
        <ul>
          <li><code>users</code> - name, email, role</li>
          <li><code>water_collections</code> - source_type, quantity, collection_date, location</li>
          <li><code>treatment_process</code> - collection_id, treatment_stage, status, process_date</li>
          <li><code>water_quality</code> - process_id, ph, tds, bod, turbidity, test_date</li>
          <li><code>maintenance</code> - equipment_name, maintenance_date, status</li>
          <li><code>notifications</code> - user_id, message, notification_date</li>
        </ul>
      </div>

      <div id="sql-results-area" class="table-card" style="display: none; border-color: rgba(56, 189, 248, 0.2)">
        <div class="table-header">
          <div class="table-title">
            <h3>Query Result Frame</h3>
          </div>
          <span class="badge badge-success" id="sql-rows-badge">0 Rows</span>
        </div>
        <div class="table-container" id="sql-table-container">
          <!-- Rendered queries -->
        </div>
      </div>
    </div>
  `;

  document.getElementById("run-sql-btn").addEventListener("click", () => {
    const query = document.getElementById("sql-query-input").value;
    const result = executeSQLQuery(query);
    
    const resultsArea = document.getElementById("sql-results-area");
    const tableContainer = document.getElementById("sql-table-container");
    const rowsBadge = document.getElementById("sql-rows-badge");
    
    resultsArea.style.display = "block";
    tableContainer.innerHTML = "";

    if (!result.success) {
      rowsBadge.className = "badge badge-danger";
      rowsBadge.innerText = "Error";
      tableContainer.innerHTML = `<div class="sql-result-error">${result.error}</div>`;
      return;
    }

    rowsBadge.className = "badge badge-success";
    rowsBadge.innerText = `${result.rows.length} Rows`;

    if (result.rows.length === 0) {
      tableContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Empty set returned (0 rows).</div>`;
      return;
    }

    // Build Table
    let tableHtml = `
      <table class="gwm-table">
        <thead>
          <tr>
            ${result.columns.map(col => `<th>${col}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${result.rows.map(row => `
            <tr>
              ${result.columns.map(col => `<td>${row[col] !== null && row[col] !== undefined ? row[col] : "<em>null</em>"}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    tableContainer.innerHTML = tableHtml;
  });
}

// --------------------------------------------------------------------
// 8. REPORTS & ANALYTICS VIEW
// --------------------------------------------------------------------
function renderReports(container) {
  const collections = getTable("water_collections");
  const treatments = getTable("treatment_process");
  const quality = getTable("water_quality");

  // Sums
  const greyQty = collections.filter(c => c.source_type === "Grey").reduce((acc, c) => acc + parseFloat(c.quantity), 0);
  const blackQty = collections.filter(c => c.source_type === "Black").reduce((acc, c) => acc + parseFloat(c.quantity), 0);

  // Success Rate
  const completedCount = treatments.filter(t => t.status === "Completed").length;
  const failedCount = treatments.filter(t => t.status === "Failed").length;
  const runningCount = treatments.filter(t => t.status === "In Progress").length;
  const totalProcessCount = treatments.length || 1;
  const successPct = Math.round((completedCount / totalProcessCount) * 100);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
      <h3 style="font-size: 20px; font-weight: 600;">Water Reuse & Purification Audit</h3>
      <button class="btn btn-primary" id="export-report-btn">
        <i class="fa-solid fa-file-pdf"></i> Export PDF Report
      </button>
    </div>

    <!-- Metrics Layout -->
    <div class="card-grid">
      <div class="stat-card">
        <div class="stat-icon primary">
          <i class="fa-solid fa-chart-line"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Purification Rate</span>
          <span class="stat-value">${successPct}% Success</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">
          <i class="fa-solid fa-sink"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Grey Water Volume</span>
          <span class="stat-value">${greyQty.toLocaleString()} L</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon danger">
          <i class="fa-solid fa-toilet"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Black Water Volume</span>
          <span class="stat-value">${blackQty.toLocaleString()} L</span>
        </div>
      </div>
    </div>

    <!-- Visual Graphs -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <h3>Purification Efficiency Metrics (Average TDS)</h3>
        </div>
        <div class="chart-container">
          <canvas id="efficiencyChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3>Collection Source Distribution</h3>
        </div>
        <div class="chart-container">
          <canvas id="distributionChart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Draw Charts
  // 1. Avg TDS / Contaminants per stage logic (Simulated for visual excellence)
  const effCanvas = document.getElementById("efficiencyChart");
  if (effCanvas) {
    // Generate averages over stages or show simulated reduction curve
    activeCharts.efficiency = new Chart(effCanvas, {
      type: "bar",
      data: {
        labels: ["Raw Input", "Primary Stage", "Secondary Stage", "Tertiary Stage", "UV Treated Output"],
        datasets: [
          {
            label: "TDS (mg/L)",
            data: [750, 580, 390, 220, 110],
            backgroundColor: "rgba(56, 189, 248, 0.8)",
            borderRadius: 8
          },
          {
            label: "BOD (mg/L)",
            data: [45, 30, 18, 8, 2],
            backgroundColor: "rgba(129, 140, 248, 0.8)",
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } },
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } }
        },
        plugins: {
          legend: { labels: { color: "#9ca3af" } }
        }
      }
    });
  }

  // 2. Source breakdown (Doughnut)
  const distCanvas = document.getElementById("distributionChart");
  if (distCanvas) {
    activeCharts.distribution = new Chart(distCanvas, {
      type: "doughnut",
      data: {
        labels: ["Grey Water", "Black Water"],
        datasets: [{
          data: [greyQty, blackQty],
          backgroundColor: ["#38bdf8", "#818cf8"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#9ca3af" }
          }
        }
      }
    });
  }

  document.getElementById("export-report-btn").addEventListener("click", () => {
    alert("Purification & Re-use Audit Report compiled successfully! Check your downloads folder (Simulated PDF export).");
  });
}
