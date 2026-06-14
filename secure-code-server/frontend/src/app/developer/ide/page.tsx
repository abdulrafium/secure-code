"use client";

import React, { Suspense } from 'react';
import IDEWorkspace from '@/components/ide/IDEWorkspace';

export default function DeveloperIDE() {
  return (
    <main className="w-full h-screen overflow-hidden m-0 p-0">
      <Suspense fallback={<div className="flex w-full h-screen items-center justify-center bg-[#1e1e1e] text-white">Loading IDE Workspace...</div>}>
        <IDEWorkspace />
      </Suspense>
    </main>
  );
}
