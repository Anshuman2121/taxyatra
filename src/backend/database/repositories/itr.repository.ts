import { Pool } from 'pg';
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
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Save complete prefill data to database
     */
    /**
     * Get complete user data by PAN
     */
    async getUserData(pan: string): Promise<any> {
        const client = await this.pool.connect();
        try {
            // Get person details
            const personRes = await client.query('SELECT * FROM "person" WHERE "pan" = $1', [pan]);
            if (personRes.rows.length === 0) return null;
            const person = personRes.rows[0];
            const personId = person.person_id;

            // Get address
            const addressRes = await client.query('SELECT * FROM "address" WHERE "person_id" = $1', [personId]);
            const address = addressRes.rows[0] || null;

            // Get latest return
            const returnRes = await client.query('SELECT * FROM "itr_return" WHERE "person_id" = $1 ORDER BY "assessment_year" DESC LIMIT 1', [personId]);
            const itrReturn = returnRes.rows[0] || null;
            const returnId = itrReturn ? itrReturn.return_id : null;

            // Get bank accounts
            const bankRes = await client.query('SELECT * FROM "bank_account" WHERE "person_id" = $1', [personId]);
            const bankAccounts = bankRes.rows;

            let salaryIncome = [];
            let tdsSalary = [];
            let otherIncome = [];
            let deductions = [];

            if (returnId) {
                // Get salary income
                const salaryRes = await client.query('SELECT * FROM "salary_income" WHERE "return_id" = $1', [returnId]);
                salaryIncome = salaryRes.rows;

                // Get TDS salary
                const tdsRes = await client.query('SELECT * FROM "tds_salary" WHERE "return_id" = $1', [returnId]);
                tdsSalary = tdsRes.rows;

                // Get other income
                const otherRes = await client.query('SELECT * FROM "other_income" WHERE "return_id" = $1', [returnId]);
                otherIncome = otherRes.rows;

                // Get deductions
                const dedRes = await client.query('SELECT * FROM "deductions_master" WHERE "return_id" = $1', [returnId]);
                deductions = dedRes.rows;
            }

            return {
                personalInfo: { ...person, address },
                itrReturn,
                bankAccounts,
                salaryIncome,
                tdsSalary,
                otherIncome,
                deductions
            };
        } finally {
            client.release();
        }
    }

    async savePrefillData(pan: string, assessmentYear: string, prefillData: PrefillData): Promise<number> {
        console.log('📊 [ITR Repository] Saving data for PAN:', pan, 'AY:', assessmentYear);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Save or update person data
            // Pass PAN explicitly as it might be missing in personalInfo
            const personId = await this.savePersonData(client, pan, prefillData.personalInfo);

            // 2. Save or update address
            await this.saveAddress(client, personId, prefillData.personalInfo.address);

            // 3. Save or update ITR return record
            const returnId = await this.saveITRReturn(client, personId, pan, assessmentYear, prefillData);

            // 4. Save bank accounts
            if (prefillData.bankAccountDtls && prefillData.bankAccountDtls.length > 0) {
                console.log('🏦 [ITR Repository] Saving', prefillData.bankAccountDtls.length, 'bank accounts...');
                await this.saveBankAccounts(client, personId, prefillData.bankAccountDtls);
                console.log('✅ [ITR Repository] Bank accounts saved');
            } else {
                console.log('ℹ️  [ITR Repository] No bank accounts to save');
            }

            // 5. Save salary income from insights
            if (prefillData.insights?.salaries?.salary) {
                const salaryCount = Array.isArray(prefillData.insights.salaries.salary) ? prefillData.insights.salaries.salary.length : 1;
                console.log('💼 [ITR Repository] Saving', salaryCount, 'salary income record(s)...');
                await this.saveSalaryIncome(client, returnId, personId, prefillData.insights.salaries.salary);
                console.log('✅ [ITR Repository] Salary income saved');
            } else {
                console.log('ℹ️  [ITR Repository] No salary income to save');
            }

            // 6. Save TDS on salary from form26as
            if (prefillData.form26as?.tdsOnSalaries?.tdsOnSalary) {
                const tdsCount = Array.isArray(prefillData.form26as.tdsOnSalaries.tdsOnSalary) ? prefillData.form26as.tdsOnSalaries.tdsOnSalary.length : 1;
                console.log('📊 [ITR Repository] Saving', tdsCount, 'TDS salary record(s)...');
                await this.saveTDSSalary(client, returnId, prefillData.form26as.tdsOnSalaries.tdsOnSalary);
                console.log('✅ [ITR Repository] TDS salary saved');
            } else {
                console.log('ℹ️  [ITR Repository] No TDS salary to save');
            }

            // 7. Save other income
            if (prefillData.form26as?.incomeDeductionsOthersInc) {
                const otherIncomeCount = Array.isArray(prefillData.form26as.incomeDeductionsOthersInc) ? prefillData.form26as.incomeDeductionsOthersInc.length : 1;
                console.log('💰 [ITR Repository] Saving', otherIncomeCount, 'other income record(s)...');
                await this.saveOtherIncome(client, returnId, personId, prefillData.form26as.incomeDeductionsOthersInc);
                console.log('✅ [ITR Repository] Other income saved');
            } else {
                console.log('ℹ️  [ITR Repository] No other income to save');
            }

            // 8. Save deductions from form24q
            if (prefillData.form24q?.usrDeductUndChapVIAType) {
                const deductionCount = Object.keys(prefillData.form24q.usrDeductUndChapVIAType).length;
                console.log('🎯 [ITR Repository] Saving', deductionCount, 'deduction(s)...');
                await this.saveDeductions(client, returnId, prefillData.form24q.usrDeductUndChapVIAType);
                console.log('✅ [ITR Repository] Deductions saved');
            } else {
                console.log('ℹ️  [ITR Repository] No deductions to save');
            }

            await client.query('COMMIT');
            console.log('✅ [ITR Repository] Transaction committed successfully');
            console.log('🎉 [ITR Repository] All data saved! Return ID:', returnId);
            return returnId;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ [ITR Repository] Error saving prefill data, transaction rolled back:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    private async savePersonData(client: any, pan: string, personalInfo: any): Promise<number> {
        const { assesseeName, dob, aadhaarCardNo, address, orgFirmInfo } = personalInfo;
        console.log('  → Saving person:', assesseeName?.firstName, assesseeName?.surNameOrOrgName, '(PAN:', pan + ')');

        const result = await client.query(`
            INSERT INTO "person" (
                "pan", "first_name", "last_name_or_org_name", 
                "dob", "aadhaar", "email", "mobile", "status_or_company_type"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT ("pan") DO UPDATE SET
                "first_name" = EXCLUDED."first_name",
                "last_name_or_org_name" = EXCLUDED."last_name_or_org_name",
                "dob" = EXCLUDED."dob",
                "aadhaar" = EXCLUDED."aadhaar",
                "email" = EXCLUDED."email",
                "mobile" = EXCLUDED."mobile",
                "status_or_company_type" = EXCLUDED."status_or_company_type"
            RETURNING "person_id"
        `, [
            pan,
            assesseeName?.firstName || null,
            assesseeName?.surNameOrOrgName || null,
            dob || null,
            aadhaarCardNo || null,
            address?.emailAddress || null,
            address?.mobileNo?.toString() || null,
            orgFirmInfo?.StatusOrCompanyType || null
        ]);

        console.log(`  ✅ Person saved/updated. ID: ${result.rows[0].person_id}`);
        return result.rows[0].person_id;
    }

    private async saveAddress(client: any, personId: number, address: any): Promise<void> {
        if (!address) {
            console.log('  → No address data to save');
            return;
        }

        console.log('  → Saving address for person ID:', personId);
        // Delete existing address and insert new one
        await client.query('DELETE FROM "address" WHERE "person_id" = $1', [personId]);

        await client.query(`
            INSERT INTO "address" (
                "person_id", "residence_no", "residence_name", "street", 
                "locality", "city", "state_code", "country_code", "pin_code"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            personId,
            address.residenceNo || null,
            address.residenceName || null,
            address.roadOrStreet || null,
            address.localityOrArea || null,
            address.cityOrTownOrDistrict || null,
            address.stateCode || null,
            address.countryCode || '91',
            address.pinCode?.toString() || null
        ]);
    }

    private async saveITRReturn(client: any, personId: number, pan: string, assessmentYear: string, prefillData: any): Promise<number> {
        const { filingStatus } = prefillData;
        console.log('  → Saving ITR return for AY:', assessmentYear, 'Receipt:', filingStatus?.receiptNo);

        const result = await client.query(`
            INSERT INTO "itr_return" (
                "person_id", "pan", "assessment_year", "filing_section", "orig_return_date", 
                "receipt_no"
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT ("person_id", "assessment_year") DO UPDATE SET
                "pan" = EXCLUDED."pan",
                "filing_section" = EXCLUDED."filing_section",
                "orig_return_date" = EXCLUDED."orig_return_date",
                "receipt_no" = EXCLUDED."receipt_no",
                "updated_at" = CURRENT_TIMESTAMP
            RETURNING "return_id"
        `, [
            personId,
            pan,
            assessmentYear,
            filingStatus?.returnFileSec?.toString() || null,
            filingStatus?.origRetFiledDate || null,
            filingStatus?.receiptNo || null
        ]);

        return result.rows[0].return_id;
    }

    private async saveBankAccounts(client: any, personId: number, bankAccountDtls: any[]): Promise<void> {
        console.log('  → Deleting existing bank accounts for person ID:', personId);
        // Delete existing bank accounts
        await client.query('DELETE FROM "bank_account" WHERE "person_id" = $1', [personId]);

        console.log('  → Inserting', bankAccountDtls.length, 'bank account(s)');
        // Insert new bank accounts
        for (const bankGroup of bankAccountDtls) {
            if (bankGroup.addtnlBankDetails) {
                for (const account of bankGroup.addtnlBankDetails) {
                    await client.query(`
                        INSERT INTO "bank_account" (
                            "person_id", "ifsc", "bank_name", "account_number", 
                            "account_type", "use_for_refund"
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        personId,
                        account.ifsccode || null,
                        account.bankName || null,
                        account.bankAccountNo || null,
                        account.AccountType || null,
                        account.useForRefund === 'true' || account.useForRefund === true
                    ]);
                }
            }
        }
    }

    private async saveSalaryIncome(client: any, returnId: number, personId: number, salaries: any): Promise<void> {
        console.log('  → Deleting existing salary income for return ID:', returnId);
        // Delete existing salary records for this return
        await client.query('DELETE FROM "salary_income" WHERE "return_id" = $1', [returnId]);

        const salaryArray = Array.isArray(salaries) ? salaries : [salaries];
        console.log('  → Inserting', salaryArray.length, 'salary income record(s)');

        for (const salary of salaryArray) {
            const salarys = salary.salarys || {};
            await client.query(`
                INSERT INTO "salary_income" (
                    "return_id", "person_id", "employer_name", "employer_tan", 
                    "salary", "perquisites_value", "profits_in_lieu"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                returnId,
                personId,
                salary.nameOfEmployer || null,
                salary.tanOfEmployer || null,
                salarys.salary || 0,
                salarys.valueOfPerquisites || 0,
                salarys.profitsinLieuOfSalary || 0
            ]);
        }
    }

    private async saveTDSSalary(client: any, returnId: number, tdsData: any): Promise<void> {
        console.log('  → Deleting existing TDS salary for return ID:', returnId);
        // Delete existing TDS records for this return
        await client.query('DELETE FROM "tds_salary" WHERE "return_id" = $1', [returnId]);

        const tdsArray = Array.isArray(tdsData) ? tdsData : [tdsData];
        console.log('  → Inserting', tdsArray.length, 'TDS salary record(s)');

        for (const tds of tdsArray) {
            const employer = tds.employerOrDeductorOrCollectDetl || {};
            await client.query(`
                INSERT INTO "tds_salary" (
                    "return_id", "employer_name", "tan", "income_chargeable", 
                    "tds_deducted", "tds_claimed"
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                returnId,
                employer.employerOrDeductorOrCollecterName || null,
                employer.tan || null,
                tds.incChrgSal || 0,
                tds.totalTDSSal || 0,
                tds.totalTDSSal || 0 // Assuming claimed = deducted
            ]);
        }
    }

    private async saveOtherIncome(client: any, returnId: number, personId: number, otherIncomes: any[]): Promise<void> {
        console.log('  → Deleting existing other income for return ID:', returnId);
        // Delete existing other income records for this return
        await client.query('DELETE FROM "other_income" WHERE "return_id" = $1', [returnId]);

        console.log('  → Inserting', otherIncomes.length, 'other income record(s)');
        for (const income of otherIncomes) {
            await client.query(`
                INSERT INTO "other_income" (
                    "return_id", "person_id", "nature_desc", "amount"
                ) VALUES ($1, $2, $3, $4)
            `, [
                returnId,
                personId,
                income.othSrcNatureDesc || null,
                income.othSrcOthAmount || 0
            ]);
        }
    }

    private async saveDeductions(client: any, returnId: number, deductions: any): Promise<void> {
        console.log('  → Deleting existing deductions for return ID:', returnId);
        // Delete existing deduction records for this return
        await client.query('DELETE FROM "deductions_master" WHERE "return_id" = $1', [returnId]);

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

        for (const [section, amount] of Object.entries(deductionMap)) {
            if (amount > 0) {
                await client.query(`
                    INSERT INTO "deductions_master" (
                        "return_id", "section_code", "amount"
                    ) VALUES ($1, $2, $3)
                `, [returnId, section, amount]);
            }
        }
    }
}
