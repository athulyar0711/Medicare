-- ============================================================
-- MEDICARE TEST DATABASE SCHEMA
-- Run this to create / reset the medicare_test database.
-- Safe to re-run: drops and recreates the DB from scratch.
-- ============================================================

DROP DATABASE IF EXISTS medicare_test;
CREATE DATABASE medicare_test;
USE medicare_test;

-- -------------------------
-- TABLES
-- -------------------------

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS health_metrics;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_hospital_schedule;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS doctor_users;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor_user', 'admin') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    phone VARCHAR(15),
    address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    specialization VARCHAR(100),
    phone VARCHAR(15),
    is_app_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNIQUE,
    user_id INT UNIQUE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
);

CREATE TABLE hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    address TEXT,
    phone VARCHAR(15)
);

CREATE TABLE doctor_hospital_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id   INT,
    hospital_id INT,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    start_time  TIME,
    end_time    TIME,
    FOREIGN KEY (doctor_id)   REFERENCES doctors(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT,
    doctor_id           INT,
    hospital_id         INT,
    appointment_datetime DATETIME,
    status ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)  REFERENCES patients(id),
    FOREIGN KEY (doctor_id)   REFERENCES doctors(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT,
    title            VARCHAR(100),
    description      TEXT,
    interval_minutes INT,
    next_trigger     DATETIME,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE health_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id  INT,
    height      DECIMAL(5,2),
    weight      DECIMAL(5,2),
    bmi         DECIMAL(5,2),
    blood_sugar DECIMAL(5,2),
    vitamin_d   DECIMAL(5,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE push_subscriptions (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id  INT,
    endpoint TEXT NOT NULL,
    p256dh   TEXT NOT NULL,
    auth     TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- SEED DATA  (used by integration & E2E tests)
-- Passwords below are bcrypt hashes of "TestPass1!"
-- hash = $2a$10$7/Zb.6.pDKd4/EOCwpJRoeGR/vQxPv1o7IwP.5yM5p.9JPR7SO8ii
-- ============================================================

-- ---- Hospitals ----
INSERT INTO hospitals (id, name, address, phone) VALUES
(1, 'City General Hospital',  '12 Main Street, Kochi',       '0484-2000001'),
(2, 'St. Mary Medical Centre','45 Church Road, Ernakulam',   '0484-2000002'),
(3, 'Apollo Clinic',          '88 MG Road, Thrissur',        '0487-2000003');

-- ---- Admin user ----
-- password: TestPass1!
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Admin User', 'admin@medicare.test',
 '$2a$10$7/Zb.6.pDKd4/EOCwpJRoeGR/vQxPv1o7IwP.5yM5p.9JPR7SO8ii',
 'admin');

-- ---- Test Patient ----
INSERT INTO users (id, name, email, password, role) VALUES
(2, 'Alice Patient', 'alice@medicare.test',
 '$2a$10$7/Zb.6.pDKd4/EOCwpJRoeGR/vQxPv1o7IwP.5yM5p.9JPR7SO8ii',
 'patient');
INSERT INTO patients (id, user_id, phone, address) VALUES
(1, 2, '9876543210', '10 Palm Avenue, Kochi');

-- ---- Second Test Patient ----
INSERT INTO users (id, name, email, password, role) VALUES
(3, 'Bob Patient', 'bob@medicare.test',
 '$2a$10$7/Zb.6.pDKd4/EOCwpJRoeGR/vQxPv1o7IwP.5yM5p.9JPR7SO8ii',
 'patient');
INSERT INTO patients (id, user_id, phone, address) VALUES
(2, 3, '9123456789', '22 Lake View, Thrissur');

-- ---- Test Doctor ----
INSERT INTO doctors (id, name, email, specialization, phone, is_app_user) VALUES
(1, 'Dr. Rahul Sharma', 'rahul@medicare.test', 'Cardiology', '9011122233', TRUE);

INSERT INTO users (id, name, email, password, role) VALUES
(4, 'Dr. Rahul Sharma', 'rahul@medicare.test',
 '$2a$10$7/Zb.6.pDKd4/EOCwpJRoeGR/vQxPv1o7IwP.5yM5p.9JPR7SO8ii',
 'doctor_user');
INSERT INTO doctor_users (doctor_id, user_id) VALUES (1, 4);

-- ---- Doctor Schedule ----
INSERT INTO doctor_hospital_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time) VALUES
(1, 1, 'Monday',    '09:00:00', '13:00:00'),
(1, 1, 'Tuesday',   '09:00:00', '13:00:00'),
(1, 1, 'Wednesday', '09:00:00', '13:00:00'),
(1, 1, 'Thursday',  '09:00:00', '13:00:00'),
(1, 1, 'Saturday',  '09:00:00', '13:00:00'),
(1, 1, 'Sunday',    '09:00:00', '13:00:00'),
(1, 2, 'Friday',    '14:00:00', '18:00:00');

-- ---- Second Test Doctor (non-app user, for admin tests) ----
INSERT INTO doctors (id, name, email, specialization, phone, is_app_user) VALUES
(2, 'Dr. Priya Nair', 'priya@medicare.test', 'Dermatology', '9022233344', FALSE);

-- ---- Sample Appointment (for doctor dashboard tests) ----
INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_datetime, status) VALUES
(1, 1, 1, DATE_ADD(NOW(), INTERVAL 2 DAY), 'scheduled');

-- ---- Sample Health Metrics for Alice ----
INSERT INTO health_metrics (patient_id, height, weight, bmi, blood_sugar, vitamin_d) VALUES
(1, 165.00, 60.00, 22.04, 90.5, 28.3);

-- ---- Sample Reminder for Alice ----
INSERT INTO reminders (user_id, title, description, interval_minutes, next_trigger, is_active) VALUES
(2, 'Take Vitamin D', 'Take one tablet after breakfast', 1440,
 DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE);
