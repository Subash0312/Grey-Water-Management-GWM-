# Grey Water Management (GWM) System

A web-based portal designed to monitor and manage the treatment and recycling of grey water and black water in densely populated urban areas. The system empowers administrators, plant managers, operators, maintenance staff, and residents to collaborate on collection, stage progression, quality checks, and equipment maintenance.

---

## 🚀 Key Features

*   **Role-Based Access Control:** Switch between 5 distinct system roles (Admin, Plant Manager, Treatment Operator, Maintenance Crew, Resident) with dynamic menu options.
*   **Wastewater Collection Logs:** Monitor intake parameters (Source, Quantity, Location) for Grey Water and Black Water.
*   **Dynamic Treatment Pipeline:** Process batch tracking through multi-step stages (Primary ➜ Secondary ➜ Tertiary ➜ Disinfection ➜ Treated).
*   **Water Quality Compliance:** Integrated check parameters (pH, TDS, BOD, Turbidity) with alerts for contamination flags before reuse clearance.
*   **Equipment Maintenance Scheduler:** Assign, coordinate, and track repairs of clarifier pumps, blowers, and UV tubes.
*   **In-Browser SQL Query Engine:** Interactive console allowing administrators to run standard SQL queries (e.g. `SELECT` statements with `WHERE`, `ORDER BY`, `LIMIT`) against the simulated LocalStorage database.
*   **Analytical Dashboards:** Real-time collection metrics and status distribution using **Chart.js**.

---

## 🛠️ Technology Stack

*   **Frontend:** HTML5, Vanilla CSS3 (Glassmorphic dark-theme, animations), ES6 JavaScript
*   **Tooling:** Vite (Fast dev server and bundler)
*   **Charts:** Chart.js
*   **Icons:** FontAwesome (via CDN)
*   **Database:** Simulated Relational LocalStorage Database Engine

---

## 💾 SQL Database Schema (Simulated)

The application simulates the following relational tables:

### 1. Users Table
```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100),
    role VARCHAR(30)
);
```

### 2. Water Collections Table
```sql
CREATE TABLE water_collections (
    collection_id INT PRIMARY KEY AUTO_INCREMENT,
    source_type VARCHAR(20), -- 'Grey' or 'Black'
    quantity DECIMAL(10,2),  -- Liters
    collection_date DATE,
    location VARCHAR(100)
);
```

### 3. Treatment Process Table
```sql
CREATE TABLE treatment_process (
    process_id INT PRIMARY KEY AUTO_INCREMENT,
    collection_id INT,
    treatment_stage VARCHAR(100), -- 'Primary', 'Secondary', 'Tertiary', 'Disinfection', 'Treated'
    status VARCHAR(30),          -- 'In Progress', 'Completed', 'Failed'
    process_date DATE,
    FOREIGN KEY (collection_id) REFERENCES water_collections(collection_id)
);
```

### 4. Water Quality Table
```sql
CREATE TABLE water_quality (
    quality_id INT PRIMARY KEY AUTO_INCREMENT,
    process_id INT,
    ph DECIMAL(4,2),        -- Target: 6.5 - 8.5
    tds DECIMAL(6,2),       -- Target: < 500 mg/L
    bod DECIMAL(6,2),       -- Target: < 10 mg/L
    turbidity DECIMAL(6,2), -- Target: < 5 NTU
    test_date DATE,
    FOREIGN KEY (process_id) REFERENCES treatment_process(process_id)
);
```

### 5. Maintenance Table
```sql
CREATE TABLE maintenance (
    maintenance_id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_name VARCHAR(100),
    maintenance_date DATE,
    status VARCHAR(30) -- 'Pending', 'In Progress', 'Completed'
);
```

### 6. Notifications Table
```sql
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    message TEXT,
    notification_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

---

## ⚙️ How to Setup & Run

Follow these steps to run the application locally on your machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Subash0312/Grey-Water-Management-GWM-.git
   cd Grey-Water-Management-GWM-
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the Vite hot-reloading development server, run:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your web browser.

### Building for Production
To bundle and optimize the application for production deployment, run:
```bash
npm run build
```
This generates the optimized static files inside the `dist/` directory.
