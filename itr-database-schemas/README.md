# ITR Database Schemas

This folder contains extracted database schemas for all ITR forms (1-7) for Assessment Year 2025.

## Files

| File | Size | Description |
|------|------|-------------|
| ITR-1-keys.json | 18K | For individuals having income from Salaries, one house property, other sources |
| ITR-2-keys.json | 83K | For individuals and HUFs not having income from business or profession |
| ITR-3-keys.json | 140K | For individuals and HUFs having income from business or profession |
| ITR-4-keys.json | 20K | For individuals, HUFs and Firms (other than LLP) being a resident having total income upto Rs.50 lakh |
| ITR-5-keys.json | 127K | For persons other than individual, HUF, company and person filing Form ITR-7 |
| ITR-6-keys.json | 162K | For companies other than companies claiming exemption under section 11 |
| ITR-7-keys.json | 86K | For persons including companies required to furnish return under sections 139(4A) or 139(4B) or 139(4C) or 139(4D) |
| **ITR-Common-keys.json** | 3.6K | **Common fields across all ITR forms (100 field names)** |

## Common Fields

The `ITR-Common-keys.json` file contains:
- **100 common field names** that appear in all ITR forms (1-7)
- Core sections like:
  - CreationInfo (software and JSON metadata)
  - PersonalInfo (name, PAN, address, DOB, Aadhaar)
  - FilingStatus (return filing details)
  - Verification (declaration and capacity)
  - TaxReturnPreparer (TRP details)
  - BankAccountDtls (bank account information)
  - TaxesPaid (advance tax, TDS, TCS, self-assessment)
  - TaxPayment (challan details)
- Complete list of all 100 common field names

## Structure

Each JSON file contains:
- All field names/keys from the original ITR schema
- Nested object structures preserved
- Array structures indicated with `[]`
- Empty string values as placeholders
- **No validation rules, patterns, enums, or sample data**

## Usage

These schemas can be used as:
1. Database table structures
2. API request/response models
3. Form field definitions
4. Data migration templates
5. Common fields for unified ITR processing

## Source

Extracted from official ITR JSON schemas (Version 1.0-1.2) for AY 2025.
