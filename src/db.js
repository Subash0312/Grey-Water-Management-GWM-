// Mock Database Engine using LocalStorage
// Implements SQL schema and query execution for Grey Water Management (GWM) system

const DEFAULT_USERS = [
  { user_id: 1, name: "Arasu Kumar", email: "arasu@gwm.com", password: "password", role: "admin" },
  { user_id: 2, name: "Sarah Connor", email: "sarah@gwm.com", password: "password", role: "plant_manager" },
  { user_id: 3, name: "John Doe", email: "john@gwm.com", password: "password", role: "operator" },
  { user_id: 4, name: "Mike Miller", email: "mike@gwm.com", password: "password", role: "maintenance" },
  { user_id: 5, name: "Alice Smith", email: "alice@gwm.com", password: "password", role: "resident" }
];

const DEFAULT_COLLECTIONS = [
  { collection_id: 1, source_type: "Grey", quantity: 8500.00, collection_date: "2026-07-10", location: "Sector A - Residential Blocks" },
  { collection_id: 2, source_type: "Black", quantity: 12000.00, collection_date: "2026-07-10", location: "Sector B - Commercial Complex" },
  { collection_id: 3, source_type: "Grey", quantity: 6200.00, collection_date: "2026-07-11", location: "Sector C - IT Park" },
  { collection_id: 4, source_type: "Black", quantity: 9500.00, collection_date: "2026-07-11", location: "Sector A - Residential Blocks" },
  { collection_id: 5, source_type: "Grey", quantity: 7100.00, collection_date: "2026-07-12", location: "Sector D - Public Market" }
];

const DEFAULT_TREATMENT = [
  { process_id: 1, collection_id: 1, treatment_stage: "Treated", status: "Completed", process_date: "2026-07-10" },
  { process_id: 2, collection_id: 2, treatment_stage: "Tertiary", status: "In Progress", process_date: "2026-07-11" },
  { process_id: 3, collection_id: 3, treatment_stage: "Disinfection", status: "In Progress", process_date: "2026-07-12" },
  { process_id: 4, collection_id: 4, treatment_stage: "Primary", status: "Completed", process_date: "2026-07-11" },
  { process_id: 5, collection_id: 5, treatment_stage: "Secondary", status: "In Progress", process_date: "2026-07-12" }
];

const DEFAULT_QUALITY = [
  { quality_id: 1, process_id: 1, ph: 7.20, tds: 280.00, bod: 8.50, turbidity: 2.10, test_date: "2026-07-10" },
  { quality_id: 2, process_id: 4, ph: 8.40, tds: 450.00, bod: 15.00, turbidity: 4.80, test_date: "2026-07-11" }
];

const DEFAULT_MAINTENANCE = [
  { maintenance_id: 1, equipment_name: "Clarifier Pump A", maintenance_date: "2026-07-08", status: "Completed" },
  { maintenance_id: 2, equipment_name: "UV Disinfection Tube 2", maintenance_date: "2026-07-14", status: "Pending" },
  { maintenance_id: 3, equipment_name: "Aeration Blower B", maintenance_date: "2026-07-12", status: "In Progress" },
  { maintenance_id: 4, equipment_name: "Sand Filter Tank 1", maintenance_date: "2026-07-18", status: "Pending" }
];

const DEFAULT_NOTIFICATIONS = [
  { notification_id: 1, user_id: 2, message: "Aeration Blower B maintenance scheduled for today.", notification_date: "2026-07-12" },
  { notification_id: 2, user_id: 1, message: "Critical Warning: High Turbidity (4.8 NTU) in Process #4 (Primary stage).", notification_date: "2026-07-11" },
  { notification_id: 3, user_id: 3, message: "New water collection batch #5 added. Treatment initiation required.", notification_date: "2026-07-12" }
];

// Initialize Database
export function initDB() {
  if (!localStorage.getItem("gwm_users")) {
    localStorage.setItem("gwm_users", JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem("gwm_water_collections")) {
    localStorage.setItem("gwm_water_collections", JSON.stringify(DEFAULT_COLLECTIONS));
  }
  if (!localStorage.getItem("gwm_treatment_process")) {
    localStorage.setItem("gwm_treatment_process", JSON.stringify(DEFAULT_TREATMENT));
  }
  if (!localStorage.getItem("gwm_water_quality")) {
    localStorage.setItem("gwm_water_quality", JSON.stringify(DEFAULT_QUALITY));
  }
  if (!localStorage.getItem("gwm_maintenance")) {
    localStorage.setItem("gwm_maintenance", JSON.stringify(DEFAULT_MAINTENANCE));
  }
  if (!localStorage.getItem("gwm_notifications")) {
    localStorage.setItem("gwm_notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
}

// Helper to get all data from a table
export function getTable(tableName) {
  initDB();
  const raw = localStorage.getItem(`gwm_${tableName}`);
  return raw ? JSON.parse(raw) : [];
}

// Helper to save data back to a table
export function saveTable(tableName, data) {
  localStorage.setItem(`gwm_${tableName}`, JSON.stringify(data));
}

// Auto-increment helper
function getNextId(table, idKey) {
  if (table.length === 0) return 1;
  return Math.max(...table.map(item => item[idKey])) + 1;
}

// Create operations
export function insertRecord(tableName, record) {
  const data = getTable(tableName);
  const idKey = getTableIdKey(tableName);
  const newId = getNextId(data, idKey);
  const newRecord = { [idKey]: newId, ...record };
  data.push(newRecord);
  saveTable(tableName, data);
  return newRecord;
}

// Update operations
export function updateRecord(tableName, id, updatedFields) {
  const data = getTable(tableName);
  const idKey = getTableIdKey(tableName);
  const index = data.findIndex(item => item[idKey] == id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updatedFields };
    saveTable(tableName, data);
    return data[index];
  }
  return null;
}

// Delete operations
export function deleteRecord(tableName, id) {
  const data = getTable(tableName);
  const idKey = getTableIdKey(tableName);
  const filtered = data.filter(item => item[idKey] != id);
  saveTable(tableName, filtered);
}

function getTableIdKey(tableName) {
  const mapping = {
    "users": "user_id",
    "water_collections": "collection_id",
    "treatment_process": "process_id",
    "water_quality": "quality_id",
    "maintenance": "maintenance_id",
    "notifications": "notification_id"
  };
  return mapping[tableName] || "id";
}

// SQL Query Sim Engine
// Supports simple queries: SELECT * / columns FROM table [WHERE conditions] [ORDER BY col [ASC|DESC]] [LIMIT n]
export function executeSQLQuery(queryString) {
  try {
    const query = queryString.trim().replace(/;$/, "");
    
    // Parse SELECT
    const selectMatch = query.match(/^SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+([\w.]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
    
    if (!selectMatch) {
      return { 
        success: false, 
        error: "SQL Syntax Error. Supported syntax: SELECT [columns | *] FROM [table] [WHERE condition] [ORDER BY col [ASC|DESC]] [LIMIT num]" 
      };
    }
    
    const [_, columnsStr, tableNameInput, whereStr, orderCol, orderDir, limitStr] = selectMatch;
    const tableName = tableNameInput.toLowerCase();
    
    const validTables = ["users", "water_collections", "treatment_process", "water_quality", "maintenance", "notifications"];
    if (!validTables.includes(tableName)) {
      return { success: false, error: `Table "${tableName}" not found in database schema.` };
    }
    
    let records = getTable(tableName);
    
    // 1. Process WHERE clause
    if (whereStr) {
      records = records.filter(record => {
        return evaluateWhere(record, whereStr);
      });
    }
    
    // 2. Process ORDER BY
    if (orderCol) {
      const isDesc = orderDir && orderDir.toUpperCase() === "DESC";
      records.sort((a, b) => {
        let valA = a[orderCol.trim()];
        let valB = b[orderCol.trim()];
        
        // Handle numerical/string comparisons
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }
    
    // 3. Process Columns Projection
    const columns = columnsStr.split(",").map(c => c.trim());
    let projectedRecords = records;
    if (columns.length > 0 && columns[0] !== "*") {
      projectedRecords = records.map(record => {
        const projected = {};
        columns.forEach(col => {
          projected[col] = record[col] !== undefined ? record[col] : null;
        });
        return projected;
      });
    }
    
    // 4. Process LIMIT
    if (limitStr) {
      const limit = parseInt(limitStr, 10);
      projectedRecords = projectedRecords.slice(0, limit);
    }
    
    return {
      success: true,
      columns: projectedRecords.length > 0 ? Object.keys(projectedRecords[0]) : (columns[0] === "*" ? getTableSchemaColumns(tableName) : columns),
      rows: projectedRecords
    };
  } catch (err) {
    return { success: false, error: `Execution Error: ${err.message}` };
  }
}

function getTableSchemaColumns(tableName) {
  const schemas = {
    users: ["user_id", "name", "email", "role"],
    water_collections: ["collection_id", "source_type", "quantity", "collection_date", "location"],
    treatment_process: ["process_id", "collection_id", "treatment_stage", "status", "process_date"],
    water_quality: ["quality_id", "process_id", "ph", "tds", "bod", "turbidity", "test_date"],
    maintenance: ["maintenance_id", "equipment_name", "maintenance_date", "status"],
    notifications: ["notification_id", "user_id", "message", "notification_date"]
  };
  return schemas[tableName] || [];
}

// Simple WHERE clause evaluator
function evaluateWhere(record, whereStr) {
  let jsExpr = whereStr;
  
  const operators = whereStr.includes(" AND ") ? "AND" : (whereStr.includes(" OR ") ? "OR" : null);
  const parts = operators ? whereStr.split(new RegExp(`\\s+${operators}\\s+`, "i")) : [whereStr];
  
  const results = parts.map(part => {
    const singleMatch = part.trim().match(/(\w+)\s*(=|>|<|LIKE)\s*(.*)/i);
    if (!singleMatch) return false;
    
    const field = singleMatch[1].trim();
    const op = singleMatch[2].trim().toUpperCase();
    let valStr = singleMatch[3].trim();
    
    // strip quotes
    if ((valStr.startsWith("'") && valStr.endsWith("'")) || (valStr.startsWith('"') && valStr.endsWith('"'))) {
      valStr = valStr.substring(1, valStr.length - 1);
    }
    
    const recordVal = record[field];
    if (recordVal === undefined) return false;
    
    if (op === "=") {
      return String(recordVal).toLowerCase() == valStr.toLowerCase();
    } else if (op === ">") {
      return parseFloat(recordVal) > parseFloat(valStr);
    } else if (op === "<") {
      return parseFloat(recordVal) < parseFloat(valStr);
    } else if (op === "LIKE") {
      const searchPattern = valStr.replace(/%/g, "").toLowerCase();
      return String(recordVal).toLowerCase().includes(searchPattern);
    }
    return false;
  });
  
  if (operators === "AND") {
    return results.every(r => r === true);
  } else if (operators === "OR") {
    return results.some(r => r === true);
  } else {
    return results[0];
  }
}
