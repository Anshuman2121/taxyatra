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
