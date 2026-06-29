# Grey Water Management (GWM) – Mechanism for Treating Grey Water and Black Water Together in Densely Populated Areas

## Project Overview

The **Grey Water Management (GWM)** system is a web-based application designed to monitor and manage the treatment of grey water and black water in densely populated areas. The system helps administrators, operators, and users track wastewater collection, treatment processes, water quality, and reuse efficiently. It provides a centralized platform for monitoring treatment plants, maintaining records, and improving sustainable water management.

---

# Problem Statement

Rapid urbanization and increasing population have resulted in large amounts of grey water and black water being generated every day. In many densely populated areas, there is limited land available for separate treatment plants, making wastewater management difficult. Manual monitoring often leads to poor record management, inefficient treatment, and environmental pollution. A centralized Grey Water Management System is required to efficiently monitor, manage, and optimize wastewater treatment and reuse.

---

# Project Objectives

- Provide a centralized platform for managing grey water and black water treatment.
- Monitor wastewater collection and treatment processes.
- Track water quality before and after treatment.
- Maintain treatment records and operational history.
- Reduce environmental pollution through efficient wastewater management.
- Promote safe water reuse for gardening, flushing, and irrigation.

---

# User Roles

- Admin
- Plant Manager
- Treatment Operator
- Maintenance Staff
- Resident / User

---

# Module List

## Dashboard

Displays system overview including wastewater collected, treated water, pending maintenance, and treatment statistics.

## Water Collection Management

Records grey water and black water collection from different locations.

## Treatment Management

Monitors different treatment stages and processing status.

## Water Quality Monitoring

Stores water quality parameters such as pH, TDS, Turbidity, and BOD.

## User Management

Manages user accounts, roles, and permissions.

## Maintenance Management

Tracks equipment maintenance schedules and repair history.

## Notifications

Sends alerts regarding maintenance, treatment failures, and water quality issues.

## Reports (Future Enhancement)

Generates reports on water treatment efficiency, water reuse, and operational statistics.

---

# Use Case Diagram

## Description

The Use Case Diagram illustrates the interaction between different users and the Grey Water Management System.

### Actors

- Admin
- Plant Manager
- Treatment Operator
- Maintenance Staff
- Resident / User

### Main Use Cases

- Login
- Manage Users
- Record Water Collection
- Monitor Treatment Process
- Monitor Water Quality
- Approve Water Reuse
- Schedule Maintenance
- View Reports
- Receive Notifications
- Update Profile

---

# Table List

| Table Name | Purpose |
|------------|---------|
| Users | Stores user login details and role information |
| Water_Collections | Stores grey water and black water collection details |
| Treatment_Process | Stores treatment stage information |
| Water_Quality | Stores water quality test results |
| Maintenance | Stores maintenance schedules and repair records |
| Notifications | Stores alerts and notification details |
| Reports | Stores generated report information |

---

# ER Diagram

## Description

The ER Diagram represents the database structure of the Grey Water Management System. It shows relationships among Users, Water Collection, Treatment Process, Water Quality, Maintenance, and Notifications.

### Entities

- Users
- Water_Collections
- Treatment_Process
- Water_Quality
- Maintenance
- Notifications

### Relationships

- One User can manage multiple Water Collections.
- One Water Collection can have multiple Treatment Processes.
- Each Treatment Process can have multiple Water Quality records.
- One Treatment Unit can have multiple Maintenance records.
- Notifications are generated for users based on system events.

---

# SQL Schema

## Users Table

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100),
    role VARCHAR(30)
);
```

## Water Collections Table

```sql
CREATE TABLE water_collections (
    collection_id INT PRIMARY KEY AUTO_INCREMENT,
    source_type VARCHAR(20),
    quantity DECIMAL(10,2),
    collection_date DATE,
    location VARCHAR(100)
);
```

## Treatment Process Table

```sql
CREATE TABLE treatment_process (
    process_id INT PRIMARY KEY AUTO_INCREMENT,
    collection_id INT,
    treatment_stage VARCHAR(100),
    status VARCHAR(30),
    process_date DATE,
    FOREIGN KEY (collection_id)
    REFERENCES water_collections(collection_id)
);
```

## Water Quality Table

```sql
CREATE TABLE water_quality (
    quality_id INT PRIMARY KEY AUTO_INCREMENT,
    process_id INT,
    ph DECIMAL(4,2),
    tds DECIMAL(6,2),
    bod DECIMAL(6,2),
    turbidity DECIMAL(6,2),
    test_date DATE,
    FOREIGN KEY (process_id)
    REFERENCES treatment_process(process_id)
);
```

## Maintenance Table

```sql
CREATE TABLE maintenance (
    maintenance_id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_name VARCHAR(100),
    maintenance_date DATE,
    status VARCHAR(30)
);
```

## Notifications Table

```sql
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    message TEXT,
    notification_date DATE,
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
);
```

---

# Future Enhancements

- IoT sensor integration for real-time water quality monitoring.
- AI-based prediction of maintenance requirements.
- Mobile application for monitoring treatment plants.
- Automatic alert system for contamination detection.
- Dashboard with advanced analytics and graphical reports.
- Integration with smart city water management systems.

---

# Technologies Used

| Component | Technology |
|-----------|------------|
| Frontend | HTML, CSS, JavaScript, Bootstrap |
| Backend | PHP / Java (Servlets & JSP) / Spring Boot |
| Database | MySQL |
| Server | XAMPP / Apache Tomcat |
| Tools | VS Code, Eclipse / IntelliJ IDEA, MySQL Workbench |<img width="1402" height="1122" alt="ER Diagram" src="https://github.com/user-attachments/assets/a8ba0a79-fc4c-4d2c-bae2-a5a2115750ba" />

<img width="1536" height="1024" alt="Use Case Diagram" src="https://github.com/user-attachments/assets/1576894d-2fd9-47b5-a378-f92f8819ee25" />
<img width="1536" height="1024" alt="Database Schema Diagram" src="https://github.com/user-attachments/assets/5f8c3d43-4704-4453-b51f-3c40a8e71841" />

