import React, { useState, useEffect, useRef } from 'react';

interface CaptchaDialogProps {
    isOpen: boolean;
    captchaImage: string;
    onSubmit: (captchaText: string) => void;
    onCancel: () => void;
}

export const CaptchaDialog: React.FC<CaptchaDialogProps> = ({
    isOpen,
    captchaImage,
    onSubmit,
    onCancel
}) => {
    const [captchaText, setCaptchaText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (captchaText.trim()) {
            onSubmit(captchaText.trim());
            setCaptchaText('');
        }
    };

    const handleCancel = () => {
        setCaptchaText('');
        onCancel();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Enter Captcha</h2>

                <div className="mb-4 p-4 bg-gray-100 rounded-lg flex justify-center">
                    {captchaImage ? (
                        <img
                            src={captchaImage}
                            alt="Captcha"
                            className="max-w-full h-auto"
                        />
                    ) : (
                        <div className="text-gray-500">Loading captcha...</div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="captcha-input" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter the characters shown above
                        </label>
                        <input
                            ref={inputRef}
                            id="captcha-input"
                            type="text"
                            value={captchaText}
                            onChange={(e) => setCaptchaText(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Enter captcha"
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={!captchaText.trim()}
                            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            Submit
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
