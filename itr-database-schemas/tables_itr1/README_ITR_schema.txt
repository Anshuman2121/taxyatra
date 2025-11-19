ITR Modular MySQL Schema (Module-wise)

Files created in /mnt/data:
- module1_core.sql        : Core return, person, address, bank accounts
- module2_income.sql      : Salary, house property, other income, LTCG112A
- module3_deductions.sql  : Chapter VIA summaries and details
- module4_tds_tcs.sql     : TDS on salary, TDS on other income, TCS, tax payments
- module5_tax_calc.sql    : Tax computation, interest, refunds
- module6_schedules.sql   : Schedule 80G, 80GGA, 80GGC
- module7_itr1_specific.sql : ITR1-specific fields & preparer
- all_modules_combined.sql : All modules concatenated (useful to run once)

Usage:
1. Move the SQL files to your MySQL server environment.
2. Run the combined SQL (all_modules_combined.sql) in MySQL 8.x client to create the database and tables.
3. Adjust data types if you need finer granularity (e.g., DECIMAL precision).
4. Add indexes on frequently queried columns (PAN, assessment_year, return_id).
5. You may add additional ITR-specific tables (itr2_*, itr3_*, etc.) following the pattern.

If you want, I can:
- Generate migration scripts for an existing DB.
- Add sample INSERT statements mapping keys from your JSON.
- Create an ER diagram (DOT / PNG).
