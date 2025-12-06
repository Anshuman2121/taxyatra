import React, { useState, useEffect } from 'react';
import { X, Key, Calendar, Shield, User, Clock } from 'lucide-react';
import { api } from '../api';

interface LicenseDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRevoke: () => void;
}

export function LicenseDetailsModal({ isOpen, onClose, onRevoke }: LicenseDetailsModalProps) {
    const [licenseDetails, setLicenseDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadLicenseDetails();
        }
    }, [isOpen]);

    const loadLicenseDetails = async () => {
        setLoading(true);
        try {
            const details = await api.getLicenseDetails();
            setLicenseDetails(details);
        } catch (error) {
            console.error('Failed to load license details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        try {
            await api.revokeLicense();
            onRevoke();
            onClose();
        } catch (error) {
            console.error('Failed to revoke license:', error);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Not available';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Not available';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden" style={{ margin: 'auto' }}>
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-md p-6 border-b border-amber-200/30 text-amber-900 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-amber-700/80 hover:text-amber-900 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-3 rounded-full">
                            <Key className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-amber-900">License Details</h2>
                            <p className="text-amber-700 text-sm">TaxYatra Registration</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                        </div>
                    ) : licenseDetails ? (
                        <>
                            {/* Customer Name */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <User className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Licensed To</div>
                                    <div className="font-semibold text-gray-900">{licenseDetails.customerName}</div>
                                </div>
                            </div>

                            {/* License Key */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Key className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">License Key</div>
                                    <div className="font-mono text-sm text-gray-900 break-all">{licenseDetails.licenseKey}</div>
                                </div>
                            </div>

                            {/* Machine ID */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Shield className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Machine ID</div>
                                    <div className="font-mono text-xs text-gray-900 break-all">{licenseDetails.machineId}</div>
                                </div>
                            </div>

                            {/* Activation Date */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Activated On</div>
                                    <div className="font-semibold text-gray-900">{formatDate(licenseDetails.activatedAt)}</div>
                                </div>
                            </div>

                            {/* Expiry & Days Remaining */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Expiry Date</div>
                                    <div className="font-semibold text-gray-900">{formatDate(licenseDetails.expiryDate)}</div>
                                    <div className="mt-2 text-sm">
                                        <span className={`font-bold ${licenseDetails.daysRemaining > 30 ? 'text-green-600' : licenseDetails.daysRemaining > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                            {licenseDetails.daysRemaining > 0 ? `${licenseDetails.daysRemaining} days remaining` : 'Expired'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No license information found
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && licenseDetails && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {!showRevokeConfirm ? (
                            <button
                                onClick={() => setShowRevokeConfirm(true)}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                            >
                                Revoke License
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-700 text-center font-medium">
                                    Are you sure? This will remove the license from this machine.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRevokeConfirm(false)}
                                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRevoke}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                                    >
                                        Confirm Revoke
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
