# Browser Secure Code Server

## Progress Tracker

### Day 1-2: Foundation & Backend Setup
- Initialize Monorepo (Next.js frontend, NestJS backend)
- Set up PostgreSQL & Redis (Docker Compose)
- Configure NestJS Database & Redis connections
- Implement basic Role-Based Access Control (RBAC) & Authentication

### Day 3-4: Frontend & Editor Integration
- Implement Figma UI Designs using TailwindCSS
- Backend Connected, PostgreSQL connected, and role based access
- Implemented 15-minute inactivity session timeout with auto logout.
- Integrate Monaco Editor in Next.js
- Set up WebSocket Gateway on NestJS

### Day 5: Browser Security & Restrictions
- Copy/Paste Block (Native OS blocking & Internal Monaco clipboard)
- Watermark Protection (UI Overlay with User Info)
- Advanced Terminal Blacklist (Hardcoded global blocks)

### Advanced Security Hardening (Completed)
- **Session Bleed Fix:** Migrated Auth Tokens to `sessionStorage` preventing multi-tab session bleeding.
- **Enhanced Auto-Logout:** Idle Timer strictly wipes `sessionStorage` alongside cookies.
- **IP Whitelisting:** Admins can enforce specific IPv4 addresses for Developer accounts; logins from unauthorized IPs are forcefully rejected (HTTP 401).
- **Threat Detection Logging:** Integrated a new `SecurityLog` Postgres Entity. When a user runs a blacklisted command in the IDE terminal, the action is blocked and instantly logged to the Admin Dashboard's "Recent Security Threats" panel.

### Day 6: Collaboration & Real-Time Sync
- Integrate Yjs (CRDT) into the Monaco Editor and link it to the existing WebSocket Gateway.
- Implement visual cursors (showing username and unique colors) when multiple developers open the same file.