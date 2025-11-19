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
