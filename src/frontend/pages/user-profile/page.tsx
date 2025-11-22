import React, { useState, useEffect } from 'react';
import { TopNavBar } from '../../components/TopNavBar';
import { BottomBar } from '../../components/BottomBar';
import { api } from '../../api';
import { ChevronDown, ChevronUp, Globe, Upload, Edit2, Save, X } from 'lucide-react';
import { FetchProgressModal } from '../../components/FetchProgressModal';
import DataPreviewModal from '../../components/DataPreviewModal';
import { UserProfileSchema, PersonalDetailsSchema, AddressSchema, BankAccountSchema, JurisdictionSchema, Form49Schema } from '../../schemas/userProfile.schema';
import { JsonUploadButton } from '../../components/JsonUploadButton';
import { z } from 'zod';

interface UserProfilePageProps {
    pan?: string;
    onBack: () => void;
}

export function UserProfilePage({ pan, onBack }: UserProfilePageProps) {
    const [mode, setMode] = useState<'view' | 'edit'>(pan ? 'view' : 'edit');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        personal: true,
        bank: false,
        jurisdiction: false,
        form49: false
    });

    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // State from original add-user page
    const [manualData, setManualData] = useState({
        prefix: 'Mr.', firstName: '', middleName: '', lastName: '',
        status: 'Individual', residence: 'Resident', panNumber: pan || '', employeeType: '', fileNo: '',
        gender: 'M', birthDate: '', seniorCitizen: false, businessName: '', verifiedBy: '', fatherName: '', capacity: '',
        emailInReturn: '', itDepEmail: '', aadhaarNumber: '', employerCategory: '',
        ward: '', areaCode: '', aoType: '', rangeCode: '', aoNo: '', oldWard: '',
        resFlat: '', resBuilding: '', resRoad: '', resArea: '', resCity: '', resPin: '', resState: '', resSTD: '', resPhone: '', resCountry: 'India',
        offFlat: '', offBuilding: '', offRoad: '', offArea: '', offCity: '', offPin: '', offState: '', offSTD: '', offPhone: '', offCountry: 'India', offEmail: '',
        returnType: '', communicateAt: 'Residence', mobile: '', group: '',
        cma: false, tds: false, audit: false, fbt: false, wTax: false, sTax: false, incomeTax: false
    });

    const [bankAccounts, setBankAccounts] = useState([{
        bankName: '', branch: '', accountNumber: '', ifsc: '', accountType: 'Savings', nameAsPerBank: ''
    }]);

    const [jurisdiction, setJurisdiction] = useState({
        areaDesc: '', areaCd: '', aoPplrName: '', rangeCd: '', aoNo: '', aoEmailId: '', aoBldgDesc: '', aoAddress: '', city: '', state: '', pinCode: ''
    });

    const [form49, setForm49] = useState({
        applicationType: 'New PAN', category: 'Individual', sourceOfIncome: '', aadhaarNumber: '', applicationDate: '', acknowledgementNumber: '',
        nameOnCard: '', fatherName: '', motherName: '', representativeName: '', representativeCapacity: '',
        proofOfIdentity: 'Aadhaar Card', proofOfAddress: 'Aadhaar Card', proofOfDOB: 'Aadhaar Card',
        identityDocNumber: '', addressDocNumber: '', dobDocNumber: '', officeAddress: '', telephoneOffice: '', emailOffice: ''
    });

    // Fetching & Saving State
    const [showFetchModal, setShowFetchModal] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [fetchComplete, setFetchComplete] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [fetchedData, setFetchedData] = useState<any>(null);
    const [originalData, setOriginalData] = useState<any>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!pan) return;

            setIsLoading(true);
            try {
                const response = await api.getUserData(pan);
                if (response.success && response.data) {
                    const data = response.data;
                    setOriginalData(data);

                    // Fetch password
                    try {
                        const creds = await api.getPanWithPassword(pan);
                        if (creds && creds.password) {
                            setPassword(creds.password);
                        }
                    } catch (e) {
                        console.error("Failed to fetch password", e);
                    }

                    // Populate state from data
                    if (data.user) {
                        setManualData(prev => ({
                            ...prev,
                            ...data.user,
                            panNumber: data.user.pan || pan,
                        }));
                    }
                    if (data.bankAccounts) {
                        setBankAccounts(data.bankAccounts);
                    }
                    if (data.jurisdiction) {
                        setJurisdiction(data.jurisdiction);
                    }
                    if (data.form49) {
                        setForm49(data.form49);
                    }
                }
            } catch (error) {
                console.error("Failed to load user data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [pan]);

    const validateField = (path: string, value: any, schema: z.ZodType<any>) => {
        try {
            schema.parse(value);
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[path];
                return newErrors;
            });
            return true;
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = error.issues[0].message;
                setErrors(prev => ({ ...prev, [path]: message }));
            }
            return false;
        }
    };

    const validateForm = () => {
        try {
            UserProfileSchema.parse({
                manualData,
                bankAccounts,
                jurisdiction,
                form49
            });
            setErrors({});
            return true;
        } catch (error) {
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                error.issues.forEach((err: z.ZodIssue) => {
                    const path = err.path.join('.');
                    newErrors[path] = err.message;
                });
                setErrors(newErrors);

                // Auto-expand sections with errors
                const sectionsToExpand = { ...expandedSections };
                let hasPersonalError = false;
                let hasBankError = false;
                let hasJurisdictionError = false;
                let hasForm49Error = false;

                error.issues.forEach((err: z.ZodIssue) => {
                    if (err.path[0] === 'manualData') hasPersonalError = true;
                    if (err.path[0] === 'bankAccounts') hasBankError = true;
                    if (err.path[0] === 'jurisdiction') hasJurisdictionError = true;
                    if (err.path[0] === 'form49') hasForm49Error = true;
                });

                if (hasPersonalError) sectionsToExpand.personal = true;
                if (hasBankError) sectionsToExpand.bank = true;
                if (hasJurisdictionError) sectionsToExpand.jurisdiction = true;
                if (hasForm49Error) sectionsToExpand.form49 = true;

                setExpandedSections(sectionsToExpand);
            }
            return false;
        }
    };

    // Helper to map API data to Form Data structure
    const mapApiDataToFormData = (apiData: any, currentManualData: any) => {
        const newData = { ...currentManualData };
        let newBankAccounts = [];
        let newJurisdiction = {};

        if (apiData.personalInfo) {
            const pi = apiData.personalInfo;
            const addr = pi.address || {};

            newData.firstName = pi.assesseeName?.firstName || '';
            newData.middleName = pi.assesseeName?.middleName || '';
            newData.lastName = pi.assesseeName?.surNameOrOrgName || '';
            newData.panNumber = apiData.pan || pan || newData.panNumber;
            newData.status = pi.status || 'Individual';
            newData.dob = pi.dob || '';
            newData.birthDate = pi.dob ? new Date(pi.dob).toISOString().split('T')[0] : '';
            newData.gender = pi.gender || 'M';
            newData.aadhaarNumber = pi.aadhaarCardNo || '';
            newData.mobile = addr.mobileNo || '';
            newData.emailInReturn = addr.emailAddress || '';

            // Address mapping
            newData.resFlat = addr.addrLine1Txt || '';
            newData.resBuilding = addr.addrLine2Txt || '';
            newData.resRoad = addr.addrLine3Txt || '';
            newData.resArea = addr.addrLine4Txt || '';
            newData.resCity = addr.city || '';
            newData.resState = addr.stateCd || '';
            newData.resPin = addr.pinCd || '';
            newData.resCountry = addr.countryCode || '91';
            newData.resPhone = addr.phoneNo || '';
            newData.resCountry = addr.countryCode || '91';
            newData.resPhone = addr.phoneNo || '';
            newData.employerCategory = pi.employerCategory || '';
        }

        if (apiData.bankAccountDtls && Array.isArray(apiData.bankAccountDtls)) {
            newBankAccounts = apiData.bankAccountDtls.map((acc: any) => ({
                bankName: acc.bankName || '',
                branch: acc.bankBrnchTxt || '',
                accountNumber: acc.bankAcctNum || '',
                ifsc: acc.ifscCd || '',
                accountType: acc.accountType || 'Savings',
                nameAsPerBank: acc.nameAsPerBank || ''
            }));
        }

        if (apiData.jurisdiction) {
            newJurisdiction = {
                areaCd: apiData.jurisdiction.areaCd || '',
                areaDesc: apiData.jurisdiction.areaDesc || '',
                aoType: apiData.jurisdiction.aoType || '',
                rangeCd: apiData.jurisdiction.rangeCd || '',
                aoNo: apiData.jurisdiction.aoNo || '',
                aoPplrName: apiData.jurisdiction.aoPplrName || '',
                aoEmailId: apiData.jurisdiction.aoEmailId || '',
                aoBldgDesc: apiData.jurisdiction.aoBldgDesc || ''
            };
        }

        return { manualData: newData, bankAccounts: newBankAccounts, jurisdiction: newJurisdiction };
    };

    const handleFetchOnline = async () => {
        if (!manualData.panNumber) {
            alert('Please enter a PAN number first');
            return;
        }
        if (!password) {
            const pwd = prompt('Enter IT Portal Password:');
            if (!pwd) return;
            setPassword(pwd);
        }

        setShowFetchModal(true);
        setFetchStatus('Initializing...');
        setFetchComplete(false);
        setFetchError(false);

        window.electron.ipcRenderer.removeAllListeners('fetch-progress');
        window.electron.ipcRenderer.on('fetch-progress', (event: any, message: string) => {
            setFetchStatus(message);
        });

        try {
            const result = await api.fetchUserProfile(manualData.panNumber, password || '', true);
            if (result.success) {
                setFetchStatus('Data fetched successfully!');
                setFetchComplete(true);
                setFetchedData(mapApiDataToFormData(result.data, manualData));
            } else {
                setFetchStatus(result.message || 'Failed to fetch data');
                setFetchError(true);
            }
        } catch (error: any) {
            setFetchStatus(error.message || 'An error occurred');
            setFetchError(true);
        }
    };

    const handlePreviewConfirm = async () => {
        if (fetchedData) {
            setManualData(fetchedData.manualData);
            setBankAccounts(fetchedData.bankAccounts);
            setJurisdiction(fetchedData.jurisdiction);
        }
        setShowPreviewModal(false);
        setShowFetchModal(false);
        setMode('edit');
    };

    const handleSave = async () => {
        if (!validateForm()) {
            alert('Please fix the validation errors before saving.');
            return;
        }

        setIsLoading(true);
        try {
            const dataToSave = {
                pan: manualData.panNumber,
                user: { ...manualData, pan: manualData.panNumber },
                bankAccounts,
                jurisdiction,
                form49
            };

            // Always use updateUserDetails as it handles the user form structure
            await api.updateUserDetails(dataToSave);

            if (manualData.panNumber && password) {
                await api.savePanCredentials(manualData.panNumber, password);
            }

            setMode('view');
            alert('Profile saved successfully!');
        } catch (error) {
            console.error("Failed to save", error);
            alert('Failed to save profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleManualDataChange = (field: string, value: any) => {
        setManualData(prev => {
            const newData = { ...prev, [field]: value };
            if (errors[`manualData.${field}`]) {
                setErrors(prevErr => {
                    const newErr = { ...prevErr };
                    delete newErr[`manualData.${field}`];
                    return newErr;
                });
            }
            return newData;
        });
    };

    const handleJsonUpload = (data: any) => {
        let updatedManualData = manualData;
        let updatedBankAccounts = bankAccounts;

        if (data.manualData) {
            updatedManualData = {
                ...manualData,
                ...data.manualData
            };
            setManualData(updatedManualData);
        }
        if (data.bankAccounts && data.bankAccounts.length > 0) {
            updatedBankAccounts = data.bankAccounts;
            setBankAccounts(updatedBankAccounts);
        }

        setMode('edit');

        // Validate the uploaded data and show errors
        try {
            UserProfileSchema.parse({
                manualData: updatedManualData,
                bankAccounts: updatedBankAccounts,
                jurisdiction,
                form49
            });
            setErrors({});
            alert('Data loaded from JSON file successfully! All fields are valid.');
        } catch (error) {
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                error.issues.forEach((err: z.ZodIssue) => {
                    const path = err.path.join('.');
                    newErrors[path] = err.message;
                });
                setErrors(newErrors);

                // Auto-expand sections with errors
                const sectionsToExpand = { ...expandedSections };
                let hasPersonalError = false;
                let hasBankError = false;
                let hasJurisdictionError = false;
                let hasForm49Error = false;

                error.issues.forEach((err: z.ZodIssue) => {
                    if (err.path[0] === 'manualData') hasPersonalError = true;
                    if (err.path[0] === 'bankAccounts') hasBankError = true;
                    if (err.path[0] === 'jurisdiction') hasJurisdictionError = true;
                    if (err.path[0] === 'form49') hasForm49Error = true;
                });

                if (hasPersonalError) sectionsToExpand.personal = true;
                if (hasBankError) sectionsToExpand.bank = true;
                if (hasJurisdictionError) sectionsToExpand.jurisdiction = true;
                if (hasForm49Error) sectionsToExpand.form49 = true;

                setExpandedSections(sectionsToExpand);

                const errorCount = error.issues.length;
                alert(`Data loaded from JSON file. Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} before saving.`);
            }
        }
    };

    const handleBlur = (section: 'manualData' | 'jurisdiction' | 'form49', field: string, value: any) => {
        let schema;
        if (section === 'manualData') {
            const shape = UserProfileSchema.shape.manualData.shape as any;
            if (shape[field]) {
                schema = shape[field];
            }
        } else if (section === 'jurisdiction') {
            const shape = JurisdictionSchema.shape as any;
            if (shape[field]) schema = shape[field];
        } else if (section === 'form49') {
            const shape = Form49Schema.shape as any;
            if (shape[field]) schema = shape[field];
        }

        if (schema) {
            validateField(`${section}.${field}`, value, schema);
        }
    };

    const getHeaderTitle = () => {
        if (!pan) return "Add New User";
        const name = [manualData.firstName, manualData.middleName, manualData.lastName].filter(Boolean).join(' ');
        return name ? `${name} - ${pan}` : `Profile: ${pan}`;
    };

    const getLastUpdatedDate = () => {
        if (!originalData?.user?.updatedAt) return null;
        try {
            const date = new Date(originalData.user.updatedAt);
            return new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'long',
                year: '2-digit'
            }).format(date);
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-gold-200 selection:text-gold-900 flex flex-col pt-20 pb-20">
            <TopNavBar pageName={getHeaderTitle()} onBack={onBack} />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-[95%]">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* Left Column - Main Form */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Personal Details Section */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleSection('personal')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
                            >
                                <h2 className="text-lg font-semibold text-gold-600">Personal Details</h2>
                                {expandedSections.personal ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                            </button>

                            {expandedSections.personal && (
                                <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200 space-y-6">


                                    {/* Identification */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">PAN</label>
                                            <input
                                                type="text"
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 uppercase disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.panNumber'] ? 'border-red-500' : 'border-slate-200'}`}
                                                maxLength={10}
                                                value={manualData.panNumber}
                                                onChange={(e) => handleManualDataChange('panNumber', e.target.value.toUpperCase())}
                                                onBlur={(e) => handleBlur('manualData', 'panNumber', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                            {errors['manualData.panNumber'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.panNumber']}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">IT Portal Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Assessee Name</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Prefix</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white"
                                                    value={manualData.prefix}
                                                    onChange={(e) => handleManualDataChange('prefix', e.target.value)}
                                                    disabled={mode === 'view'}
                                                >
                                                    <option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option><option>Prof.</option><option>Shri</option><option>Smt.</option><option>Kumari</option><option>M/s</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
                                                <input
                                                    type="text"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.firstName'] ? 'border-red-500' : 'border-slate-200'}`}
                                                    value={manualData.firstName}
                                                    onChange={(e) => handleManualDataChange('firstName', e.target.value)}
                                                    onBlur={(e) => handleBlur('manualData', 'firstName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                                {errors['manualData.firstName'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.firstName']}</p>}
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Middle Name</label>
                                                <input
                                                    type="text"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.middleName'] ? 'border-red-500' : 'border-slate-200'}`}
                                                    value={manualData.middleName}
                                                    onChange={(e) => handleManualDataChange('middleName', e.target.value)}
                                                    onBlur={(e) => handleBlur('manualData', 'middleName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                                {errors['manualData.middleName'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.middleName']}</p>}
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.lastName'] ? 'border-red-500' : 'border-slate-200'}`}
                                                    value={manualData.lastName}
                                                    onChange={(e) => handleManualDataChange('lastName', e.target.value)}
                                                    onBlur={(e) => handleBlur('manualData', 'lastName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                                {errors['manualData.lastName'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.lastName']}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Residence & Aadhaar */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.status}
                                                onChange={(e) => handleManualDataChange('status', e.target.value)}
                                                disabled={mode === 'view'}
                                            >
                                                <option>Individual</option><option>HUF</option><option>Company</option><option>Firm</option><option>AOP</option><option>BOI</option><option>Trust</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Residence</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.residence}
                                                onChange={(e) => handleManualDataChange('residence', e.target.value)}
                                                disabled={mode === 'view'}
                                            >
                                                <option>Resident</option><option>Non-Resident</option><option>Resident but not ordinarily resident</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Aadhaar Number</label>
                                            <input
                                                type="text"
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.aadhaarNumber'] ? 'border-red-500' : 'border-slate-200'}`}
                                                maxLength={12}
                                                value={manualData.aadhaarNumber}
                                                onChange={(e) => handleManualDataChange('aadhaarNumber', e.target.value)}
                                                onBlur={(e) => handleBlur('manualData', 'aadhaarNumber', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                            {errors['manualData.aadhaarNumber'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.aadhaarNumber']}</p>}
                                        </div>
                                    </div>


                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Employer Category</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.employerCategory}
                                                onChange={(e) => handleManualDataChange('employerCategory', e.target.value)}
                                                disabled={mode === 'view'}
                                            >
                                                <option value="">Select Category</option>
                                                <option value="CGOV">Central Govt</option>
                                                <option value="SGOV">State Govt</option>
                                                <option value="PSU">Public Sector Unit</option>
                                                <option value="PE">Pensioners - CG</option>
                                                <option value="PESG">Pensioners - SG</option>
                                                <option value="PEPS">Pensioners - PSU</option>
                                                <option value="PEO">Pensioners - Others</option>
                                                <option value="OTH">Others</option>
                                                <option value="NA">Not Applicable</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Employee Type</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.employeeType}
                                                onChange={(e) => handleManualDataChange('employeeType', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">File #</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.fileNo}
                                                onChange={(e) => handleManualDataChange('fileNo', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.gender}
                                                onChange={(e) => handleManualDataChange('gender', e.target.value)}
                                                disabled={mode === 'view'}
                                            >
                                                <option value="M">Male</option><option value="F">Female</option><option value="T">Transgender</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Birth Date</label>
                                            <input
                                                type="date"
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.birthDate'] ? 'border-red-500' : 'border-slate-200'}`}
                                                value={manualData.birthDate}
                                                onChange={(e) => handleManualDataChange('birthDate', e.target.value)}
                                                onBlur={(e) => handleBlur('manualData', 'birthDate', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                            {errors['manualData.birthDate'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.birthDate']}</p>}
                                        </div>
                                        <div className="flex items-center h-10">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                    checked={manualData.seniorCitizen}
                                                    onChange={(e) => handleManualDataChange('seniorCitizen', e.target.checked)}
                                                    disabled={mode === 'view'}
                                                />
                                                <span className="text-sm text-slate-700">Senior Citizen</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Business & Verification */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Business Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.businessName}
                                                onChange={(e) => handleManualDataChange('businessName', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Verified By</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.verifiedBy}
                                                onChange={(e) => handleManualDataChange('verifiedBy', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>

                                    {/* Father & Capacity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Father Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.fatherName}
                                                onChange={(e) => handleManualDataChange('fatherName', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Capacity</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.capacity}
                                                onChange={(e) => handleManualDataChange('capacity', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>

                                    {/* Emails */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">e-Mail in Return</label>
                                            <input
                                                type="email"
                                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.emailInReturn'] ? 'border-red-500' : 'border-slate-200'}`}
                                                value={manualData.emailInReturn}
                                                onChange={(e) => handleManualDataChange('emailInReturn', e.target.value)}
                                                onBlur={(e) => handleBlur('manualData', 'emailInReturn', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                            {errors['manualData.emailInReturn'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.emailInReturn']}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">IT Dep. e-Mail</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.itDepEmail}
                                                onChange={(e) => handleManualDataChange('itDepEmail', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>

                                    {/* Residence Address */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Residence Address</h3>
                                            {mode === 'edit' && (
                                                <button
                                                    onClick={() => setManualData({ ...manualData, offFlat: manualData.resFlat, offBuilding: manualData.resBuilding, offRoad: manualData.resRoad, offArea: manualData.resArea, offCity: manualData.resCity, offPin: manualData.resPin, offState: manualData.resState, offSTD: manualData.resSTD, offPhone: manualData.resPhone, offCountry: manualData.resCountry })}
                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                >
                                                    Copy to Office →
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Flat/Block" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resFlat} onChange={(e) => handleManualDataChange('resFlat', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Building" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resBuilding} onChange={(e) => handleManualDataChange('resBuilding', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Road/Street" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resRoad} onChange={(e) => handleManualDataChange('resRoad', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Area" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resArea} onChange={(e) => handleManualDataChange('resArea', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="City" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resCity} onChange={(e) => handleManualDataChange('resCity', e.target.value)} disabled={mode === 'view'} />
                                            <div>
                                                <input placeholder="Pin" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['manualData.resPin'] ? 'border-red-500' : 'border-slate-200'}`} value={manualData.resPin} onChange={(e) => handleManualDataChange('resPin', e.target.value)} onBlur={(e) => handleBlur('manualData', 'resPin', e.target.value)} maxLength={6} disabled={mode === 'view'} />
                                                {errors['manualData.resPin'] && <p className="text-red-500 text-xs mt-1">{errors['manualData.resPin']}</p>}
                                            </div>
                                            <input placeholder="State" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resState} onChange={(e) => handleManualDataChange('resState', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="STD Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resSTD} onChange={(e) => handleManualDataChange('resSTD', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Phone" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resPhone} onChange={(e) => handleManualDataChange('resPhone', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Country" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resCountry} onChange={(e) => handleManualDataChange('resCountry', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                    </div>

                                    {/* Office Address */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Office Address</h3>
                                            {mode === 'edit' && (
                                                <button
                                                    onClick={() => setManualData({ ...manualData, resFlat: manualData.offFlat, resBuilding: manualData.offBuilding, resRoad: manualData.offRoad, resArea: manualData.offArea, resCity: manualData.offCity, resPin: manualData.offPin, resState: manualData.offState, resSTD: manualData.offSTD, resPhone: manualData.offPhone, resCountry: manualData.offCountry })}
                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                >
                                                    ← Copy to Residence
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Flat/Block" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offFlat} onChange={(e) => handleManualDataChange('offFlat', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Building" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offBuilding} onChange={(e) => handleManualDataChange('offBuilding', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Road/Street" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offRoad} onChange={(e) => handleManualDataChange('offRoad', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Area" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offArea} onChange={(e) => handleManualDataChange('offArea', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="City" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offCity} onChange={(e) => handleManualDataChange('offCity', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Pin" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offPin} onChange={(e) => handleManualDataChange('offPin', e.target.value)} maxLength={6} disabled={mode === 'view'} />
                                            <input placeholder="State" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offState} onChange={(e) => handleManualDataChange('offState', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="STD Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offSTD} onChange={(e) => handleManualDataChange('offSTD', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Phone" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offPhone} onChange={(e) => handleManualDataChange('offPhone', e.target.value)} disabled={mode === 'view'} />
                                            <input placeholder="Country" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offCountry} onChange={(e) => handleManualDataChange('offCountry', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                        <div>
                                            <input placeholder="e-Mail" type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.offEmail} onChange={(e) => handleManualDataChange('offEmail', e.target.value)} disabled={mode === 'view'} />
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                        {/* Bank Details Section */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleSection('bank')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
                            >
                                <h2 className="text-lg font-semibold text-gold-600">Bank Details</h2>
                                {expandedSections.bank ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                            </button>
                            {expandedSections.bank && (
                                <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200 space-y-4">
                                    {bankAccounts.map((account, index) => (
                                        <div key={index} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-semibold text-slate-700">Account {index + 1}</h3>
                                                {bankAccounts.length > 1 && mode === 'edit' && (
                                                    <button
                                                        onClick={() => setBankAccounts(bankAccounts.filter((_, i) => i !== index))}
                                                        className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <input placeholder="Bank Name" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900 ${errors[`bankAccounts.${index}.bankName`] ? 'border-red-500' : 'border-slate-200'}`} value={account.bankName} onChange={(e) => {
                                                        const updated = [...bankAccounts];
                                                        updated[index].bankName = e.target.value;
                                                        setBankAccounts(updated);
                                                    }} disabled={mode === 'view'} />
                                                    {errors[`bankAccounts.${index}.bankName`] && <p className="text-red-500 text-xs mt-1">{errors[`bankAccounts.${index}.bankName`]}</p>}
                                                </div>
                                                <div>
                                                    <input placeholder="Branch" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900 ${errors[`bankAccounts.${index}.branch`] ? 'border-red-500' : 'border-slate-200'}`} value={account.branch} onChange={(e) => {
                                                        const updated = [...bankAccounts];
                                                        updated[index].branch = e.target.value;
                                                        setBankAccounts(updated);
                                                    }} disabled={mode === 'view'} />
                                                    {errors[`bankAccounts.${index}.branch`] && <p className="text-red-500 text-xs mt-1">{errors[`bankAccounts.${index}.branch`]}</p>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <input placeholder="Account Number" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900 ${errors[`bankAccounts.${index}.accountNumber`] ? 'border-red-500' : 'border-slate-200'}`} value={account.accountNumber} onChange={(e) => {
                                                        const updated = [...bankAccounts];
                                                        updated[index].accountNumber = e.target.value;
                                                        setBankAccounts(updated);
                                                    }} disabled={mode === 'view'} />
                                                    {errors[`bankAccounts.${index}.accountNumber`] && <p className="text-red-500 text-xs mt-1">{errors[`bankAccounts.${index}.accountNumber`]}</p>}
                                                </div>
                                                <div>
                                                    <input placeholder="IFSC Code" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900 ${errors[`bankAccounts.${index}.ifsc`] ? 'border-red-500' : 'border-slate-200'}`} value={account.ifsc} onChange={(e) => {
                                                        const updated = [...bankAccounts];
                                                        updated[index].ifsc = e.target.value.toUpperCase();
                                                        setBankAccounts(updated);
                                                    }} maxLength={11} disabled={mode === 'view'} />
                                                    {errors[`bankAccounts.${index}.ifsc`] && <p className="text-red-500 text-xs mt-1">{errors[`bankAccounts.${index}.ifsc`]}</p>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-100 disabled:text-slate-900" value={account.accountType} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].accountType = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'}>
                                                    <option>Savings</option><option>Current</option><option>Cash Credit</option><option>Overdraft</option><option>NRO</option><option>Other</option>
                                                </select>
                                                <input placeholder="Name as per Bank" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900" value={account.nameAsPerBank} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].nameAsPerBank = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'} />
                                            </div>
                                        </div>
                                    ))}
                                    {mode === 'edit' && (
                                        <button
                                            onClick={() => setBankAccounts([...bankAccounts, { bankName: '', branch: '', accountNumber: '', ifsc: '', accountType: 'Savings', nameAsPerBank: '' }])}
                                            className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-600 hover:border-gold-400 hover:text-gold-600 rounded-lg font-medium transition-colors"
                                        >
                                            + Add Another Account
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Jurisdiction Section */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleSection('jurisdiction')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
                            >
                                <h2 className="text-lg font-semibold text-gold-600">Jurisdiction Details</h2>
                                {expandedSections.jurisdiction ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                            </button>
                            {expandedSections.jurisdiction && (
                                <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Assessing Officer Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Area Description" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.areaDesc} onChange={(e) => setJurisdiction({ ...jurisdiction, areaDesc: e.target.value })} disabled={mode === 'view'} />
                                            <div>
                                                <input placeholder="Area Code" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.areaCd'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.areaCd} onChange={(e) => setJurisdiction({ ...jurisdiction, areaCd: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'areaCd', e.target.value)} disabled={mode === 'view'} />
                                                {errors['jurisdiction.areaCd'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.areaCd']}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <input placeholder="AO Name" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.aoPplrName'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.aoPplrName} onChange={(e) => setJurisdiction({ ...jurisdiction, aoPplrName: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'aoPplrName', e.target.value)} disabled={mode === 'view'} />
                                                {errors['jurisdiction.aoPplrName'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.aoPplrName']}</p>}
                                            </div>
                                            <div>
                                                <input placeholder="Range Code" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.rangeCd'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.rangeCd} onChange={(e) => setJurisdiction({ ...jurisdiction, rangeCd: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'rangeCd', e.target.value)} disabled={mode === 'view'} />
                                                {errors['jurisdiction.rangeCd'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.rangeCd']}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <input placeholder="AO Number" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.aoNo'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.aoNo} onChange={(e) => setJurisdiction({ ...jurisdiction, aoNo: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'aoNo', e.target.value)} disabled={mode === 'view'} />
                                                {errors['jurisdiction.aoNo'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.aoNo']}</p>}
                                            </div>
                                            <div>
                                                <input placeholder="AO Email" type="email" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.aoEmailId'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.aoEmailId} onChange={(e) => setJurisdiction({ ...jurisdiction, aoEmailId: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'aoEmailId', e.target.value)} disabled={mode === 'view'} />
                                                {errors['jurisdiction.aoEmailId'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.aoEmailId']}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">AO Office Address</h3>
                                        <input placeholder="Building Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoBldgDesc} onChange={(e) => setJurisdiction({ ...jurisdiction, aoBldgDesc: e.target.value })} disabled={mode === 'view'} />
                                        <input placeholder="Address" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoAddress} onChange={(e) => setJurisdiction({ ...jurisdiction, aoAddress: e.target.value })} disabled={mode === 'view'} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="City" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.city} onChange={(e) => setJurisdiction({ ...jurisdiction, city: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="State" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.state} onChange={(e) => setJurisdiction({ ...jurisdiction, state: e.target.value })} disabled={mode === 'view'} />
                                            <div>
                                                <input placeholder="Pin Code" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['jurisdiction.pinCode'] ? 'border-red-500' : 'border-slate-200'}`} value={jurisdiction.pinCode} onChange={(e) => setJurisdiction({ ...jurisdiction, pinCode: e.target.value })} onBlur={(e) => handleBlur('jurisdiction', 'pinCode', e.target.value)} maxLength={6} disabled={mode === 'view'} />
                                                {errors['jurisdiction.pinCode'] && <p className="text-red-500 text-xs mt-1">{errors['jurisdiction.pinCode']}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Form 49A/49AA Section */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleSection('form49')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
                            >
                                <h2 className="text-lg font-semibold text-gold-600">Form 49A/49AA Info</h2>
                                {expandedSections.form49 ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                            </button>
                            {expandedSections.form49 && (
                                <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Application Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900" value={form49.applicationType} onChange={(e) => setForm49({ ...form49, applicationType: e.target.value })} disabled={mode === 'view'}>
                                                <option>New PAN</option><option>Changes/Correction</option><option>Reprint of PAN Card</option>
                                            </select>
                                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900" value={form49.category} onChange={(e) => setForm49({ ...form49, category: e.target.value })} disabled={mode === 'view'}>
                                                <option>Individual</option><option>HUF</option><option>Company</option><option>Firm</option><option>AOP</option><option>BOI</option><option>Trust</option><option>LLP</option>
                                            </select>
                                            <input placeholder="Source of Income" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.sourceOfIncome} onChange={(e) => setForm49({ ...form49, sourceOfIncome: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <input placeholder="Aadhaar Number" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['form49.aadhaarNumber'] ? 'border-red-500' : 'border-slate-200'}`} value={form49.aadhaarNumber} onChange={(e) => setForm49({ ...form49, aadhaarNumber: e.target.value })} onBlur={(e) => handleBlur('form49', 'aadhaarNumber', e.target.value)} maxLength={12} disabled={mode === 'view'} />
                                                {errors['form49.aadhaarNumber'] && <p className="text-red-500 text-xs mt-1">{errors['form49.aadhaarNumber']}</p>}
                                            </div>
                                            <input type="date" placeholder="Application Date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.applicationDate} onChange={(e) => setForm49({ ...form49, applicationDate: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="Acknowledgement No." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.acknowledgementNumber} onChange={(e) => setForm49({ ...form49, acknowledgementNumber: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Name Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <input placeholder="Name on PAN Card" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900 ${errors['form49.nameOnCard'] ? 'border-red-500' : 'border-slate-200'}`} value={form49.nameOnCard} onChange={(e) => setForm49({ ...form49, nameOnCard: e.target.value })} onBlur={(e) => handleBlur('form49', 'nameOnCard', e.target.value)} disabled={mode === 'view'} />
                                                {errors['form49.nameOnCard'] && <p className="text-red-500 text-xs mt-1">{errors['form49.nameOnCard']}</p>}
                                            </div>
                                            <input placeholder="Father's Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.fatherName} onChange={(e) => setForm49({ ...form49, fatherName: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                        <input placeholder="Mother's Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.motherName} onChange={(e) => setForm49({ ...form49, motherName: e.target.value })} disabled={mode === 'view'} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Document Proofs</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900" value={form49.proofOfIdentity} onChange={(e) => setForm49({ ...form49, proofOfIdentity: e.target.value })} disabled={mode === 'view'}>
                                                <option>Aadhaar Card</option><option>Voter ID</option><option>Passport</option><option>Driving License</option><option>Ration Card</option><option>Bank Certificate</option>
                                            </select>
                                            <input placeholder="Identity Doc Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.identityDocNumber} onChange={(e) => setForm49({ ...form49, identityDocNumber: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-900" value={form49.proofOfAddress} onChange={(e) => setForm49({ ...form49, proofOfAddress: e.target.value })} disabled={mode === 'view'}>
                                                <option>Aadhaar Card</option><option>Voter ID</option><option>Passport</option><option>Driving License</option><option>Electricity Bill</option><option>Telephone Bill</option><option>Bank Statement</option>
                                            </select>
                                            <input placeholder="Address Doc Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.addressDocNumber} onChange={(e) => setForm49({ ...form49, addressDocNumber: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24">
                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Actions</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={handleFetchOnline}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
                                >
                                    <Globe className="w-4 h-4" />
                                    <span>Fetch Online</span>
                                </button>
                                {getLastUpdatedDate() && (
                                    <div className="text-center pt-1">
                                        <p className="text-xs text-slate-400">Last updated on</p>
                                        <p className="text-sm font-medium text-slate-600">{getLastUpdatedDate()}</p>
                                    </div>
                                )}

                                <JsonUploadButton onUpload={handleJsonUpload} />

                                <div className="h-px bg-slate-100 my-2"></div>

                                {mode === 'view' ? (
                                    <button
                                        onClick={() => setMode('edit')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        <span>Edit Profile</span>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setMode('view')}
                                            className="flex items-center justify-center gap-2 px-3 py-3 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-700 hover:text-red-600 rounded-lg font-medium transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Cancel</span>
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isLoading}
                                            className="flex items-center justify-center gap-2 px-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>{isLoading ? 'Saving...' : 'Save'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Validation Errors Summary */}
                        {Object.keys(errors).length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Validation Errors ({Object.keys(errors).length})
                                </h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.entries(errors).map(([path, message]) => {
                                        // Format the field path to be more readable
                                        const fieldName = path.split('.').map((part, index) => {
                                            if (part === 'manualData') return 'Personal';
                                            if (part === 'bankAccounts') return 'Bank';
                                            if (part === 'jurisdiction') return 'Jurisdiction';
                                            if (part === 'form49') return 'Form 49';
                                            // Convert camelCase to Title Case
                                            if (index > 0 && !isNaN(Number(part))) return `#${Number(part) + 1}`;
                                            return part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                        }).join(' → ');

                                        return (
                                            <div key={path} className="bg-white border border-red-200 rounded-lg p-3">
                                                <p className="text-xs font-medium text-red-900 mb-1">{fieldName}</p>
                                                <p className="text-xs text-red-700">{message}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <BottomBar />

            <FetchProgressModal
                isOpen={showFetchModal}
                onClose={() => {
                    if (fetchComplete) {
                        setShowFetchModal(false);
                        setShowPreviewModal(true);
                    } else {
                        setShowFetchModal(false);
                    }
                }}
                onCancel={() => setShowFetchModal(false)}
                status={fetchStatus}
                isComplete={fetchComplete}
                isError={fetchError}
            />

            <DataPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onConfirm={handlePreviewConfirm}
                currentData={{ manualData, bankAccounts, jurisdiction }}
                newData={fetchedData}
            />
        </div >
    );
}
