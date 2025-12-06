import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import icon from '../../assets/icon.png'; // Assuming the icon is available here or will be moved

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
                const mid = await api.getMachineId();
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
            const result = await api.submitRegistration(licenseKey);
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
        <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans">
            {/* Main Content Container - Centered Flexbox */}
            <div className="flex-1 flex items-center justify-center p-6">

                {/* Registration Card */}
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gold-200 overflow-hidden flex flex-col relative">

                    {/* Decorative Top Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300"></div>

                    <div className="p-8 flex flex-col items-center text-center">

                        {/* Logo / Icon */}
                        <div className="mb-6 h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg border border-gold-400/30">
                            {/* Use img tag if icon path is resolved, otherwise fallback to text/svg */}
                            <img src="icon.png" alt="TaxYatra" className="h-14 w-14 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                            {/* Fallback if image fails */}
                            <span className="text-gold-400 font-bold text-2xl absolute opacity-0">TY</span>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                            Welcome to <span className="text-gold-600">TaxYatra</span>
                        </h1>
                        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                            Please enter your license key to activate your premium tax filing assistant.
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="w-full space-y-5">
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">
                                    License Key
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        value={licenseKey}
                                        onChange={(e) => setLicenseKey(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 font-mono text-center text-lg uppercase tracking-widest placeholder-slate-300 transition-all hover:border-gold-300"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500 pointer-events-none">
                                        <CheckCircle2 className={`h-5 w-5 transition-opacity ${licenseKey.length > 10 ? 'opacity-100' : 'opacity-0'}`} />
                                    </div>
                                </div>
                            </div>

                            {machineId && (
                                <div className="text-[10px] text-slate-400 font-mono bg-slate-50 py-1 px-2 rounded border border-slate-100 inline-block">
                                    MID: {machineId}
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-left animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="flex-1">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !licenseKey}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold rounded-xl hover:from-slate-800 hover:to-slate-700 focus:ring-4 focus:ring-slate-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98] border border-transparent hover:border-gold-500/30"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </span>
                                ) : (
                                    'Activate License'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer / Contact Info */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 font-medium mb-1">Having trouble?</p>
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
                            <span className="hover:text-gold-600 cursor-pointer transition-colors">support@taxyatra.com</span>
                            <span className="text-slate-300">•</span>
                            <span className="hover:text-gold-600 cursor-pointer transition-colors">+91 1800-TAX-HELP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Branding / Copyright */}
            <div className="p-4 text-center text-[10px] text-slate-300">
                &copy; {new Date().getFullYear()} TaxYatra Premium. All rights reserved.
            </div>
        </div>
    );
}
