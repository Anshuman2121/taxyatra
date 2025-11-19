import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface RegistrationPageProps {
    onRegistered: () => void;
}

export default function RegistrationPage({ onRegistered }: RegistrationPageProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [machineId, setMachineId] = useState('');

    useEffect(() => {
        const getMid = async () => {
            try {
                const mid = await window.electronAPI.getMachineId();
                setMachineId(mid);
            } catch (e) {
                console.error('Failed to get machine ID', e);
            }
        };
        getMid();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await window.electronAPI.submitRegistration(licenseKey);
            if (result.success) {
                onRegistered();
            } else {
                setError(result.error || 'Registration failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 text-center border-b border-gray-100">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
                        <ShieldCheck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">TaxYatra Activation</h2>
                    <p className="text-gray-500 mt-1">
                        Please enter your license key to activate this machine.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">License Key</label>
                        <input
                            type="text"
                            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase"
                        />
                    </div>
                    {machineId && (
                        <div className="text-xs text-center text-gray-500">
                            Machine ID: <span className="font-mono">{machineId}</span>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !licenseKey}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Activate License
                    </button>
                </form>
            </div>
        </div>
    );
}
