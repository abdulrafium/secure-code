import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value?.toLowerCase();
  const path = request.nextUrl.pathname;

  // Protect Admin routes
  if (
    path.startsWith('/admin') && 
    !path.startsWith('/admin/login') && 
    !path.startsWith('/admin/recovery') && 
    !path.startsWith('/admin/set-password')
  ) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect Developer routes
  if (path.startsWith('/developer') && !path.startsWith('/developer/login')) {
    if (role !== 'developer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/developer/login', request.url));
    }
  }

  // Protect Viewer routes
  if (path.startsWith('/viewer') && !path.startsWith('/viewer/login')) {
    if (role !== 'viewer') {
      return NextResponse.redirect(new URL('/viewer/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/developer/:path*', '/viewer/:path*'],
};
