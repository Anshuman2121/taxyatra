import React from 'react';
import { X, Check } from 'lucide-react';

interface DataPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    currentData: any;
    newData: any;
}

const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentData,
    newData
}) => {
    if (!isOpen) return null;

    // Helper to compare values and highlight changes
    const renderComparison = (label: string, oldVal: any, newVal: any) => {
        const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

        // If both are empty/null, don't show
        if (!oldVal && !newVal) return null;

        return (
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100 text-sm">
                <div className="font-medium text-slate-600">{label}</div>
                <div className="text-slate-500 break-words">{oldVal || '-'}</div>
                <div className={`break-words ${isDifferent ? 'text-green-600 font-medium bg-green-50 px-2 rounded' : 'text-slate-900'}`}>
                    {newVal || '-'}
                </div>
            </div>
        );
    };

    // Extract relevant fields for comparison
    const getPersonalInfo = (data: any) => {
        if (!data) return {};
        // Handle both structure types (DB vs API)
        // DB structure: user object
        // API structure: personalInfo object

        if (data.user) {
            return {
                name: data.user.fullName,
                dob: data.user.dob,
                mobile: data.user.mobileNo,
                email: data.user.email,
                aadhaar: data.user.aadhaarNum,
                address: `${data.user.addrLine1Txt || ''} ${data.user.addrLine2Txt || ''} ${data.user.addrLine3Txt || ''} ${data.user.addrLine4Txt || ''} ${data.user.stateCd || ''} ${data.user.pinCd || ''}`.trim()
            };
        } else if (data.personalInfo) {
            const pi = data.personalInfo;
            const addr = pi.address || {};
            return {
                name: `${pi.assesseeName?.firstName || ''} ${pi.assesseeName?.middleName || ''} ${pi.assesseeName?.surNameOrOrgName || ''}`.trim(),
                dob: pi.dob,
                mobile: addr.mobileNo,
                email: addr.emailAddress,
                aadhaar: pi.aadhaarCardNo,
                address: `${addr.addrLine1Txt || ''} ${addr.addrLine2Txt || ''} ${addr.addrLine3Txt || ''} ${addr.addrLine4Txt || ''} ${addr.stateCd || ''} ${addr.pinCd || ''}`.trim()
            };
        }
        return {};
    };

    const oldInfo = getPersonalInfo(currentData);
    const newInfo = getPersonalInfo(newData);

    const oldBanks = currentData?.bankAccounts?.length || 0;
    const newBanks = newData?.bankAccountDtls?.length || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Review Updates</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Compare the fetched data with your existing records before saving.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-4 mb-4 font-semibold text-sm text-slate-400 uppercase tracking-wider">
                        <div>Field</div>
                        <div>Current Value</div>
                        <div>New Value</div>
                    </div>

                    <div className="space-y-1">
                        {renderComparison('Full Name', oldInfo.name, newInfo.name)}
                        {renderComparison('Date of Birth', oldInfo.dob, newInfo.dob)}
                        {renderComparison('Mobile', oldInfo.mobile, newInfo.mobile)}
                        {renderComparison('Email', oldInfo.email, newInfo.email)}
                        {renderComparison('Aadhaar', oldInfo.aadhaar, newInfo.aadhaar)}
                        {renderComparison('Address', oldInfo.address, newInfo.address)}
                        {renderComparison('Bank Accounts', `${oldBanks} Accounts`, `${newBanks} Accounts`)}
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                        <strong>Note:</strong> Confirming this update will overwrite your existing local data with the information fetched from the income tax portal.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Confirm Update
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DataPreviewModal;
