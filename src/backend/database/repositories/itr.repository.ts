import Database from 'better-sqlite3';
import { getDatabase } from '../connection';

interface PrefillData {
    personalInfo: any;
    bankAccountDtls: any[];
    form26as: any;
    form24q: any;
    filingStatus: any;
    insights?: any;
}

export class ITRRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /**
     * Save complete prefill data to database
     */
    /**
     * Get complete user data by PAN
     */
    async getUserData(pan: string): Promise<any> {
        try {
            // Get person details
            const person = this.db.prepare('SELECT * FROM "person" WHERE "pan" = ?').get(pan);
            if (!person) return null;
            const personId = (person as any).person_id;

            // Get address
            const address = this.db.prepare('SELECT * FROM "address" WHERE "person_id" = ?').get(personId) || null;

            // Get latest return
            const itrReturn = this.db.prepare('SELECT * FROM "itr_return" WHERE "person_id" = ? ORDER BY "assessment_year" DESC LIMIT 1').get(personId) || null;
            const returnId = itrReturn ? (itrReturn as any).return_id : null;

            // Get bank accounts
            const bankAccounts = this.db.prepare('SELECT * FROM "bank_account" WHERE "person_id" = ?').all(personId);

            let salaryIncome: any[] = [];
            let tdsSalary: any[] = [];
            let otherIncome: any[] = [];
            let deductions: any[] = [];

            if (returnId) {
                // Get salary income
                salaryIncome = this.db.prepare('SELECT * FROM "salary_income" WHERE "return_id" = ?').all(returnId);

                // Get TDS salary
                tdsSalary = this.db.prepare('SELECT * FROM "tds_salary" WHERE "return_id" = ?').all(returnId);

                // Get other income
                otherIncome = this.db.prepare('SELECT * FROM "other_income" WHERE "return_id" = ?').all(returnId);

                // Get deductions
                deductions = this.db.prepare('SELECT * FROM "deductions_master" WHERE "return_id" = ?').all(returnId);
            }

            return {
                personalInfo: { ...(person as any), address },
                itrReturn,
                bankAccounts,
                salaryIncome,
                tdsSalary,
                otherIncome,
                deductions
            };
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    async savePrefillData(pan: string, assessmentYear: string, prefillData: PrefillData): Promise<number> {
        console.log('📊 [ITR Repository] Saving data for PAN:', pan, 'AY:', assessmentYear);
        
        const transaction = this.db.transaction(() => {
            // 1. Save or update person data
            // Pass PAN explicitly as it might be missing in personalInfo
            const personId = this.savePersonData(pan, prefillData.personalInfo);

            // 2. Save or update address
            this.saveAddress(personId, prefillData.personalInfo.address);

            // 3. Save or update ITR return record
            const returnId = this.saveITRReturn(personId, pan, assessmentYear, prefillData);

            // 4. Save bank accounts
            if (prefillData.bankAccountDtls && prefillData.bankAccountDtls.length > 0) {
                console.log('🏦 [ITR Repository] Saving', prefillData.bankAccountDtls.length, 'bank accounts...');
                this.saveBankAccounts(personId, prefillData.bankAccountDtls);
                console.log('✅ [ITR Repository] Bank accounts saved');
            } else {
                console.log('ℹ️  [ITR Repository] No bank accounts to save');
            }

            // 5. Save salary income from insights
            if (prefillData.insights?.salaries?.salary) {
                const salaryCount = Array.isArray(prefillData.insights.salaries.salary) ? prefillData.insights.salaries.salary.length : 1;
                console.log('💼 [ITR Repository] Saving', salaryCount, 'salary income record(s)...');
                this.saveSalaryIncome(returnId, personId, prefillData.insights.salaries.salary);
                console.log('✅ [ITR Repository] Salary income saved');
            } else {
                console.log('ℹ️  [ITR Repository] No salary income to save');
            }

            // 6. Save TDS on salary from form26as
            if (prefillData.form26as?.tdsOnSalaries?.tdsOnSalary) {
                const tdsCount = Array.isArray(prefillData.form26as.tdsOnSalaries.tdsOnSalary) ? prefillData.form26as.tdsOnSalaries.tdsOnSalary.length : 1;
                console.log('📊 [ITR Repository] Saving', tdsCount, 'TDS salary record(s)...');
                this.saveTDSSalary(returnId, prefillData.form26as.tdsOnSalaries.tdsOnSalary);
                console.log('✅ [ITR Repository] TDS salary saved');
            } else {
                console.log('ℹ️  [ITR Repository] No TDS salary to save');
            }

            // 7. Save other income
            if (prefillData.form26as?.incomeDeductionsOthersInc) {
                const otherIncomeCount = Array.isArray(prefillData.form26as.incomeDeductionsOthersInc) ? prefillData.form26as.incomeDeductionsOthersInc.length : 1;
                console.log('💰 [ITR Repository] Saving', otherIncomeCount, 'other income record(s)...');
                this.saveOtherIncome(returnId, personId, prefillData.form26as.incomeDeductionsOthersInc);
                console.log('✅ [ITR Repository] Other income saved');
            } else {
                console.log('ℹ️  [ITR Repository] No other income to save');
            }

            // 8. Save deductions from form24q
            if (prefillData.form24q?.usrDeductUndChapVIAType) {
                const deductionCount = Object.keys(prefillData.form24q.usrDeductUndChapVIAType).length;
                console.log('🎯 [ITR Repository] Saving', deductionCount, 'deduction(s)...');
                this.saveDeductions(returnId, prefillData.form24q.usrDeductUndChapVIAType);
                console.log('✅ [ITR Repository] Deductions saved');
            } else {
                console.log('ℹ️  [ITR Repository] No deductions to save');
            }

            console.log('✅ [ITR Repository] Transaction committed successfully');
            console.log('🎉 [ITR Repository] All data saved! Return ID:', returnId);
            return returnId;
        });

        try {
            return transaction();
        } catch (error) {
            console.error('❌ [ITR Repository] Error saving prefill data, transaction rolled back:', error);
            throw error;
        }
    }

    private savePersonData(pan: string, personalInfo: any): number {
        const { assesseeName, dob, aadhaarCardNo, address, orgFirmInfo } = personalInfo;
        console.log('  → Saving person:', assesseeName?.firstName, assesseeName?.surNameOrOrgName, '(PAN:', pan + ')');

        const stmt = this.db.prepare(`
            INSERT INTO "person" (
                "pan", "first_name", "last_name_or_org_name", 
                "dob", "aadhaar", "email", "mobile", "status_or_company_type"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT ("pan") DO UPDATE SET
                "first_name" = excluded."first_name",
                "last_name_or_org_name" = excluded."last_name_or_org_name",
                "dob" = excluded."dob",
                "aadhaar" = excluded."aadhaar",
                "email" = excluded."email",
                "mobile" = excluded."mobile",
                "status_or_company_type" = excluded."status_or_company_type"
        `);

        const result = stmt.run(
            pan,
            assesseeName?.firstName || null,
            assesseeName?.surNameOrOrgName || null,
            dob || null,
            aadhaarCardNo || null,
            address?.emailAddress || null,
            address?.mobileNo?.toString() || null,
            orgFirmInfo?.StatusOrCompanyType || null
        );

        // Get the person_id - either from insert or from existing record
        const personId = result.lastInsertRowid || this.db.prepare('SELECT "person_id" FROM "person" WHERE "pan" = ?').get(pan) as any;
        const finalPersonId = typeof personId === 'number' ? personId : personId.person_id;
        
        console.log(`  ✅ Person saved/updated. ID: ${finalPersonId}`);
        return finalPersonId;
    }

    private saveAddress(personId: number, address: any): void {
        if (!address) {
            console.log('  → No address data to save');
            return;
        }

        console.log('  → Saving address for person ID:', personId);
        // Delete existing address and insert new one
        this.db.prepare('DELETE FROM "address" WHERE "person_id" = ?').run(personId);

        this.db.prepare(`
            INSERT INTO "address" (
                "person_id", "residence_no", "residence_name", "street", 
                "locality", "city", "state_code", "country_code", "pin_code"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            personId,
            address.residenceNo || null,
            address.residenceName || null,
            address.roadOrStreet || null,
            address.localityOrArea || null,
            address.cityOrTownOrDistrict || null,
            address.stateCode || null,
            address.countryCode || '91',
            address.pinCode?.toString() || null
        );
    }

    private saveITRReturn(personId: number, pan: string, assessmentYear: string, prefillData: any): number {
        const { filingStatus } = prefillData;
        console.log('  → Saving ITR return for AY:', assessmentYear, 'Receipt:', filingStatus?.receiptNo);

        const stmt = this.db.prepare(`
            INSERT INTO "itr_return" (
                "person_id", "pan", "assessment_year", "filing_section", "orig_return_date", 
                "receipt_no"
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT ("person_id", "assessment_year") DO UPDATE SET
                "pan" = excluded."pan",
                "filing_section" = excluded."filing_section",
                "orig_return_date" = excluded."orig_return_date",
                "receipt_no" = excluded."receipt_no",
                "updated_at" = CURRENT_TIMESTAMP
        `);

        stmt.run(
            personId,
            pan,
            assessmentYear,
            filingStatus?.returnFileSec?.toString() || null,
            filingStatus?.origRetFiledDate || null,
            filingStatus?.receiptNo || null
        );

        // Always fetch the return_id after insert/update
        const returnRecord = this.db.prepare('SELECT "return_id" FROM "itr_return" WHERE "person_id" = ? AND "assessment_year" = ?').get(personId, assessmentYear) as any;
        const returnId = returnRecord.return_id;
        console.log('  ✅ ITR return saved/updated. Return ID:', returnId);
        return returnId;
    }

    private saveBankAccounts(personId: number, bankAccountDtls: any[]): void {
        console.log('  → Deleting existing bank accounts for person ID:', personId);
        // Delete existing bank accounts
        this.db.prepare('DELETE FROM "bank_account" WHERE "person_id" = ?').run(personId);

        console.log('  → Inserting', bankAccountDtls.length, 'bank account(s)');
        const stmt = this.db.prepare(`
            INSERT INTO "bank_account" (
                "person_id", "ifsc", "bank_name", "account_number", 
                "account_type", "use_for_refund"
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Insert new bank accounts
        for (const bankGroup of bankAccountDtls) {
            if (bankGroup.addtnlBankDetails) {
                for (const account of bankGroup.addtnlBankDetails) {
                    stmt.run(
                        personId,
                        account.ifsccode || null,
                        account.bankName || null,
                        account.bankAccountNo || null,
                        account.AccountType || null,
                        account.useForRefund === 'true' || account.useForRefund === true ? 1 : 0
                    );
                }
            }
        }
    }

    private saveSalaryIncome(returnId: number, personId: number, salaries: any): void {
        console.log('  → Deleting existing salary income for return ID:', returnId);
        // Delete existing salary records for this return
        this.db.prepare('DELETE FROM "salary_income" WHERE "return_id" = ?').run(returnId);

        const salaryArray = Array.isArray(salaries) ? salaries : [salaries];
        console.log('  → Inserting', salaryArray.length, 'salary income record(s)');

        const stmt = this.db.prepare(`
            INSERT INTO "salary_income" (
                "return_id", "person_id", "employer_name", "employer_tan", 
                "salary", "perquisites_value", "profits_in_lieu"
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const salary of salaryArray) {
            const salarys = salary.salarys || {};
            stmt.run(
                returnId,
                personId,
                salary.nameOfEmployer || null,
                salary.tanOfEmployer || null,
                salarys.salary || 0,
                salarys.valueOfPerquisites || 0,
                salarys.profitsinLieuOfSalary || 0
            );
        }
    }

    private saveTDSSalary(returnId: number, tdsData: any): void {
        console.log('  → Deleting existing TDS salary for return ID:', returnId);
        // Delete existing TDS records for this return
        this.db.prepare('DELETE FROM "tds_salary" WHERE "return_id" = ?').run(returnId);

        const tdsArray = Array.isArray(tdsData) ? tdsData : [tdsData];
        console.log('  → Inserting', tdsArray.length, 'TDS salary record(s)');

        const stmt = this.db.prepare(`
            INSERT INTO "tds_salary" (
                "return_id", "employer_name", "tan", "income_chargeable", 
                "tds_deducted", "tds_claimed"
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const tds of tdsArray) {
            const employer = tds.employerOrDeductorOrCollectDetl || {};
            stmt.run(
                returnId,
                employer.employerOrDeductorOrCollecterName || null,
                employer.tan || null,
                tds.incChrgSal || 0,
                tds.totalTDSSal || 0,
                tds.totalTDSSal || 0 // Assuming claimed = deducted
            );
        }
    }

    private saveOtherIncome(returnId: number, personId: number, otherIncomes: any[]): void {
        console.log('  → Deleting existing other income for return ID:', returnId);
        // Delete existing other income records for this return
        this.db.prepare('DELETE FROM "other_income" WHERE "return_id" = ?').run(returnId);

        console.log('  → Inserting', otherIncomes.length, 'other income record(s)');
        const stmt = this.db.prepare(`
            INSERT INTO "other_income" (
                "return_id", "person_id", "nature_desc", "amount"
            ) VALUES (?, ?, ?, ?)
        `);

        for (const income of otherIncomes) {
            stmt.run(
                returnId,
                personId,
                income.othSrcNatureDesc || null,
                income.othSrcOthAmount || 0
            );
        }
    }

    private saveDeductions(returnId: number, deductions: any): void {
        console.log('  → Deleting existing deductions for return ID:', returnId);
        // Delete existing deduction records for this return
        this.db.prepare('DELETE FROM "deductions_master" WHERE "return_id" = ?').run(returnId);

        // Map of deduction sections
        const deductionMap: { [key: string]: number } = {
            section80C: deductions.section80C || 0,
            section80CCC: deductions.section80CCC || 0,
            section80CCD1B: deductions.section80CCD1B || 0,
            section80CCDEmployeeOrSE: deductions.section80CCDEmployeeOrSE || 0,
            section80CCDEmployer: deductions.section80CCDEmployer || 0,
            section80D: deductions.section80D || 0,
            section80E: deductions.section80E || 0,
            section80TTA: deductions.section80TTA || 0,
            Section80TTB: deductions.Section80TTB || 0,
        };

        const stmt = this.db.prepare(`
            INSERT INTO "deductions_master" (
                "return_id", "section_code", "amount"
            ) VALUES (?, ?, ?)
        `);

        for (const [section, amount] of Object.entries(deductionMap)) {
            if (amount > 0) {
                stmt.run(returnId, section, amount);
            }
        }
    }
}
