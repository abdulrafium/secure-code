"use client";

import React, { useState, useEffect } from 'react';
import { User, Video, Folder, Calendar, Activity, Trash2, X, AlertTriangle } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

import 'rrweb-player/dist/style.css';

const RrwebPlayerWrapper = ({ filename }: { filename: string }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'playing'>('loading');

    useEffect(() => {
        let playerInstance: any = null;
        let isMounted = true;

        const loadSession = async () => {
            try {
                const data = await api.get(`/logs/sessions/${filename}`);
                if (!isMounted) return;

                if (!Array.isArray(data) || data.length < 2) {
                    setStatus('empty');
                    return;
                }

                const rrwebPlayerModule = await import('rrweb-player');
                const RrwebPlayer = rrwebPlayerModule.default || rrwebPlayerModule as any;
                
                if (containerRef.current && isMounted) {
                    setStatus('playing');
                    // wait a tick for DOM to update from 'loading' state if needed
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.innerHTML = '';
                            playerInstance = new RrwebPlayer({
                                target: containerRef.current,
                                props: {
                                    events: data,
                                    width: containerRef.current.clientWidth || 1024,
                                    height: containerRef.current.clientHeight || 600,
                                    autoPlay: true,
                                    showController: true,
                                    speedOption: [1, 2, 4, 8],
                                },
                            });
                        }
                    }, 50);
                }
            } catch (error) {
                console.error('Failed to load session data:', error);
                if (isMounted) setStatus('error');
            }
        };

        loadSession();

        return () => {
            isMounted = false;
            if (playerInstance) {
                // Cleanup if the library supports it, or just empty the DOM.
                if (containerRef.current) containerRef.current.innerHTML = '';
            }
        };
    }, [filename]);

    return (
        <div className="w-full h-full flex justify-center items-center overflow-hidden">
            {status === 'loading' && (
                <div className="text-slate-500 animate-pulse text-sm">Loading playback...</div>
            )}
            {status === 'empty' && (
                <div className="text-slate-500 text-sm flex flex-col items-center justify-center">
                    <p>Session data is incomplete or empty.</p>
                    <p className="text-xs opacity-70 mt-1">The user may have closed the window immediately.</p>
                </div>
            )}
            {status === 'error' && (
                <div className="text-red-500 text-sm flex flex-col items-center justify-center">
                    <p>Failed to load session data.</p>
                </div>
            )}
            <div 
                ref={containerRef} 
                className={`w-full h-full flex justify-center items-center ${status === 'playing' ? 'block' : 'hidden'}`}
            ></div>
        </div>
    );
};

export default function SessionsPage() {
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [activeSessionFilename, setActiveSessionFilename] = useState<string | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch users to map IDs to usernames
                const users = await api.get('/users').catch(() => []);
                const uMap: Record<string, any> = {};
                users.forEach((u: any) => {
                    uMap[u.id] = u;
                });
                setUsersMap(uMap);

                // Fetch sessions
                const sessions = await api.get('/logs/sessions').catch(() => []);
                setSessionsList(sessions);
            } catch (error) {
                console.error("Failed to fetch sessions data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // Group sessions by User ID
    const sessionsByUser = sessionsList.reduce((acc: any, session: any) => {
        if (!acc[session.userId]) acc[session.userId] = [];
        acc[session.userId].push(session);
        return acc;
    }, {});

    // Sort users by most recently active (most recent session first)
    const userIds = Object.keys(sessionsByUser).sort((a, b) => {
        const mostRecentA = sessionsByUser[a][0]?.updatedAt || 0;
        const mostRecentB = sessionsByUser[b][0]?.updatedAt || 0;
        return new Date(mostRecentB).getTime() - new Date(mostRecentA).getTime();
    });

    const handlePlaySession = (filename: string) => {
        setActiveSessionFilename(filename);
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/logs/sessions/${sessionToDelete}`);
            setSessionsList(prev => prev.filter(s => s.filename !== sessionToDelete));
            if (activeSessionFilename === sessionToDelete) {
                setActiveSessionFilename(null);
                const playerEl = document.getElementById('rrweb-player-container');
                if (playerEl) playerEl.innerHTML = '';
            }
            setSessionToDelete(null);
        } catch (error) {
            console.error('Failed to delete session', error);
            alert('Failed to delete session');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] font-sans text-slate-300 flex flex-col">
            <AdminHeader />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-60px)]">
                
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-slate-100 flex items-center space-x-3">
                        <Video className="w-6 h-6 text-emerald-400" />
                        <span>Session Replays</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Watch recorded user interactions and workspace activities.
                    </p>
                </div>

                {/* 2-Column Studio Layout */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                    
                    {/* Left Sidebar: Developers List */}
                    <div className="w-full md:w-1/3 lg:w-1/4 bg-[#0b1121] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 bg-[#080d1a]">
                            <h3 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                <User className="w-4 h-4 text-blue-400" />
                                <span>Recorded Developers</span>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {userIds.length === 0 ? (
                                <div className="text-center py-10">
                                    <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                    <p className="text-slate-500 text-xs">No users have active session recordings.</p>
                                </div>
                            ) : (
                                userIds.map(userId => {
                                    const user = usersMap[userId];
                                    const sessionCount = sessionsByUser[userId].length;
                                    const isSelected = selectedUserId === userId;

                                    return (
                                        <button
                                            key={userId}
                                            onClick={() => setSelectedUserId(userId)}
                                            className={`w-full text-left p-3 rounded-xl transition-all border ${
                                                isSelected 
                                                    ? 'bg-blue-500/10 border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' 
                                                    : 'bg-transparent border-transparent hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#0a0f1c] border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
                                                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                                                        {user ? user.username.charAt(0).toUpperCase() : userId.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                                                        {user ? user.username : `User ${userId.slice(0, 8)}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{sessionCount} sessions</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Main Area: Sessions & Player */}
                    <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col gap-6 overflow-hidden">
                        
                        {/* Player Container */}
                        <div className="flex-1 bg-[#050810] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl relative min-h-[400px]">
                            {!activeSessionFilename ? (
                                <div className="text-center flex flex-col items-center p-6">
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700">
                                        <Video className="w-8 h-8 text-slate-500 opacity-50" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300">No Session Selected</h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm">
                                        Select a developer on the left, then click one of their recent sessions below to watch the playback.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full bg-white flex justify-center items-center overflow-hidden">
                                    <button 
                                        onClick={() => setActiveSessionFilename(null)}
                                        className="absolute top-4 right-4 z-50 w-8 h-8 bg-slate-900/60 hover:bg-red-500 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
                                        title="Close Player"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <RrwebPlayerWrapper filename={activeSessionFilename} />
                                </div>
                            )}
                        </div>

                        {/* User's Sessions List (Bottom Strip) */}
                        {selectedUserId && (
                            <div className="h-48 bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden flex flex-col shrink-0">
                                <div className="p-3 border-b border-slate-800 bg-[#080d1a] flex justify-between items-center">
                                    <h3 className="text-xs font-medium text-slate-300 flex items-center space-x-2">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Recent Sessions for {usersMap[selectedUserId]?.username || 'User'}</span>
                                    </h3>
                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                        Newest First
                                    </span>
                                </div>
                                <div className="flex-1 overflow-x-auto p-4 flex gap-4 custom-scrollbar items-center">
                                    {sessionsByUser[selectedUserId].map((session: any, idx: number) => {
                                        const isPlaying = activeSessionFilename === session.filename;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handlePlaySession(session.filename)}
                                                className={`flex-shrink-0 w-64 text-left p-4 rounded-xl border transition-all h-full flex flex-col justify-between group ${
                                                    isPlaying 
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                        : 'bg-[#050810] border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-2 relative">
                                                        <span className={`text-[11px] font-medium truncate ${isPlaying ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                            {new Date(session.updatedAt).toLocaleString(undefined, {
                                                                month: 'short', day: 'numeric', year: 'numeric'
                                                            })}
                                                        </span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                                                {new Date(session.updatedAt).toLocaleTimeString(undefined, {
                                                                    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                                                                })}
                                                            </span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.filename); }}
                                                                className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-800 transition-colors"
                                                                title="Delete Session"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-slate-400 mt-3">
                                                        <Folder className="w-3.5 h-3.5" />
                                                        <span className="text-xs truncate">{session.projectId}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/50">
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        {(session.size / 1024).toFixed(1)} KB
                                                    </span>
                                                    {isPlaying ? (
                                                        <span className="text-[10px] font-medium text-emerald-400 flex items-center">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                                                            Playing
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center">
                                                            <Video className="w-3 h-3 mr-1" />
                                                            Play
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* --- DELETE CONFIRMATION MODAL --- */}
                {sessionToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm" onClick={() => setSessionToDelete(null)} />
                        <div className="relative w-full max-w-md bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <h2 className="text-lg font-medium text-slate-200">Delete Session?</h2>
                            </div>
                            <p className="text-slate-400 text-sm mb-6 pl-13">
                                Are you sure you want to permanently delete this session recording? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setSessionToDelete(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSession}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors flex items-center"
                                >
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
