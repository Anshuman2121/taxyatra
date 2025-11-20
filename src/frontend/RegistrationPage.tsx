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
        <div className="min-h-screen bg-gradient-to-br from-amber-100/40 via-yellow-100/30 to-amber-50/50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    {/* Left side - Features */}
                    <div className="space-y-6 text-center md:text-left">
                        <div>
                            <h1 className="text-4xl font-bold text-amber-800 mb-3">Welcome to TaxYatra</h1>
                            <p className="text-xl text-amber-700/90 font-medium mb-2">Your Smart Tax Filing Partner</p>
                            <p className="text-lg text-amber-600/80">Fast • Easy • Reliable</p>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-amber-200/50">
                                <p className="text-amber-800/90 font-medium italic" style={{fontFamily: 'Georgia, serif'}}>Lightning-fast tax filing experience</p>
                            </div>
                            <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-amber-200/50">
                                <p className="text-amber-800/90 font-medium italic" style={{fontFamily: 'Georgia, serif'}}>100% secure and reliable platform</p>
                            </div>
                            <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-amber-200/50">
                                <p className="text-amber-800/90 font-medium italic" style={{fontFamily: 'Georgia, serif'}}>Real support whenever you need it</p>
                            </div>
                        </div>
                    </div>

                    {/* Right side - Activation form */}
                    <div className="w-full bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-amber-300/40">
                        <div className="p-6 text-center border-b border-amber-200/30">
                            <h2 className="text-3xl font-bold text-amber-900 mb-2" style={{fontFamily: 'Georgia, serif'}}>Activate Your License</h2>
                            <p className="text-amber-700/80 italic" style={{fontFamily: 'Georgia, serif'}}>
                                Enter your license key to get started
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-amber-800">License Key</label>
                                <input
                                    type="text"
                                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-amber-300/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono text-center uppercase bg-white text-amber-900 placeholder-amber-500/50"
                                />
                            </div>
                            {machineId && (
                                <div className="text-xs text-center text-amber-700/70 break-all px-2">
                                    Machine ID: <span className="font-mono text-[10px]">{machineId}</span>
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-300">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !licenseKey}
                                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-semibold"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Activate License
                            </button>
                        </form>
                        
                        {/* Contact Details */}
                        <div className="px-6 pb-6 pt-4 border-t border-amber-300/30">
                            <p className="text-sm text-amber-800/70 font-semibold mb-3 text-center italic" style={{fontFamily: 'Georgia, serif'}}>Need Help?</p>
                            <div className="space-y-2 text-sm text-amber-700/80 text-center" style={{fontFamily: 'Georgia, serif'}}>
                                <div className="italic">support@taxyatra.com</div>
                                <div className="italic">+91 1800-XXX-XXXX</div>
                                <div className="italic">Mon-Sat, 9 AM - 6 PM IST</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
