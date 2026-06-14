"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function IdleTimer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set to 15 minutes (15 * 60 seconds * 1000 ms)
  const TIMEOUT_MS = 15 * 60 * 1000; 

  // Do not track idle time on the login page or landing page
  const isLoginPage = pathname === '/' || pathname === '/admin/login' || pathname === '/developer/login' || pathname === '/viewer/login';

  const logoutUser = () => {
    // Clear cookies
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirect to login if not already there
    if (!isLoginPage) {
      let loginUrl = '/admin/login';
      if (pathname.startsWith('/developer')) loginUrl = '/developer/login';
      else if (pathname.startsWith('/viewer')) loginUrl = '/viewer/login';
      
      window.location.href = `${loginUrl}?expired=true`;
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!isLoginPage) {
      timeoutRef.current = setTimeout(() => {
        logoutUser();
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (isLoginPage) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [pathname, isLoginPage]);

  return <>{children}</>;
}
