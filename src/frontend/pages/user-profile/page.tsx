import React, { useState, useEffect } from 'react';
import { TopNavBar } from '../../components/TopNavBar';
import { BottomBar } from '../../components/BottomBar';
import { api } from '../../api';
import { ChevronDown, ChevronUp, Globe, Upload, Edit2, Save, X } from 'lucide-react';
import { FetchProgressModal } from '../../components/FetchProgressModal';
import DataPreviewModal from '../../components/DataPreviewModal';

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

    // State from original add-user page
    const [manualData, setManualData] = useState({
        prefix: 'Mr.', firstName: '', middleName: '', lastName: '',
        status: 'Individual', residence: 'Resident', panNumber: pan || '', employeeType: '', fileNo: '',
        gender: 'M', birthDate: '', seniorCitizen: false, businessName: '', verifiedBy: '', fatherName: '', capacity: '',
        emailInReturn: '', itDepEmail: '',
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
                            firstName: data.user.firstName || '',
                            middleName: data.user.middleName || '',
                            lastName: data.user.lastName || '',
                            panNumber: data.user.pan || pan,
                            // ... map other fields
                        }));
                    }
                    if (data.bankAccounts) {
                        setBankAccounts(data.bankAccounts);
                    }
                    if (data.jurisdiction) {
                        setJurisdiction(data.jurisdiction);
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
        const currentPan = manualData.panNumber || pan;

        if (!currentPan) {
            alert("Please enter a PAN Number.");
            return;
        }

        if (!password) {
            alert("Please enter the IT Portal Password.");
            return;
        }

        setShowFetchModal(true);
        setFetchStatus('Initializing...');
        setFetchComplete(false);
        setFetchError(false);

        // Add progress listener
        const progressListener = (_: any, status: string) => {
            setFetchStatus(status);
        };
        // @ts-ignore - window.electronAPI might not be fully typed in this context
        if (window.electronAPI && window.electronAPI.onFetchProgress) {
            window.electronAPI.onFetchProgress(progressListener);
        }

        try {
            // Fetch profile using the provided password
            setFetchStatus('Logging in to Income Tax Portal...');
            const response = await api.fetchUserProfile(currentPan, password, false);

            if (response.success && response.data) {
                setFetchStatus('Processing data...');

                // Map the fetched data immediately for preview
                const mapped = mapApiDataToFormData(response.data, manualData);
                setFetchedData(mapped); // Store the MAPPED data, not raw API data

                setFetchComplete(true);
                setFetchStatus('Data fetched successfully!');
            } else {
                throw new Error(response.message || 'Failed to fetch data');
            }
        } catch (err: any) {
            console.error(err);
            setFetchError(true);
            setFetchStatus(err.message || 'Failed to fetch data');
        }
    };

    const handlePreviewConfirm = () => {
        if (!fetchedData) return;

        // Update local state with fetched data (which is already mapped now)
        setManualData(fetchedData.manualData);
        if (fetchedData.bankAccounts && fetchedData.bankAccounts.length > 0) {
            setBankAccounts(fetchedData.bankAccounts);
        }
        if (fetchedData.jurisdiction && Object.keys(fetchedData.jurisdiction).length > 0) {
            setJurisdiction(prev => ({ ...prev, ...fetchedData.jurisdiction }));
        }

        setShowPreviewModal(false);
        setShowFetchModal(false);
        alert('Data merged successfully! Please review the form and click Save.');
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const dataToSave = {
                user: { ...manualData, pan: manualData.panNumber },
                bankAccounts,
                jurisdiction,
                form49
            };

            if (pan) {
                await api.updateUserDetails(dataToSave);
            } else {
                await api.saveFetchedProfile(dataToSave);
            }

            // Save password if provided
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
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Helper to handle manual data changes
    const handleManualDataChange = (field: string, value: any) => {
        setManualData(prev => ({ ...prev, [field]: value }));
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

                                    {/* Assessee Name */}
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
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                    placeholder="First Name"
                                                    value={manualData.firstName}
                                                    onChange={(e) => handleManualDataChange('firstName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Middle Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                    placeholder="Middle Name"
                                                    value={manualData.middleName}
                                                    onChange={(e) => handleManualDataChange('middleName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                    placeholder="Last Name"
                                                    value={manualData.lastName}
                                                    onChange={(e) => handleManualDataChange('lastName', e.target.value)}
                                                    disabled={mode === 'view'}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Residence */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    </div>

                                    {/* Identification */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">PAN</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 uppercase disabled:bg-slate-50 disabled:text-slate-900"
                                                placeholder="PAN"
                                                maxLength={10}
                                                value={manualData.panNumber}
                                                onChange={(e) => handleManualDataChange('panNumber', e.target.value.toUpperCase())}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">IT Portal Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Employee Type</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                placeholder="Employee Type"
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
                                                placeholder="File #"
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
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                value={manualData.birthDate}
                                                onChange={(e) => handleManualDataChange('birthDate', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
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
                                                placeholder="Business Name"
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
                                                placeholder="Verified By"
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
                                                placeholder="Father Name"
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
                                                placeholder="Capacity"
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
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                placeholder="e-Mail in Return"
                                                value={manualData.emailInReturn}
                                                onChange={(e) => handleManualDataChange('emailInReturn', e.target.value)}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">IT Dep. e-Mail</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900"
                                                placeholder="IT Dep. e-Mail"
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
                                            <input placeholder="Pin" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={manualData.resPin} onChange={(e) => handleManualDataChange('resPin', e.target.value)} maxLength={6} disabled={mode === 'view'} />
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
                                                <input placeholder="Bank Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900" value={account.bankName} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].bankName = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'} />
                                                <input placeholder="Branch" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900" value={account.branch} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].branch = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input placeholder="Account Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900" value={account.accountNumber} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].accountNumber = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'} />
                                                <input placeholder="IFSC Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-100 disabled:text-slate-900" value={account.ifsc} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].ifsc = e.target.value.toUpperCase();
                                                    setBankAccounts(updated);
                                                }} maxLength={11} disabled={mode === 'view'} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 bg-white disabled:bg-slate-100 disabled:text-slate-900" value={account.accountType} onChange={(e) => {
                                                    const updated = [...bankAccounts];
                                                    updated[index].accountType = e.target.value;
                                                    setBankAccounts(updated);
                                                }} disabled={mode === 'view'}>
                                                    <option>Savings</option><option>Current</option><option>Cash Credit</option><option>Overdraft</option>
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
                                            <input placeholder="Area Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.areaCd} onChange={(e) => setJurisdiction({ ...jurisdiction, areaCd: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="AO Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoPplrName} onChange={(e) => setJurisdiction({ ...jurisdiction, aoPplrName: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="Range Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.rangeCd} onChange={(e) => setJurisdiction({ ...jurisdiction, rangeCd: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="AO Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoNo} onChange={(e) => setJurisdiction({ ...jurisdiction, aoNo: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="AO Email" type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoEmailId} onChange={(e) => setJurisdiction({ ...jurisdiction, aoEmailId: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">AO Office Address</h3>
                                        <input placeholder="Building Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoBldgDesc} onChange={(e) => setJurisdiction({ ...jurisdiction, aoBldgDesc: e.target.value })} disabled={mode === 'view'} />
                                        <input placeholder="Address" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.aoAddress} onChange={(e) => setJurisdiction({ ...jurisdiction, aoAddress: e.target.value })} disabled={mode === 'view'} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input placeholder="City" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.city} onChange={(e) => setJurisdiction({ ...jurisdiction, city: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="State" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.state} onChange={(e) => setJurisdiction({ ...jurisdiction, state: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="Pin Code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={jurisdiction.pinCode} onChange={(e) => setJurisdiction({ ...jurisdiction, pinCode: e.target.value })} maxLength={6} disabled={mode === 'view'} />
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
                                            <input placeholder="Aadhaar Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.aadhaarNumber} onChange={(e) => setForm49({ ...form49, aadhaarNumber: e.target.value })} maxLength={12} disabled={mode === 'view'} />
                                            <input type="date" placeholder="Application Date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.applicationDate} onChange={(e) => setForm49({ ...form49, applicationDate: e.target.value })} disabled={mode === 'view'} />
                                            <input placeholder="Acknowledgement No." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.acknowledgementNumber} onChange={(e) => setForm49({ ...form49, acknowledgementNumber: e.target.value })} disabled={mode === 'view'} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">Name Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input placeholder="Name on PAN Card" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/50 disabled:bg-slate-50 disabled:text-slate-900" value={form49.nameOnCard} onChange={(e) => setForm49({ ...form49, nameOnCard: e.target.value })} disabled={mode === 'view'} />
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

                                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload JSON</span>
                                </button>

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
        </div>
    );
}
