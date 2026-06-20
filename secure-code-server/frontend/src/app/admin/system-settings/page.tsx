"use client";

import React, { useState, useEffect } from 'react';
import { Save, Settings, Shield, Terminal, Globe, AlertTriangle, RefreshCcw, Bell } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    // Local state for the form inputs
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [blockedCommands, setBlockedCommands] = useState("");
    const [systemMessage, setSystemMessage] = useState("");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.get('/settings');
                setSettings(data);
                if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode);
                if (data.blockedCommands !== undefined) setBlockedCommands(data.blockedCommands);
                if (data.systemMessage !== undefined) setSystemMessage(data.systemMessage);
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });
        try {
            const payload = {
                maintenanceMode,
                blockedCommands,
                systemMessage
            };
            await api.patch('/settings', payload);
            setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setSaveMessage({ text: err.message || 'Failed to save settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            <AdminHeader />

            <div className="relative z-10 max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center">
                            <Settings className="w-6 h-6 mr-3 text-indigo-400" />
                            System Settings
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Manage global configuration for the entire IDE platform.</p>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isLoading || isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save Changes</span>
                    </button>
                </div>

                {saveMessage.text && (
                    <div className={`p-4 rounded-lg flex items-center space-x-3 text-sm font-medium ${
                        saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {saveMessage.type === 'success' ? <Shield className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span>{saveMessage.text}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <RefreshCcw className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Security Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-lg font-medium text-slate-200">Security & Access</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Toggle Maintenance Mode */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-200">Maintenance Mode</h3>
                                        <p className="text-xs text-slate-500 mt-1">When active, only Admins can log in. Other users see a maintenance screen.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={maintenanceMode}
                                            onChange={(e) => setMaintenanceMode(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Terminal Restrictions Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Terminal className="w-5 h-5 text-amber-400" />
                                <h2 className="text-lg font-medium text-slate-200">Terminal Control</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-200 mb-2">Blocked Commands Regex</label>
                                    <p className="text-xs text-slate-500 mb-3">Any command matching these words will be intercepted and logged as a security threat.</p>
                                    <textarea
                                        value={blockedCommands}
                                        onChange={(e) => setBlockedCommands(e.target.value)}
                                        className="w-full bg-[#050810] border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors h-32 font-mono"
                                        placeholder="e.g. ^(sudo|apt|wget|curl|rm -rf|chmod)"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Announcements Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Bell className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-medium text-slate-200">Global Announcements</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-200 mb-2">System Message</label>
                                    <p className="text-xs text-slate-500 mb-3">This message will be displayed prominently to all users in their IDE workspace.</p>
                                    <input
                                        type="text"
                                        value={systemMessage}
                                        onChange={(e) => setSystemMessage(e.target.value)}
                                        className="w-full bg-[#050810] border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                        placeholder="e.g. System maintenance scheduled for Saturday 2AM UTC."
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
