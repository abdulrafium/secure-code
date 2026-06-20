"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, FileText, Search, UserIcon, Trash2, Calendar, Database, RefreshCcw } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("ALL");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/logs');
            setLogs(data || []);
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log entry?')) return;
        try {
            await api.delete(`/logs/${id}`);
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Failed to delete log', error);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const formatAbsoluteTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Derived states
    const actionTypes = useMemo(() => {
        const types = new Set<string>();
        logs.forEach(l => types.add(l.action));
        return Array.from(types).sort();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchesSearch = (l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.ipAddress || '').includes(searchTerm);
            const matchesAction = filterAction === "ALL" || l.action === filterAction;
            return matchesSearch && matchesAction;
        });
    }, [logs, searchTerm, filterAction]);

    const getActionColor = (action: string) => {
        if (action.includes('THREAT') || action.includes('BLOCKED')) return 'red';
        if (action.includes('CREATE') || action.includes('LOGIN')) return 'emerald';
        if (action.includes('UPDATE')) return 'blue';
        if (action.includes('DELETE')) return 'orange';
        return 'slate';
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            <AdminHeader />

            <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center">
                            <FileText className="w-6 h-6 mr-3 text-indigo-400" />
                            System Audit Logs
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Full system-wide audit trailing (who did what, when).</p>
                    </div>
                    
                    <button 
                        onClick={fetchLogs}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#0b1121] hover:bg-[#111a30] border border-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh Logs</span>
                    </button>
                </div>

                {/* Filters Section */}
                <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by username, details, or IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-lg leading-5 bg-[#050810] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                        />
                    </div>
                    
                    <div className="md:w-64">
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-slate-800 rounded-lg leading-5 bg-[#050810] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors appearance-none"
                        >
                            <option value="ALL">All Actions</option>
                            {actionTypes.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-[#0b1121] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#060a16] border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider text-right">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <RefreshCcw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                                            <p>Loading audit logs...</p>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                            No logs match your search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const color = getActionColor(log.action);
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-300 text-sm font-medium">{formatAbsoluteTime(log.createdAt)}</span>
                                                        <span className="text-slate-500 text-xs mt-0.5 flex items-center">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {formatRelativeTime(log.createdAt)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                                                            <UserIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-slate-300 font-medium text-sm">{log.username || 'System/Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md border bg-${color}-500/10 text-${color}-400 border-${color}-500/20`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-400 text-sm max-w-md line-clamp-2" title={log.details}>
                                                        {log.details}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm font-mono">
                                                    {log.ipAddress?.replace(/^::ffff:/, '') || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button 
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Delete log"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-800 bg-[#080d1a] flex items-center justify-between text-xs text-slate-500">
                        <span>Showing {filteredLogs.length} results</span>
                        <div className="flex items-center space-x-2">
                            <Database className="w-3.5 h-3.5" />
                            <span>System Database</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
