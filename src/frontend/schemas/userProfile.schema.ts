import { z } from 'zod';

// Regex patterns from ITR-1 Schema
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PIN_REGEX = /^[1-9]{1}[0-9]{5}$/;
const IFSC_REGEX = /^[A-Z]{4}[0][A-Z0-9]{6}$/;
const MOBILE_REGEX = /^[0-9]{10}$/; // Assuming 10 digit mobile for India
const STD_REGEX = /^[0-9]{3,5}$/; // Basic STD code validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const PersonalDetailsSchema = z.object({
    prefix: z.string().optional(),
    firstName: z.string().min(1, "First Name is required").max(25, "Max length 25"),
    middleName: z.string().max(25, "Max length 25").optional(),
    lastName: z.string().min(1, "Last Name is required").max(75, "Max length 75"),
    status: z.enum(['Individual', 'HUF', 'Company', 'Firm', 'AOP', 'BOI', 'Trust']),
    residence: z.enum(['Resident', 'Non-Resident', 'Resident but not ordinarily resident']),
    panNumber: z.string().regex(PAN_REGEX, "Invalid PAN format (e.g., ABCDE1234F)"),
    employeeType: z.string().optional(), // Should ideally be enum but UI uses text input or mapped values
    fileNo: z.string().optional(),
    gender: z.enum(['M', 'F', 'T']),
    birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid Date",
    }),
    seniorCitizen: z.boolean().optional(),
    businessName: z.string().optional(),
    verifiedBy: z.string().optional(),
    fatherName: z.string().optional(),
    capacity: z.string().optional(),
    emailInReturn: z.string().regex(EMAIL_REGEX, "Invalid Email").optional().or(z.literal('')),
    itDepEmail: z.string().regex(EMAIL_REGEX, "Invalid Email").optional().or(z.literal('')),
    aadhaarNumber: z.string().regex(AADHAAR_REGEX, "Invalid Aadhaar (12 digits)").optional().or(z.literal('')),
    employerCategory: z.enum(["CGOV", "SGOV", "PSU", "PE", "PESG", "PEPS", "PEO", "OTH", "NA"]).optional(),
});

export const AddressSchema = z.object({
    resFlat: z.string().min(1, "Flat/Block is required").max(50, "Max length 50"),
    resBuilding: z.string().max(50, "Max length 50").optional(),
    resRoad: z.string().max(50, "Max length 50").optional(),
    resArea: z.string().min(1, "Area is required").max(50, "Max length 50"),
    resCity: z.string().min(1, "City is required").max(50, "Max length 50"),
    resState: z.string().min(1, "State is required"), // Enum validation skipped for now as UI is text/select
    resPin: z.string().regex(PIN_REGEX, "Invalid Pin Code (6 digits)"),
    resCountry: z.string().min(1, "Country is required"),
    resSTD: z.string().optional(),
    resPhone: z.string().optional(),

    // Office Address
    offFlat: z.string().max(50, "Max length 50").optional(),
    offBuilding: z.string().max(50, "Max length 50").optional(),
    offRoad: z.string().max(50, "Max length 50").optional(),
    offArea: z.string().max(50, "Max length 50").optional(),
    offCity: z.string().max(50, "Max length 50").optional(),
    offPin: z.string().optional().refine(val => !val || PIN_REGEX.test(val), "Invalid Pin Code"),
    offState: z.string().optional(),
    offCountry: z.string().optional(),
    offSTD: z.string().optional(),
    offPhone: z.string().optional(),
    offEmail: z.string().optional().refine(val => !val || EMAIL_REGEX.test(val), "Invalid Email"),
});

export const BankAccountSchema = z.object({
    bankName: z.string().min(1, "Bank Name is required").max(125, "Max length 125"),
    branch: z.string().optional(),
    accountNumber: z.string().min(1, "Account Number is required").max(20, "Max length 20"),
    ifsc: z.string().regex(IFSC_REGEX, "Invalid IFSC Code (e.g., SBIN0001234)"),
    accountType: z.enum(['Savings', 'Current', 'Cash Credit', 'Overdraft', 'NRO', 'Other']),
    nameAsPerBank: z.string().optional(),
});

export const JurisdictionSchema = z.object({
    areaDesc: z.string().optional(),
    areaCd: z.string().optional(),
    aoPplrName: z.string().optional(),
    rangeCd: z.string().optional(),
    aoNo: z.string().optional(),
    aoEmailId: z.string().optional().refine(val => !val || EMAIL_REGEX.test(val), "Invalid Email"),
    aoBldgDesc: z.string().optional(),
    aoAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pinCode: z.string().optional().refine(val => !val || PIN_REGEX.test(val), "Invalid Pin Code"),
});

export const Form49Schema = z.object({
    applicationType: z.string().optional(),
    category: z.string().optional(),
    sourceOfIncome: z.string().optional(),
    aadhaarNumber: z.string().optional().refine(val => !val || AADHAAR_REGEX.test(val), "Invalid Aadhaar (12 digits)"),
    applicationDate: z.string().optional(),
    acknowledgementNumber: z.string().optional(),
    nameOnCard: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    representativeName: z.string().optional(),
    representativeCapacity: z.string().optional(),
    proofOfIdentity: z.string().optional(),
    proofOfAddress: z.string().optional(),
    proofOfDOB: z.string().optional(),
    identityDocNumber: z.string().optional(),
    addressDocNumber: z.string().optional(),
    dobDocNumber: z.string().optional(),
    officeAddress: z.string().optional(),
    telephoneOffice: z.string().optional(),
    emailOffice: z.string().optional().refine(val => !val || EMAIL_REGEX.test(val), "Invalid Email"),
});

// Combined Schema for the entire form state
export const UserProfileSchema = z.object({
    manualData: PersonalDetailsSchema.merge(AddressSchema),
    bankAccounts: z.array(BankAccountSchema),
    jurisdiction: JurisdictionSchema,
    form49: Form49Schema,
});

export type UserProfileData = z.infer<typeof UserProfileSchema>;
