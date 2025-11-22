import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface JsonUploadButtonProps {
    onUpload: (data: any) => void;
}

export function JsonUploadButton({ onUpload }: JsonUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const mappedData = mapJsonToProfile(json);
                onUpload(mappedData);
                // Reset input so same file can be selected again if needed
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error("Error parsing JSON", error);
                alert("Invalid JSON file or format");
            }
        };
        reader.readAsText(file);
    };

    const decodeBase64 = (str: string): string => {
        try {
            return atob(str);
        } catch (e) {
            return str; // Return original if not Base64
        }
    };

    const mapJsonToProfile = (json: any) => {
        const pi = json.personalInfo || {};
        const addr = pi.address || {};
        const assessee = pi.assesseeName || {};

        // Decode Aadhaar if it's Base64 encoded
        let aadhaarNumber = pi.aadhaarCardNo || '';
        if (aadhaarNumber && aadhaarNumber.length !== 12) {
            aadhaarNumber = decodeBase64(aadhaarNumber);
        }

        const manualData: any = {
            firstName: assessee.firstName || '',
            middleName: assessee.middleName || '',
            lastName: assessee.surNameOrOrgName || '',
            panNumber: pi.pan || '',
            status: pi.status === 'I' ? 'Individual' : (pi.status || 'Individual'),
            dob: pi.dob || '',
            birthDate: pi.dob || '',
            aadhaarNumber: aadhaarNumber,
            mobile: addr.mobileNo ? String(addr.mobileNo) : '',
            emailInReturn: addr.emailAddress || '',
            fatherName: pi.fatherName || '',

            // Address Mapping
            resFlat: addr.residenceNo || '',
            resBuilding: addr.residenceName || '',
            resRoad: addr.roadOrStreet || '',
            resArea: addr.localityOrArea || '',
            resCity: addr.cityOrTownOrDistrict || '',
            resState: addr.stateCode || '',
            resPin: addr.pinCode ? String(addr.pinCode) : '',
            resCountry: addr.countryCode ? String(addr.countryCode) : '91',
            resPhone: addr.phone && typeof addr.phone === 'object' && Object.keys(addr.phone).length === 0 ? '' : String(addr.phone || ''),
        };

        // Bank Accounts Mapping
        const bankAccounts: any[] = [];
        if (json.bankAccountDtls) {
            const bankDtls = Array.isArray(json.bankAccountDtls) ? json.bankAccountDtls : [json.bankAccountDtls];
            bankDtls.forEach((dtl: any) => {
                if (dtl.addtnlBankDetails && Array.isArray(dtl.addtnlBankDetails)) {
                    dtl.addtnlBankDetails.forEach((acc: any) => {
                        bankAccounts.push({
                            bankName: acc.bankName || '',
                            branch: '', // Not present in sample JSON
                            accountNumber: acc.bankAccountNo || '',
                            ifsc: acc.ifsccode || '',
                            accountType: acc.AccountType === 'SB' ? 'Savings' : (acc.AccountType || 'Savings'),
                            nameAsPerBank: '' // Not present in sample JSON
                        });
                    });
                }
            });
        }

        return { manualData, bankAccounts };
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
            >
                <Upload className="w-4 h-4" />
                <span>Upload JSON</span>
            </button>
        </>
    );
}
