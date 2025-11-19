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
