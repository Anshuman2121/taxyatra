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
