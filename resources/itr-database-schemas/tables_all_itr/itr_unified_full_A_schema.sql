-- FULL HIGHLY-NORMALIZED ITR SCHEMA (Option A)
CREATE DATABASE IF NOT EXISTS itr_unified_full DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE itr_unified_full;
\n
CREATE TABLE itr_return (
  return_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  itr_type VARCHAR(10),
  assessment_year VARCHAR(9),
  pan VARCHAR(20),
  filing_section VARCHAR(50),
  orig_return_date DATE,
  receipt_no VARCHAR(100),
  notice_section VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
\n
CREATE TABLE person (
  person_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  pan VARCHAR(20),
  person_type VARCHAR(50),
  first_name VARCHAR(200),
  middle_name VARCHAR(200),
  last_name_or_org_name VARCHAR(300),
  dob DATE,
  date_of_incorp DATE,
  aadhaar VARCHAR(20),
  email VARCHAR(255),
  mobile VARCHAR(30),
  status_or_company_type VARCHAR(100),
  sub_status VARCHAR(100)
) ENGINE=InnoDB;
\n
CREATE TABLE address (
  address_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  person_id BIGINT,
  address_type VARCHAR(50),
  residence_no VARCHAR(200),
  residence_name VARCHAR(200),
  street VARCHAR(300),
  locality VARCHAR(255),
  city VARCHAR(150),
  state_code VARCHAR(20),
  country_code VARCHAR(10),
  pin_code VARCHAR(20),
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE bank_account (
  bank_account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  person_id BIGINT,
  ifsc VARCHAR(20),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  account_type VARCHAR(50),
  use_for_refund BOOLEAN DEFAULT FALSE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE intermediary_creation_info (
  creation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  sw_version_no VARCHAR(100),
  json_created_by VARCHAR(100),
  json_creation_date DATETIME,
  intermediary_city VARCHAR(100),
  digest VARCHAR(255),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE salary_income (
  salary_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  employer_name VARCHAR(255),
  employer_tan VARCHAR(50),
  nature_of_employment VARCHAR(100),
  gross_salary DECIMAL(18,2),
  salary DECIMAL(18,2),
  perquisites_value DECIMAL(18,2),
  profits_in_lieu DECIMAL(18,2),
  standard_deduction DECIMAL(18,2),
  professional_tax DECIMAL(18,2),
  net_salary DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE salary_allowance_detail (
  allowance_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  salary_id BIGINT,
  allowance_code VARCHAR(100),
  amount DECIMAL(18,2),
  exempt_amount DECIMAL(18,2),
  FOREIGN KEY(salary_id) REFERENCES salary_income(salary_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE salary_perquisites (
  perq_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  salary_id BIGINT,
  description VARCHAR(400),
  taxable_value DECIMAL(18,2),
  FOREIGN KEY(salary_id) REFERENCES salary_income(salary_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE house_property (
  hp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  property_ref VARCHAR(100),
  property_type VARCHAR(50),
  is_co_owned BOOLEAN,
  share_percentage DECIMAL(5,2),
  annual_letable_value DECIMAL(18,2),
  municipal_taxes DECIMAL(18,2),
  interest_24b DECIMAL(18,2),
  total_income DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE hp_coowner (
  coowner_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  hp_id BIGINT,
  name VARCHAR(255),
  pan VARCHAR(20),
  aadhaar VARCHAR(20),
  share_percentage DECIMAL(5,2),
  FOREIGN KEY(hp_id) REFERENCES house_property(hp_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE hp_section24b_loan (
  loan_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  hp_id BIGINT,
  lender_name VARCHAR(255),
  loan_account_ref VARCHAR(100),
  date_of_loan DATE,
  total_loan_amount DECIMAL(18,2),
  interest_paid DECIMAL(18,2),
  FOREIGN KEY(hp_id) REFERENCES house_property(hp_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE other_income (
  other_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  nature_desc VARCHAR(400),
  amount DECIMAL(18,2),
  is_notified_89a BOOLEAN,
  notified_country VARCHAR(10),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE other_income_details (
  detail_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  other_id BIGINT,
  sub_nature VARCHAR(255),
  amount DECIMAL(18,2),
  dividend_details JSON,
  FOREIGN KEY(other_id) REFERENCES other_income(other_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE capital_gain_main (
  cg_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  asset_type VARCHAR(100),
  transaction_type VARCHAR(50),
  full_consideration DECIMAL(18,2),
  date_of_acquisition DATE,
  date_of_transfer DATE,
  cost_of_acquisition DECIMAL(18,2),
  cost_of_improvement DECIMAL(18,2),
  expenses_on_transfer DECIMAL(18,2),
  indexed_cost DECIMAL(18,2),
  capital_gain DECIMAL(18,2),
  section_applied VARCHAR(50),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE capital_gain_exemption (
  cg_ex_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cg_id BIGINT,
  exemption_section VARCHAR(50),
  exemption_amount DECIMAL(18,2),
  notes VARCHAR(500),
  FOREIGN KEY(cg_id) REFERENCES capital_gain_main(cg_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE capital_gain_sharebuyers (
  buyer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cg_id BIGINT,
  buyer_name VARCHAR(255),
  buyer_pan VARCHAR(20),
  percentage_share DECIMAL(6,2),
  amount_received DECIMAL(18,2),
  FOREIGN KEY(cg_id) REFERENCES capital_gain_main(cg_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE business_income_main (
  bus_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  nature_of_business_code VARCHAR(50),
  gross_receipts DECIMAL(18,2),
  turnover DECIMAL(18,2),
  total_expenses DECIMAL(18,2),
  profit_before_tax DECIMAL(18,2),
  presumptive_method VARCHAR(50),
  presumptive_income_amount DECIMAL(18,2),
  books_maintained BOOLEAN,
  audit_required BOOLEAN,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE manufacturing_account (
  man_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id BIGINT,
  opening_inventory DECIMAL(18,2),
  purchases DECIMAL(18,2),
  direct_wages DECIMAL(18,2),
  factory_overheads DECIMAL(18,2),
  closing_stock DECIMAL(18,2),
  cost_of_goods_produced DECIMAL(18,2),
  FOREIGN KEY(bus_id) REFERENCES business_income_main(bus_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE trading_account (
  trad_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id BIGINT,
  sale_of_goods DECIMAL(18,2),
  sale_of_services DECIMAL(18,2),
  other_operating_revenue JSON,
  gross_receipts_total DECIMAL(18,2),
  direct_expenses_total DECIMAL(18,2),
  gross_profit DECIMAL(18,2),
  FOREIGN KEY(bus_id) REFERENCES business_income_main(bus_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE balance_sheet_header (
  bs_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  total_assets DECIMAL(18,2),
  total_liabilities DECIMAL(18,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE balance_sheet_assets (
  asset_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bs_id BIGINT,
  asset_type VARCHAR(100),
  gross_block DECIMAL(18,2),
  depreciation DECIMAL(18,2),
  net_block DECIMAL(18,2),
  FOREIGN KEY(bs_id) REFERENCES balance_sheet_header(bs_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE profit_and_loss_header (
  pl_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  gross_turnover DECIMAL(18,2),
  net_profit DECIMAL(18,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES person(person_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE pl_revenue_detail (
  rev_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  pl_id BIGINT,
  description VARCHAR(255),
  amount DECIMAL(18,2),
  FOREIGN KEY(pl_id) REFERENCES profit_and_loss_header(pl_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE pl_expense_detail (
  exp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  pl_id BIGINT,
  description VARCHAR(255),
  amount DECIMAL(18,2),
  FOREIGN KEY(pl_id) REFERENCES profit_and_loss_header(pl_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE depreciation_block (
  dep_block_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  description VARCHAR(255),
  total_gross_block DECIMAL(18,2),
  total_depreciation DECIMAL(18,2),
  total_net_block DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE depreciation_assets (
  dep_asset_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  dep_block_id BIGINT,
  asset_description VARCHAR(255),
  gross_value DECIMAL(18,2),
  depreciation_amt DECIMAL(18,2),
  net_value DECIMAL(18,2),
  FOREIGN KEY(dep_block_id) REFERENCES depreciation_block(dep_block_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE investments (
  inv_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  investment_type VARCHAR(100),
  amount DECIMAL(18,2),
  details JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE loans_and_advances (
  loan_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  borrower_name VARCHAR(255),
  amount DECIMAL(18,2),
  purpose VARCHAR(255),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE inventories (
  inv_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  description VARCHAR(255),
  opening_stock DECIMAL(18,2),
  purchases DECIMAL(18,2),
  closing_stock DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE sundry_debtors (
  debtor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  name VARCHAR(255),
  outstanding_amount DECIMAL(18,2),
  aging_info JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE sundry_creditors (
  creditor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  name VARCHAR(255),
  outstanding_amount DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE deductions_master (
  deduction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  section_code VARCHAR(50),
  amount DECIMAL(18,2),
  details JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE schedule_80g (
  s80g_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  donee_name VARCHAR(255),
  donee_pan VARCHAR(20),
  donation_date DATE,
  donation_amount DECIMAL(18,2),
  eligible_amount DECIMAL(18,2),
  mode_of_donation VARCHAR(50),
  arn VARCHAR(100),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE schedule_80gga (
  s80gga_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  donee_name VARCHAR(255),
  donee_pan VARCHAR(20),
  donation_amount DECIMAL(18,2),
  eligible_amount DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE schedule_80ggc (
  s80ggc_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  employer_name VARCHAR(255),
  donation_amount DECIMAL(18,2),
  eligible_amount DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE tds_salary (
  tds_sal_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  employer_name VARCHAR(255),
  tan VARCHAR(50),
  income_chargeable DECIMAL(18,2),
  tds_deducted DECIMAL(18,2),
  tds_claimed DECIMAL(18,2),
  financial_year VARCHAR(9),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE tds_other (
  tds_other_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  deductor_name VARCHAR(255),
  tan VARCHAR(50),
  section VARCHAR(20),
  amount DECIMAL(18,2),
  tds_deducted DECIMAL(18,2),
  tds_claimed DECIMAL(18,2),
  foreign_key_ref VARCHAR(100),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE tcs_details (
  tcs_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  collector_name VARCHAR(255),
  tan VARCHAR(50),
  amount_collected DECIMAL(18,2),
  amount_claimed DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE tax_payment_challan (
  challan_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  bsr_code VARCHAR(50),
  date_deposited DATE,
  serial_no VARCHAR(50),
  amount DECIMAL(18,2),
  tax_type VARCHAR(50),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE tax_computation (
  tax_comp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  gross_tax DECIMAL(18,2),
  rebate_87a DECIMAL(18,2),
  tax_after_rebate DECIMAL(18,2),
  surcharge DECIMAL(18,2),
  cess DECIMAL(18,2),
  total_tax_liability DECIMAL(18,2),
  tds_tcs_relief DECIMAL(18,2),
  advance_tax DECIMAL(18,2),
  self_assessment_tax DECIMAL(18,2),
  refund_due DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE interest_and_penalties (
  intr_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tax_comp_id BIGINT,
  intr_234a DECIMAL(18,2),
  intr_234b DECIMAL(18,2),
  intr_234c DECIMAL(18,2),
  late_fee_234f DECIMAL(18,2),
  FOREIGN KEY(tax_comp_id) REFERENCES tax_computation(tax_comp_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE refund_details (
  refund_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  refund_due DECIMAL(18,2),
  bank_account_id BIGINT,
  refund_status VARCHAR(50),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE,
  FOREIGN KEY(bank_account_id) REFERENCES bank_account(bank_account_id) ON DELETE SET NULL
) ENGINE=InnoDB;
\n
CREATE TABLE partner_details (
  partner_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  name VARCHAR(255),
  pan VARCHAR(20),
  aadhaar VARCHAR(20),
  share_percentage DECIMAL(5,2),
  remuneration DECIMAL(18,2),
  interest_paid DECIMAL(18,2),
  address_json JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE shareholder_details (
  sh_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  name VARCHAR(255),
  pan VARCHAR(20),
  share_percentage DECIMAL(6,2),
  address_json JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE trust_details (
  trust_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  trust_name VARCHAR(255),
  registration_section VARCHAR(50),
  registration_no VARCHAR(100),
  registration_date DATE,
  objects_json JSON,
  audit_details_json JSON,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE trust_schedule_details (
  tsd_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trust_id BIGINT,
  schedule_code VARCHAR(50),
  amount DECIMAL(18,2),
  description VARCHAR(500),
  FOREIGN KEY(trust_id) REFERENCES trust_details(trust_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE audit_info (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  audited_section VARCHAR(100),
  auditor_name VARCHAR(255),
  auditor_mem_no VARCHAR(100),
  audit_date DATE,
  ack_number VARCHAR(100),
  udin VARCHAR(100),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE foreign_assets (
  fa_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  country_code VARCHAR(10),
  asset_desc VARCHAR(255),
  value DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE foreign_income (
  fi_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  person_id BIGINT,
  country_code VARCHAR(10),
  income_type VARCHAR(100),
  amount DECIMAL(18,2),
  tax_paid_abroad DECIMAL(18,2),
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
\n
CREATE TABLE itr_specific_extra (
  extra_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT,
  itr_type VARCHAR(10),
  extra_json JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(return_id) REFERENCES itr_return(return_id) ON DELETE CASCADE
) ENGINE=InnoDB;
