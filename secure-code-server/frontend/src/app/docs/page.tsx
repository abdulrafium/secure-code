"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    ChevronLeft, BookOpen, Terminal, Shield, Video, 
    Database, Server, Lock, Search, PlayCircle, Users, Activity
} from 'lucide-react';
import LandingHeader from '../../components/LandingHeader';

const docsSections = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <BookOpen className="w-5 h-5 text-blue-400" />,
        content: (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-white mb-6">Introduction to Secure Code Server</h2>
                <p className="text-slate-400 leading-relaxed">
                    Secure Code Server is a cutting-edge platform designed to provide highly secure, containerized, and fully trackable development environments directly within your web browser. 
                    It bridges the gap between local development speed and enterprise-grade security.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mt-6">
                    <h3 className="text-white font-semibold mb-2">Core Philosophy</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        No code should ever touch an unmanaged device. By running the IDE, file system, and terminal inside isolated containers, we eliminate the risk of source code leaks while offering real-time monitoring and instant provisioning.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'architecture',
        title: 'Architecture & Security',
        icon: <Shield className="w-5 h-5 text-purple-400" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-white">Bank-Grade Security Architecture</h2>
                <p className="text-slate-400 leading-relaxed">
                    Every project runs in its own tightly controlled Docker container. The backend orchestrates these environments, ensuring complete isolation.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-5">
                        <Lock className="w-6 h-6 text-emerald-400 mb-3" />
                        <h4 className="text-white font-medium mb-2">Network Isolation</h4>
                        <p className="text-slate-500 text-sm">Containers cannot communicate with each other. All external traffic is routed through our strict internal proxy.</p>
                    </div>
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-5">
                        <Server className="w-6 h-6 text-pink-400 mb-3" />
                        <h4 className="text-white font-medium mb-2">Ephemeral Storage</h4>
                        <p className="text-slate-500 text-sm">Environments can be configured to self-destruct after sessions end, leaving absolutely zero trace.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'monitoring',
        title: 'Session & Audit Monitoring',
        icon: <Video className="w-5 h-5 text-emerald-400" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-white">Total Visibility</h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                    Administrators have an unprecedented level of insight into exactly what is happening across all active development environments.
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/20 border border-slate-800/50">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <PlayCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Visual Session Replays (RRWeb)</h4>
                            <p className="text-slate-400 text-sm mt-1">Every click, scroll, and keystroke inside the browser IDE is recorded. Admins can replay any user's session exactly as it happened like a video playback.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/20 border border-slate-800/50">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Real-Time Audit Logs</h4>
                            <p className="text-slate-400 text-sm mt-1">System events, logins, deployments, and security threats are logged instantaneously and can be filtered by date and action type.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'collaboration',
        title: 'Real-Time Collaboration',
        icon: <Users className="w-5 h-5 text-amber-400" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-white">Pair Programming, Reimagined.</h2>
                <p className="text-slate-400 leading-relaxed">
                    Invite team members to your project with a single click. Multiple developers can write code, run terminal commands, and view previews concurrently without stepping on each other's toes.
                </p>
                <div className="aspect-video w-full rounded-xl bg-[#0a0f1c] border border-slate-800 flex flex-col items-center justify-center mt-6 shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/10 to-transparent opacity-50" />
                    <Terminal className="w-12 h-12 text-slate-600 mb-4 group-hover:text-amber-400 transition-colors" />
                    <p className="text-slate-500 font-mono text-sm">Collaboration interface activated</p>
                </div>
            </div>
        )
    }
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState(docsSections[0].id);

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <LandingHeader />

            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-20 relative z-10 flex flex-col lg:flex-row gap-12">
                
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 shrink-0 animate-in fade-in slide-in-from-left-8 duration-700">
                    <Link href="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors mb-8 group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>

                    <div className="bg-[#0a0f1c]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sticky top-24">
                        <div className="mb-4 px-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentation</h3>
                        </div>
                        <nav className="space-y-1">
                            {docsSections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                                        activeSection === section.id 
                                        ? 'bg-blue-500/10 text-white font-medium border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    <div className={`transition-transform duration-300 ${activeSection === section.id ? 'scale-110' : ''}`}>
                                        {section.icon}
                                    </div>
                                    <span>{section.title}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 pt-6 border-t border-slate-800 px-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="text" 
                                    placeholder="Search docs..." 
                                    className="w-full bg-[#050810] border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 max-w-4xl min-h-[60vh]">
                    <div className="bg-[#0a0f1c]/60 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50 pointer-events-none" />

                        {docsSections.map((section) => (
                            <div 
                                key={section.id} 
                                className={`${activeSection === section.id ? 'block' : 'hidden'} relative z-10`}
                            >
                                {section.content}
                            </div>
                        ))}

                    </div>
                    
                    {/* Navigation Footer */}
                    <div className="mt-8 flex items-center justify-between border-t border-slate-800/50 pt-6">
                        <button 
                            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                            onClick={() => {
                                const currentIndex = docsSections.findIndex(s => s.id === activeSection);
                                if (currentIndex > 0) setActiveSection(docsSections[currentIndex - 1].id);
                            }}
                            disabled={docsSections.findIndex(s => s.id === activeSection) === 0}
                        >
                            &larr; Previous Section
                        </button>
                        <button 
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            onClick={() => {
                                const currentIndex = docsSections.findIndex(s => s.id === activeSection);
                                if (currentIndex < docsSections.length - 1) setActiveSection(docsSections[currentIndex + 1].id);
                            }}
                            disabled={docsSections.findIndex(s => s.id === activeSection) === docsSections.length - 1}
                        >
                            Next Section &rarr;
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
