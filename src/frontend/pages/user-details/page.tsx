import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { TopNavBar } from '../../components/TopNavBar';
import { BottomBar } from '../../components/BottomBar';
import { Loader2, Pencil, RefreshCw, Save, X } from 'lucide-react';
import { FetchProgressModal } from '../../components/FetchProgressModal';
import DataPreviewModal from '../../components/DataPreviewModal';

interface UserDetailsPageProps {
    pan: string;
    onBack: () => void;
}

export function UserDetailsPage({ pan, onBack }: UserDetailsPageProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('personal');

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>(null);

    // Fetch Online State
    const [password, setPassword] = useState<string | null>(null);
    const [showFetchModal, setShowFetchModal] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('Initializing...');
    const [isFetchComplete, setIsFetchComplete] = useState(false);
    const [isFetchError, setIsFetchError] = useState(false);

    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [fetchedData, setFetchedData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [pan]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Try to get full user data
            const result = await api.getUserData(pan);

            if (result.success && result.data) {
                setData(result.data);
                setEditData(JSON.parse(JSON.stringify(result.data))); // Deep copy for editing
            } else {
                // 2. If no data, check if we have credentials
                const creds = await api.getPanWithPassword(pan);
                if (creds && creds.password) {
                    setPassword(creds.password);
                    // Don't set error, just leave data null to show "Fetch Online" view
                } else {
                    setError(result.message || 'Failed to load user data');
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchOnline = async () => {
        if (!password) {
            // Try to get password if not already set
            const creds = await api.getPanWithPassword(pan);
            if (creds && creds.password) {
                setPassword(creds.password);
            } else {
                alert("No saved password found for this PAN.");
                return;
            }
        }

        setShowFetchModal(true);
        setFetchStatus('Initializing...');
        setIsFetchComplete(false);
        setIsFetchError(false);

        const progressListener = (_: any, status: string) => {
            setFetchStatus(status);
        };

        window.electronAPI.onFetchProgress(progressListener);

        try {
            // Fetch with save=false to preview first
            const result = await api.fetchUserProfile(pan, password!, false);

            if (result.success && result.data) {
                setIsFetchComplete(true);
                setFetchedData(result.data);

                // Close progress modal and open preview modal
                setTimeout(() => {
                    setShowFetchModal(false);
                    setShowPreviewModal(true);
                }, 1000);
            } else {
                setFetchStatus(result.message || 'Failed to fetch data');
                setIsFetchError(true);
            }
        } catch (error: any) {
            setFetchStatus(error.message || 'An error occurred');
            setIsFetchError(true);
        }
    };

    const handleConfirmUpdate = async () => {
        // User confirmed the preview, now save the data
        setShowPreviewModal(false);
        setShowFetchModal(true);
        setFetchStatus('Saving data...');
        setIsFetchComplete(false);

        try {
            // Directly save the fetched data without re-login
            const result = await api.saveFetchedProfile(fetchedData);

            if (result.success) {
                setIsFetchComplete(true);
                setFetchStatus('Data updated successfully!');
                setTimeout(() => {
                    setShowFetchModal(false);
                    loadData();
                }, 1500);
            } else {
                setFetchStatus(result.message || 'Failed to save data');
                setIsFetchError(true);
            }
        } catch (error: any) {
            setFetchStatus(error.message || 'An error occurred while saving');
            setIsFetchError(true);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel edit
            setIsEditing(false);
            setEditData(JSON.parse(JSON.stringify(data))); // Reset
        } else {
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        try {
            setLoading(true);

            // Ensure PAN is present in the payload and sub-objects
            const payload = {
                ...editData,
                pan: pan // Ensure root PAN is present
            };

            // Ensure jurisdiction has PAN if it exists
            if (payload.jurisdiction) {
                payload.jurisdiction = {
                    ...payload.jurisdiction,
                    pan: pan
                };
            }

            // Ensure user object has PAN
            if (payload.user) {
                payload.user = {
                    ...payload.user,
                    pan: pan
                };
            }

            const result = await api.updateUserDetails(payload);
            if (result.success) {
                setIsEditing(false);
                loadData(); // Reload to confirm
            } else {
                alert('Failed to save changes: ' + result.message);
            }
        } catch (error: any) {
            alert('Error saving changes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (section: string, field: string, value: any, index?: number) => {
        setEditData((prev: any) => {
            const newData = { ...prev };
            if (section === 'user') {
                newData.user = { ...newData.user, [field]: value };
            } else if (section === 'jurisdiction') {
                newData.jurisdiction = { ...newData.jurisdiction, [field]: value };
            } else if (section === 'bank' && typeof index === 'number') {
                const newBankAccounts = [...(newData.bankAccounts || [])];
                newBankAccounts[index] = { ...newBankAccounts[index], [field]: value };
                newData.bankAccounts = newBankAccounts;
            }
            return newData;
        });
    };

    const handleAddBankAccount = () => {
        setEditData((prev: any) => {
            const newData = { ...prev };
            const newBank = {
                bankName: '',
                bankAcctNum: '',
                ifscCd: '',
                accountType: 'SAVINGS',
                refundFlag: 'N',
                status: 'Pending'
            };
            newData.bankAccounts = [...(newData.bankAccounts || []), newBank];
            return newData;
        });
    };

    const handleDeleteBankAccount = (index: number) => {
        setEditData((prev: any) => {
            const newData = { ...prev };
            const newBankAccounts = [...(newData.bankAccounts || [])];
            newBankAccounts.splice(index, 1);
            newData.bankAccounts = newBankAccounts;
            return newData;
        });
    };

    const handleCloseModal = () => {
        setShowFetchModal(false);
    };

    const handleCancelFetch = () => {
        setShowFetchModal(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
                <span className="ml-2 text-slate-600">Loading profile...</span>
            </div>
        );
    }

    // Show "Fetch Online" view if no data but we have password
    if (!data && password) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <TopNavBar pageName={`Profile: ${pan}`} onBack={onBack} />

                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Data Missing</h2>
                        <p className="text-slate-500 mb-6">
                            We found credentials for PAN <strong>{pan}</strong>, but the profile data hasn't been fetched yet.
                        </p>
                        <button
                            onClick={handleFetchOnline}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Fetch Profile Online</span>
                            <span className="text-xs opacity-80">(using saved password)</span>
                        </button>
                    </div>
                </div>

                <FetchProgressModal
                    isOpen={showFetchModal}
                    onClose={handleCloseModal}
                    onCancel={handleCancelFetch}
                    status={fetchStatus}
                    isComplete={isFetchComplete}
                    isError={isFetchError}
                />

                {/* Preview Modal for initial fetch too */}
                <DataPreviewModal
                    isOpen={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    onConfirm={handleConfirmUpdate}
                    currentData={null}
                    newData={fetchedData}
                />

                <BottomBar />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="text-red-500 mb-4">Error: {error || 'No data found'}</div>
                <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-white rounded">Go Back</button>
            </div>
        );
    }

    const displayData = isEditing ? editData : data;
    const { user, bankAccounts, jurisdiction } = displayData || {};

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <TopNavBar pageName={`Profile: ${pan}`} onBack={onBack} />

            <div className="flex-1 container mx-auto px-4 py-20">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold">{user?.fullName}</h1>
                            <div className="flex gap-4 mt-2 text-slate-300 text-sm">
                                <span>PAN: {user?.pan}</span>
                                <span>•</span>
                                <span>Status: {user?.panStatus}</span>
                                <span>•</span>
                                <span>DOB: {user?.dob}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={handleFetchOnline}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Fetch Online
                                    </button>
                                    <button
                                        onClick={handleEditToggle}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleEditToggle}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'personal' ? 'bg-white border-t-2 border-gold-500 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Personal Info
                        </button>
                        <button
                            onClick={() => setActiveTab('bank')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'bank' ? 'bg-white border-t-2 border-gold-500 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Bank Accounts ({bankAccounts?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('jurisdiction')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'jurisdiction' ? 'bg-white border-t-2 border-gold-500 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Jurisdiction
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 min-h-[400px]">
                        {activeTab === 'personal' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-900 border-b pb-2">Contact Details</h3>
                                    <div className="grid grid-cols-2 gap-y-4 text-sm items-center">
                                        <span className="text-slate-500">Mobile:</span>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={user?.mobileNo || ''}
                                                onChange={(e) => handleInputChange('user', 'mobileNo', e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        ) : (
                                            <span className="font-medium">{user?.mobileNo}</span>
                                        )}

                                        <span className="text-slate-500">Email:</span>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={user?.email || ''}
                                                onChange={(e) => handleInputChange('user', 'email', e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        ) : (
                                            <span className="font-medium">{user?.email}</span>
                                        )}

                                        <span className="text-slate-500">Aadhaar:</span>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={user?.aadhaarNum || ''}
                                                onChange={(e) => handleInputChange('user', 'aadhaarNum', e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        ) : (
                                            <span className="font-medium">{user?.aadhaarNum}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-900 border-b pb-2">Address</h3>
                                    <div className="text-sm text-slate-700 space-y-2">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Line 1"
                                                    value={user?.addrLine1Txt || ''}
                                                    onChange={(e) => handleInputChange('user', 'addrLine1Txt', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Line 2"
                                                    value={user?.addrLine2Txt || ''}
                                                    onChange={(e) => handleInputChange('user', 'addrLine2Txt', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Line 3"
                                                    value={user?.addrLine3Txt || ''}
                                                    onChange={(e) => handleInputChange('user', 'addrLine3Txt', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="City"
                                                    value={user?.addrLine4Txt || ''}
                                                    onChange={(e) => handleInputChange('user', 'addrLine4Txt', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="State"
                                                        value={user?.stateCd || ''}
                                                        onChange={(e) => handleInputChange('user', 'stateCd', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Pin"
                                                        value={user?.pinCd || ''}
                                                        onChange={(e) => handleInputChange('user', 'pinCd', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p>{user?.addrLine1Txt}</p>
                                                <p>{user?.addrLine2Txt}</p>
                                                <p>{user?.addrLine3Txt}</p>
                                                <p>{user?.addrLine4Txt}</p>
                                                <p>{user?.stateCd} - {user?.pinCd}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bank' && (
                            <div className="space-y-4">
                                {isEditing && (
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={handleAddBankAccount}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <span className="text-lg leading-none">+</span>
                                            Add Bank Account
                                        </button>
                                    </div>
                                )}
                                {bankAccounts?.map((acc: any, idx: number) => (
                                    <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors relative group">
                                        {isEditing && (
                                            <button
                                                onClick={() => handleDeleteBankAccount(idx)}
                                                className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove Account"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        <div className="flex justify-between items-start mb-2 pr-8">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={acc.bankName || ''}
                                                    onChange={(e) => handleInputChange('bank', 'bankName', e.target.value, idx)}
                                                    className="font-semibold text-slate-900 border rounded px-2 py-1 w-1/2"
                                                    placeholder="Bank Name"
                                                />
                                            ) : (
                                                <h4 className="font-semibold text-slate-900">{acc.bankName}</h4>
                                            )}

                                            {isEditing ? (
                                                <select
                                                    value={acc.status || ''}
                                                    onChange={(e) => handleInputChange('bank', 'status', e.target.value, idx)}
                                                    className={`px-2 py-1 rounded text-xs border ${acc.status === 'Validated' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                                                >
                                                    <option value="Validated">Validated</option>
                                                    <option value="Failed">Failed</option>
                                                    <option value="Pending">Pending</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs ${acc.status === 'Validated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {acc.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                                            <div>
                                                <span className="block text-slate-500 text-xs mb-1">Account Number</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={acc.bankAcctNum || ''}
                                                        onChange={(e) => handleInputChange('bank', 'bankAcctNum', e.target.value, idx)}
                                                        className="font-mono border rounded px-2 py-1 w-full text-xs"
                                                    />
                                                ) : (
                                                    <span className="font-mono">{acc.bankAcctNum}</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 text-xs mb-1">IFSC</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={acc.ifscCd || ''}
                                                        onChange={(e) => handleInputChange('bank', 'ifscCd', e.target.value, idx)}
                                                        className="font-mono border rounded px-2 py-1 w-full text-xs"
                                                    />
                                                ) : (
                                                    <span className="font-mono">{acc.ifscCd}</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 text-xs mb-1">Type</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={acc.accountType || ''}
                                                        onChange={(e) => handleInputChange('bank', 'accountType', e.target.value, idx)}
                                                        className="border rounded px-2 py-1 w-full text-xs"
                                                    />
                                                ) : (
                                                    <span>{acc.accountType}</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 text-xs mb-1">Refund Eligible</span>
                                                {isEditing ? (
                                                    <select
                                                        value={acc.refundFlag || 'N'}
                                                        onChange={(e) => handleInputChange('bank', 'refundFlag', e.target.value, idx)}
                                                        className="border rounded px-2 py-1 w-full text-xs"
                                                    >
                                                        <option value="Y">Yes</option>
                                                        <option value="N">No</option>
                                                    </select>
                                                ) : (
                                                    <span>{acc.refundFlag === 'Y' ? 'Yes' : 'No'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!bankAccounts || bankAccounts.length === 0) && (
                                    <div className="text-center text-slate-500 py-8">No bank accounts found.</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'jurisdiction' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-slate-900 border-b pb-2">AO Details</h3>
                                        <div className="grid grid-cols-2 gap-y-4 text-sm items-center">
                                            <span className="text-slate-500">Area Code:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={jurisdiction?.areaCd || ''}
                                                    onChange={(e) => handleInputChange('jurisdiction', 'areaCd', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                            ) : (
                                                <span className="font-medium">{jurisdiction?.areaCd}</span>
                                            )}

                                            <span className="text-slate-500">AO Type:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={jurisdiction?.aoType || ''}
                                                    onChange={(e) => handleInputChange('jurisdiction', 'aoType', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                            ) : (
                                                <span className="font-medium">{jurisdiction?.aoType}</span>
                                            )}

                                            <span className="text-slate-500">Range Code:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={jurisdiction?.rangeCd || ''}
                                                    onChange={(e) => handleInputChange('jurisdiction', 'rangeCd', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                            ) : (
                                                <span className="font-medium">{jurisdiction?.rangeCd}</span>
                                            )}

                                            <span className="text-slate-500">AO No:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={jurisdiction?.aoNo || ''}
                                                    onChange={(e) => handleInputChange('jurisdiction', 'aoNo', e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                            ) : (
                                                <span className="font-medium">{jurisdiction?.aoNo}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-slate-900 border-b pb-2">Office Info</h3>
                                        <div className="text-sm text-slate-700 space-y-2">
                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                <span className="text-slate-500">Name:</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={jurisdiction?.aoPplrName || ''}
                                                        onChange={(e) => handleInputChange('jurisdiction', 'aoPplrName', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <span>{jurisdiction?.aoPplrName}</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                <span className="text-slate-500">Email:</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={jurisdiction?.aoEmailId || ''}
                                                        onChange={(e) => handleInputChange('jurisdiction', 'aoEmailId', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <span>{jurisdiction?.aoEmailId}</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                <span className="text-slate-500">Building:</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={jurisdiction?.aoBldgDesc || ''}
                                                        onChange={(e) => handleInputChange('jurisdiction', 'aoBldgDesc', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <span>{jurisdiction?.aoBldgDesc}</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                <span className="text-slate-500">Description:</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={jurisdiction?.areaDesc || ''}
                                                        onChange={(e) => handleInputChange('jurisdiction', 'areaDesc', e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <span>{jurisdiction?.areaDesc}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FetchProgressModal
                isOpen={showFetchModal}
                onClose={handleCloseModal}
                onCancel={handleCancelFetch}
                status={fetchStatus}
                isComplete={isFetchComplete}
                isError={isFetchError}
            />

            <DataPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onConfirm={handleConfirmUpdate}
                currentData={data}
                newData={fetchedData}
            />

            <BottomBar />
        </div>
    );
}
