-- File: module1_core.sql
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



-- File: module2_income.sql
-- Module 2: Income Tables (shared)
USE itr_db;

-- Salary income (one per return but can have many employers)
CREATE TABLE IF NOT EXISTS salary_income (
    salary_income_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    employer_name VARCHAR(255),
    employer_tan VARCHAR(50),
    gross_salary DECIMAL(18,2),
    salary DECIMAL(18,2),
    perquisites_value DECIMAL(18,2),
    profits_in_salary DECIMAL(18,2),
    net_salary DECIMAL(18,2),
    standard_deduction DECIMAL(18,2),
    professional_tax DECIMAL(18,2),
    total_tds_salary DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- House property income (multiple properties possible)
CREATE TABLE IF NOT EXISTS house_property_income (
    house_property_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    type_of_hp VARCHAR(50),
    gross_rent_received DECIMAL(18,2),
    tax_paid_local_authority DECIMAL(18,2),
    annual_value DECIMAL(18,2),
    interest_payable DECIMAL(18,2),
    arrears_unrealized_rent_received DECIMAL(18,2),
    total_income_of_hp DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Other income and nested details
CREATE TABLE IF NOT EXISTS other_income (
    other_income_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    nature_desc VARCHAR(255),
    amount DECIMAL(18,2),
    is_notified_89a BOOLEAN DEFAULT FALSE,
    notified_country_code VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table to capture details of 'OthersIncDtlsOthSrc' (repeatable)
CREATE TABLE IF NOT EXISTS others_income_details (
    others_income_details_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    other_income_id BIGINT,
    oth_src_nature_desc VARCHAR(255),
    oth_src_amount DECIMAL(18,2),
    dividend_date_upto15_6 DECIMAL(18,2),
    dividend_date_upto15_9 DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (other_income_id) REFERENCES other_income(other_income_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- LTCG 112A (if applicable)
CREATE TABLE IF NOT EXISTS ltcg_112a (
    ltcg_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    tot_sale_consideration DECIMAL(18,2),
    tot_cost_acquisition DECIMAL(18,2),
    long_cap_112a DECIMAL(18,2),
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- File: module3_deductions.sql
-- Module 3: Deductions (Chapter VIA and others)
USE itr_db;

-- Chapter VIA master (one record per return summarizing)
CREATE TABLE IF NOT EXISTS deductions_chapter6a (
    deductions_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    section_80c DECIMAL(18,2),
    section_80ccc DECIMAL(18,2),
    section_80ccd1b DECIMAL(18,2),
    section_80ccd_employer DECIMAL(18,2),
    section_80d DECIMAL(18,2),
    section_80ddb DECIMAL(18,2),
    section_80e DECIMAL(18,2),
    section_80ee DECIMAL(18,2),
    section_80g DECIMAL(18,2),
    section_80gg DECIMAL(18,2),
    total_chapter_via_deductions DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Schedule 80C individual entries
CREATE TABLE IF NOT EXISTS schedule_80c_details (
    sec80c_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    amount DECIMAL(18,2),
    identification_no VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Schedule 80D insurer/payment details (repeatable entries for self/family/parents)
CREATE TABLE IF NOT EXISTS schedule_80d_insurer_details (
    sec80d_ins_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    category VARCHAR(100), -- self/family/parents etc
    insurer_name VARCHAR(255),
    policy_no VARCHAR(255),
    health_ins_amt DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- File: module4_tds_tcs.sql
-- Module 4: TDS / TCS / Tax Payments
USE itr_db;

-- TDS on salary (multiple employers possible)
CREATE TABLE IF NOT EXISTS tds_on_salary (
    tds_sal_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    employer_name VARCHAR(255),
    employer_tan VARCHAR(50),
    income_charged_salary DECIMAL(18,2),
    total_tds_salary DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- TDS on other than salary
CREATE TABLE IF NOT EXISTS tds_other_than_salary (
    tds_other_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    deductor_name VARCHAR(255),
    deductor_tan VARCHAR(50),
    tds_section VARCHAR(20),
    amt_for_tax_deduct DECIMAL(18,2),
    deducted_year VARCHAR(10),
    tds_deducted DECIMAL(18,2),
    tds_claimed DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- TCS details
CREATE TABLE IF NOT EXISTS tcs_details (
    tcs_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    collector_name VARCHAR(255),
    collector_tan VARCHAR(50),
    amt_tax_collected DECIMAL(18,2),
    collected_year VARCHAR(10),
    total_tcs DECIMAL(18,2),
    amt_tcs_claimed_this_year DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tax payments / challans
CREATE TABLE IF NOT EXISTS tax_payments (
    tax_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    bsr_code VARCHAR(50),
    date_deposited DATE,
    serial_no_of_challan VARCHAR(50),
    amount DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- File: module5_tax_calc.sql
-- Module 5: Tax Computation and Refunds
USE itr_db;

CREATE TABLE IF NOT EXISTS tax_computation (
    tax_comp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    total_tax_payable DECIMAL(18,2),
    rebate_87a DECIMAL(18,2),
    tax_payable_on_rebate DECIMAL(18,2),
    education_cess DECIMAL(18,2),
    gross_tax_liability DECIMAL(18,2),
    section_89 DECIMAL(18,2),
    net_tax_liability DECIMAL(18,2),
    total_interest_pay DECIMAL(18,2),
    total_tax_plus_interest_pay DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Interest details (234A/234B/234C/234F)
CREATE TABLE IF NOT EXISTS interest_details (
    interest_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tax_comp_id BIGINT,
    intr_234a DECIMAL(18,2),
    intr_234b DECIMAL(18,2),
    intr_234c DECIMAL(18,2),
    late_filing_fee_234f DECIMAL(18,2),
    FOREIGN KEY (tax_comp_id) REFERENCES tax_computation(tax_comp_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Refunds and bank details (for refund specifics)
CREATE TABLE IF NOT EXISTS refund_details (
    refund_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    refund_due DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- File: module6_schedules.sql
-- Module 6: Schedules (80G, 80GGA, 80GGC etc.)
USE itr_db;

-- Schedule 80G: Donee with PAN (repeatable)
CREATE TABLE IF NOT EXISTS schedule_80g_donee (
    donee_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    category VARCHAR(50), -- e.g., Don100Percent / Don50PercentNoApprReqd / ...
    donee_name VARCHAR(255),
    donee_pan VARCHAR(20),
    arn_number VARCHAR(100),
    addr_detail TEXT,
    city_or_town VARCHAR(255),
    state_code VARCHAR(10),
    pin_code VARCHAR(20),
    donation_amt_cash DECIMAL(18,2),
    donation_amt_other_mode DECIMAL(18,2),
    donation_amt DECIMAL(18,2),
    eligible_donation_amt DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Schedule 80GGA: details for scientific/research/rural dev donations
CREATE TABLE IF NOT EXISTS schedule_80gga (
    gga_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    relevant_clause VARCHAR(100),
    name_of_donee VARCHAR(255),
    donee_pan VARCHAR(20),
    addr_detail TEXT,
    donation_amt_cash DECIMAL(18,2),
    donation_amt_other_mode DECIMAL(18,2),
    donation_amt DECIMAL(18,2),
    eligible_donation_amt DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Schedule 80GGC: employer contributions (repeatable)
CREATE TABLE IF NOT EXISTS schedule_80ggc (
    ggc_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    donation_date DATE,
    donation_amt_cash DECIMAL(18,2),
    donation_amt_other_mode DECIMAL(18,2),
    transaction_ref_num VARCHAR(255),
    ifsc_code VARCHAR(20),
    donation_amt DECIMAL(18,2),
    eligible_donation_amt DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- File: module7_itr1_specific.sql
-- Module 7: ITR1-specific and ITR-specific overrides
USE itr_db;

-- Some ITR1-specific fields or small overrides (example)
CREATE TABLE IF NOT EXISTS itr1_specific (
    itr1_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    form_itr1_name VARCHAR(255),
    sw_version_no VARCHAR(100),
    json_created_by VARCHAR(255),
    json_creation_date DATETIME,
    intermediary_city VARCHAR(255),
    digest VARCHAR(255),
    verification_place VARCHAR(255),
    verification_capacity VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Example: storing tax return preparer details (could be common)
CREATE TABLE IF NOT EXISTS tax_return_preparer (
    preparer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT,
    identification_no_of_trp VARCHAR(255),
    name_of_trp VARCHAR(255),
    reimb_from_gov DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;


