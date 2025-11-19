-- Module 1: Core Return Tables (shared across ITRs)
-- MySQL 8.x, InnoDB, utf8mb4

CREATE DATABASE IF NOT EXISTS itr_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE itr_db;

-- Master return table for all ITRs
CREATE TABLE IF NOT EXISTS itr_return (
    return_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    itr_type VARCHAR(10) NOT NULL, -- e.g., ITR1, ITR2, ITR3...
    assessment_year VARCHAR(9), -- e.g., 2024-25
    pan VARCHAR(20),
    person_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status VARCHAR(50),
    UNIQUE KEY uq_return_pan_yr (pan, assessment_year)
) ENGINE=InnoDB;

-- Person table (shared)
CREATE TABLE IF NOT EXISTS person (
    person_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pan VARCHAR(20) UNIQUE,
    first_name VARCHAR(150),
    middle_name VARCHAR(150),
    last_name VARCHAR(150),
    dob DATE,
    aadhaar VARCHAR(20),
    email VARCHAR(255),
    mobile VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Address (one-to-many: person -> address)
CREATE TABLE IF NOT EXISTS address (
    address_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    person_id BIGINT,
    address_type VARCHAR(50), -- residence / office
    residence_no VARCHAR(100),
    residence_name VARCHAR(255),
    road_or_street VARCHAR(255),
    locality_or_area VARCHAR(255),
    city_or_town_or_district VARCHAR(255),
    state_code VARCHAR(10),
    country_code VARCHAR(5),
    pin_code VARCHAR(20),
    zip_code VARCHAR(20),
    country_code_mobile VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bank accounts (used for refunds)
CREATE TABLE IF NOT EXISTS bank_account (
    bank_account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    person_id BIGINT,
    ifsc_code VARCHAR(20),
    bank_name VARCHAR(255),
    bank_account_no VARCHAR(50),
    account_type VARCHAR(30),
    use_for_refund BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional: a small lookup for form metadata (versioning)
CREATE TABLE IF NOT EXISTS form_metadata (
    form_meta_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    itr_type VARCHAR(10),
    form_name VARCHAR(100),
    form_version VARCHAR(50),
    schema_version VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Link itr_return to person if person exists
ALTER TABLE itr_return
    ADD CONSTRAINT fk_itr_return_person FOREIGN KEY (person_id) REFERENCES person(person_id);
