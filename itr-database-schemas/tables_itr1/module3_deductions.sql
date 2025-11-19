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
