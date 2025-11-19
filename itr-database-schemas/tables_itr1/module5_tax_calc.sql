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
