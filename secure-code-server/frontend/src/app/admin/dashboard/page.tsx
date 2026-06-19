"use client";

import React, { useState, useEffect } from 'react';
import {
    Users, Folder, Box, Activity, Heart, AlertCircle,
    Terminal, RotateCcw, Copy, Check, DownloadCloud, UploadCloud, X
} from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

// Reusable SVG Graph Component
const GraphCard = ({
    title, subtitle, value, valueColor, strokeColor, fillFrom, pathD, yLabels
}: {
    title: string; subtitle: string; value: string; valueColor: string;
    strokeColor: string; fillFrom: string; pathD: string; yLabels: string[]
}) => (
    <div className="bg-[#0b1121]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl p-4 flex flex-col relative overflow-hidden h-[200px]">
        <div className="flex justify-between items-start mb-2 z-10 relative">
            <h3 className="text-slate-300 font-medium text-sm">{title} <span className="text-slate-500 text-xs ml-1 font-normal">{subtitle}</span></h3>
            <a href="#" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">View all</a>
        </div>

        <div className="absolute right-4 top-10 z-20">
            <div className={`px-2.5 py-1 rounded-full bg-${valueColor}-500/10 text-${valueColor}-400 text-xs font-medium border border-${valueColor}-500/20 shadow-[0_0_10px_rgba(var(--tw-colors-${valueColor}-500),0.2)]`}>
                {value}
            </div>
        </div>

        {/* Y Axis labels */}
        <div className="absolute left-4 bottom-8 flex flex-col justify-between h-[90px] text-[10px] text-slate-600 z-10 font-mono">
            {yLabels.map((lbl, i) => <span key={i}>{lbl}</span>)}
        </div>

        {/* X Axis labels */}
        <div className="absolute bottom-3 left-14 right-6 flex justify-between text-[10px] text-slate-600 z-10 font-mono">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
        </div>

        {/* SVG Graph Background */}
        <div className="absolute bottom-8 left-12 right-0 h-[100px] w-[calc(100%-3rem)]">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={fillFrom} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={fillFrom} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={pathD} fill={`url(#grad-${title.replace(/\s+/g, '')})`} stroke={strokeColor} strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(currentColor,0.5)]" />
            </svg>
        </div>
    </div>
);

export default function AdminDashboard() {
    const [deployments, setDeployments] = useState<any[]>([]);
    const [isDeploymentsModalOpen, setIsDeploymentsModalOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isGeneratingSsh, setIsGeneratingSsh] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const [stats, setStats] = useState({ 
        roles: { admin: 0, developer: 0, viewer: 0 }, 
        online: 0, 
        totalUsers: 0, 
        usersThisWeek: 0,
        totalProjects: 0,
        projectsThisWeek: 0
    });

    useEffect(() => {
        const fetchData = () => {
            Promise.all([
                api.get('/users/stats').catch(() => null),
                api.get('/users').catch(() => []),
                api.get('/projects').catch(() => []),
                api.get('/projects/deployments/all').catch(() => []),
                api.get('/users/ssh-key/public').catch(() => ({ publicKey: null }))
            ]).then(([statsData, users, projects, deps, sshData]) => {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                
                const usersThisWeek = (users || []).filter((u: any) => new Date(u.createdAt) > oneWeekAgo).length;
                const projectsThisWeek = (projects || []).filter((p: any) => new Date(p.createdAt) > oneWeekAgo).length;

                setStats({
                    roles: statsData?.roles || { admin: 0, developer: 0, viewer: 0 },
                    online: statsData?.online || 0,
                    totalUsers: users?.length || 0,
                    usersThisWeek,
                    totalProjects: projects?.length || 0,
                    projectsThisWeek
                });
                setDeployments(deps || []);
                if (sshData?.publicKey) setPublicKey(sshData.publicKey);
            }).catch(console.error);
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleGenerateSshKey = async () => {
        setIsGeneratingSsh(true);
        try {
            const res = await api.post('/users/ssh-key/generate', {});
            if (res.publicKey) {
                setPublicKey(res.publicKey);
            }
        } catch (error) {
            console.error('Failed to generate SSH key', error);
        } finally {
            setIsGeneratingSsh(false);
        }
    };

    const handleCopySshKey = async () => {
        if (publicKey) {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(publicKey);
                } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = publicKey;
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">

            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            <AdminHeader />

            {/* --- MAIN DASHBOARD CONTENT --- */}
            <div className="relative z-10 max-w-[1600px] mx-auto p-6 space-y-4">

                {/* --- TOP ROW: METRICS --- */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                    {/* Active Users */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Users</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+{stats.usersThisWeek} this week</p>
                        </div>
                    </div>

                    {/* Active Projects */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Folder className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Projects</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.totalProjects}</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+{stats.projectsThisWeek} this week</p>
                        </div>
                    </div>

                    {/* Running Services */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Box className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Running Services</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">86</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+8 this week</p>
                        </div>
                    </div>

                    {/* Requests Today */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Requests Today</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">2.4M</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+18.6% than yesterday</p>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Heart className="w-4 h-4 text-cyan-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">System Health</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">99.9%</h3>
                            <p className="text-slate-500 text-xs mt-1 font-medium">Excellent</p>
                        </div>
                    </div>

                    {/* Active Alerts */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Alerts</span>
                        </div>
                        <div className="mt-3 flex items-end justify-between">
                            <h3 className="text-2xl font-bold text-white">3</h3>
                            <a href="#" className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">View Alerts &rarr;</a>
                        </div>
                    </div>

                </div>

                {/* --- MIDDLE ROW: GRAPHS AND TEAM --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <GraphCard
                            title="CPU Usage" subtitle="24 Cores" value="68%" valueColor="purple"
                            strokeColor="#a855f7" fillFrom="#a855f7"
                            yLabels={['100%', '75%', '50%', '25%', '0%']}
                            pathD="M 0 50 C 40 20, 60 80, 100 40 C 140 0, 160 80, 200 40 C 240 0, 260 80, 300 40 C 340 0, 360 80, 400 30 L 400 100 L 0 100 Z"
                        />
                        <GraphCard
                            title="RAM Usage" subtitle="16 GB" value="72%" valueColor="blue"
                            strokeColor="#3b82f6" fillFrom="#3b82f6"
                            yLabels={['100%', '75%', '50%', '25%', '0%']}
                            pathD="M 0 70 C 50 20, 80 90, 130 50 C 180 10, 210 80, 260 40 C 310 0, 340 80, 400 20 L 400 100 L 0 100 Z"
                        />
                        <GraphCard
                            title="Network Traffic" subtitle="1 GB" value="42Mb/s" valueColor="emerald"
                            strokeColor="#10b981" fillFrom="#10b981"
                            yLabels={['100Mb/s', '75Mb/s', '50Mb/s', '25Mb/s', '0Mb/s']}
                            pathD="M 0 60 C 30 70, 70 30, 120 50 C 160 70, 200 20, 250 40 C 300 60, 340 10, 400 30 L 400 100 L 0 100 Z"
                        />
                        <GraphCard
                            title="Response Time" subtitle="500 MS" value="82ms" valueColor="amber"
                            strokeColor="#f59e0b" fillFrom="#f59e0b"
                            yLabels={['200ms', '150ms', '100ms', '50ms', '0ms']}
                            pathD="M 0 40 C 40 80, 80 10, 120 50 C 160 90, 200 20, 240 60 C 280 90, 320 10, 400 40 L 400 100 L 0 100 Z"
                        />
                    </div>

                    <div className="lg:col-span-1 bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-slate-200 font-medium">Team Members</h3>
                            <Link href="/admin/users" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">View All</Link>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Admins</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.admin || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Developers</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.developer || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Viewers</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.viewer || 0}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium">Online</span>
                            </div>
                            <span className="text-white font-medium">{stats.online || 0}</span>
                        </div>
                    </div>

                </div>

                {/* --- BOTTOM ROW: MISC --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Recent Deployments */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col max-h-[350px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-200 font-medium">Recent Deployments</h3>
                            <button onClick={() => setIsDeploymentsModalOpen(true)} className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
                                View all
                            </button>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {deployments.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">No recent deployments</p>
                            ) : deployments.map((dep, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                                    <div className="flex items-center space-x-3 truncate">
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                            <Terminal className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-slate-200 text-sm font-medium truncate">{dep.project?.name || 'Unknown Project'}</p>
                                            <p className="text-slate-500 text-xs truncate" title={dep.commitMessage}>{dep.commitMessage}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4 shrink-0 ml-4">
                                        <span className="text-slate-500 text-xs whitespace-nowrap">{formatRelativeTime(dep.createdAt)}</span>
                                        <span className={`px-2 py-1 ${dep.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-xs font-medium rounded-md border`}>
                                            {dep.status} {">"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SSH Key */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-slate-200 font-medium">Your Public SSH Key</h3>
                                <button 
                                    onClick={handleGenerateSshKey}
                                    disabled={isGeneratingSsh}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-md transition-colors border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <RotateCcw className={`w-3 h-3 ${isGeneratingSsh ? 'animate-spin' : ''}`} />
                                    <span>{isGeneratingSsh ? 'Generating...' : 'Generate Key'}</span>
                                </button>
                            </div>
                            <p className="text-slate-500 text-xs mb-4">Copy this key and add it to your GitLab or GitHub</p>
                        </div>

                        <div className="bg-[#050810] border border-slate-800 rounded-lg p-4 relative group min-h-[100px] flex items-center justify-center">
                            {publicKey ? (
                                <pre className="text-slate-400 text-xs font-mono break-all whitespace-pre-wrap leading-relaxed w-full">
                                    {publicKey}
                                </pre>
                            ) : (
                                <p className="text-slate-600 text-xs text-center">No SSH key generated yet.</p>
                            )}
                            {publicKey && (
                                <button 
                                    onClick={handleCopySshKey}
                                    disabled={isCopied}
                                    className="absolute bottom-3 right-3 flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors shadow-lg disabled:bg-emerald-700 disabled:cursor-not-allowed">
                                    {isCopied ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Backup Code & Backups */}
                    <div className="flex flex-col space-y-4">

                        {/* Backup Code */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-slate-200 font-medium text-sm">Your Backup Code</h3>
                                <button className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded-md transition-colors border border-emerald-500/20">
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Generate Code</span>
                                </button>
                            </div>
                            <p className="text-slate-600 text-[10px] mb-3">This code can only be used once.</p>

                            <div className="flex items-center justify-between bg-[#050810] border border-slate-800 rounded-lg px-3 py-2">
                                <code className="text-slate-300 text-xs font-mono">A1B2-C3D4-E5F6-G7H8</code>
                                <button className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-medium rounded-md transition-colors">
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                </button>
                            </div>
                        </div>

                        {/* Backups */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col justify-center">
                            <div className="flex items-center space-x-2 mb-1">
                                <DownloadCloud className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-slate-200 font-medium text-sm">Backups</h3>
                            </div>
                            <p className="text-slate-600 text-[10px] mb-4">Manage and secure your data backups</p>

                            <div className="flex items-center space-x-2">
                                <button className="flex-1 flex items-center justify-center space-x-2 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20 transition-colors">
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>Export Backup</span>
                                </button>
                                <button className="flex-1 flex items-center justify-center space-x-2 py-2 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-xs font-medium rounded-lg border border-blue-500/20 transition-colors">
                                    <DownloadCloud className="w-3.5 h-3.5" />
                                    <span>Import Backup</span>
                                </button>
                                <button className="flex-1 flex items-center justify-center space-x-2 py-2 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-xs font-medium rounded-lg border border-purple-500/20 transition-colors">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore Backup</span>
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {/* --- DEPLOYMENTS MODAL --- */}
            {isDeploymentsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm"
                        onClick={() => setIsDeploymentsModalOpen(false)}
                    />
                    <div className="relative w-full max-w-6xl h-[80vh] bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <h2 className="text-lg font-medium text-slate-200">All Deployments</h2>
                            <button 
                                onClick={() => setIsDeploymentsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body (2 Panes) */}
                        <div className="flex flex-1 overflow-hidden">
                            
                            {/* Left Pane: Projects */}
                            <div className="w-1/3 border-r border-slate-800 flex flex-col bg-[#080d1a]">
                                <div className="p-4 border-b border-slate-800/50">
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Projects</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {Array.from(new Set(deployments.map(d => d.projectId))).map(projectId => {
                                        const projectDeps = deployments.filter(d => d.projectId === projectId);
                                        const project = projectDeps[0]?.project;
                                        const isSelected = selectedProjectId === projectId;

                                        return (
                                            <button
                                                key={projectId}
                                                onClick={() => setSelectedProjectId(projectId)}
                                                className={`w-full text-left p-3 rounded-xl transition-all border ${
                                                    isSelected 
                                                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                                                        : 'bg-transparent border-transparent hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                                                        <Folder className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                            {project?.name || 'Unknown Project'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{projectDeps.length} deployments</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {deployments.length === 0 && (
                                        <p className="text-slate-500 text-sm italic text-center py-8">No projects with deployments</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Pane: Deployments */}
                            <div className="w-2/3 flex flex-col bg-[#0b1121]">
                                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center">
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                        Deployment History {selectedProjectId ? '' : '(Select a project)'}
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {!selectedProjectId ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                                            Select a project from the left pane to view its deployments.
                                        </div>
                                    ) : (
                                        deployments.filter(d => d.projectId === selectedProjectId).map((dep, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-[#080d1a] border border-slate-800/60 rounded-xl hover:border-slate-700 transition-colors">
                                                <div className="flex items-center space-x-4 min-w-0">
                                                    <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                        <Terminal className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-slate-200 text-sm font-medium truncate mb-1">{dep.commitMessage}</p>
                                                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                                                            <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {dep.user?.username || 'System'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                            <span>{dep.environment}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 ml-4 space-y-2">
                                                    <span className="text-slate-400 text-xs">{formatRelativeTime(dep.createdAt)}</span>
                                                    <span className={`px-2.5 py-1 ${dep.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-[10px] font-medium rounded-md border uppercase tracking-wider`}>
                                                        {dep.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple wrapper for the repeating User icon
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
