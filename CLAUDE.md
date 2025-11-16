# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuscadorPXT is a full-stack supplier price search and monitoring platform built with React, Express, and PostgreSQL. The application helps users search for product prices across multiple suppliers, monitor price changes, manage supplier ratings, and receive real-time notifications.

## Technology Stack

- **Frontend**: React 18 + TypeScript, Wouter (routing), TanStack Query, Radix UI, Tailwind CSS
- **Backend**: Express.js + TypeScript (TSX for development)
- **Database**: PostgreSQL with dual ORM approach (Drizzle + Prisma)
- **Authentication**: Firebase Authentication + custom session management
- **Real-time**: WebSocket (ws library) for live updates
- **External Integrations**: Google Sheets API, Stripe payments, OpenAI
- **Build Tools**: Vite (frontend), esbuild (backend)

## Development Commands

### Running the Application

```bash
npm run dev           # Start development server (port 5000)
npm run build        # Build both frontend and backend
npm start            # Start production server
npm run check        # TypeScript type checking
```

**IMPORTANT - Production Build:**
The frontend build requires Firebase environment variables to be exported before building. Use the provided script:

```bash
./build-production.sh    # Build with Firebase env vars (recommended)
pm2 restart buscadorpxt  # Restart after build
```

**Manual build** (if needed):
```bash
export VITE_FIREBASE_API_KEY="..." VITE_FIREBASE_PROJECT_ID="..." # etc
npm run build
```

The Vite build process does NOT automatically load `.env` variables - they must be exported to the shell environment first.

### Database Management

```bash
npm run db:push      # Push Drizzle schema changes to database
npx prisma generate  # Generate Prisma client (if needed)
```

### Important Notes
- The application runs on a single port (5000) serving both API and client
- In development, Vite dev server is integrated via middleware
- All API routes are prefixed with `/api`
- Environment variables must be configured in `.env` (see `.env` for required variables)

## Architecture Overview

### Monorepo Structure

```
/client           # React frontend application
  /src
    /components   # Reusable UI components (Radix UI based)
    /features     # Feature-specific components
    /pages        # Route pages
    /hooks        # Custom React hooks
    /lib          # Frontend utilities
/server           # Express backend application
  /routes         # API route handlers (modular router system)
  /services       # Business logic services
  /middleware     # Express middleware
  /controllers    # Request handlers
  /utils          # Server utilities
/shared           # Shared code between client and server
  schema.ts       # Drizzle ORM schema (source of truth)
/prisma           # Prisma schema (maintained for compatibility)
/migrations       # Database migrations
```

### Dual ORM Strategy

The codebase uses **both Drizzle and Prisma**:
- **Drizzle** (`shared/schema.ts`): Primary ORM, source of truth for schema
- **Prisma** (`prisma/schema.prisma`): Maintained for legacy compatibility
- When making schema changes, update Drizzle first, then sync Prisma schema if needed

### Path Aliases

TypeScript path mappings (defined in `tsconfig.json`):
- `@/*` → `client/src/*` (frontend imports)
- `@shared/*` → `shared/*` (shared code)
- `@assets/*` → `attached_assets/*` (static assets)

### API Route Organization

The backend uses a modular router system (`server/routes.ts`) that registers routes with prefixes:
- `/api/auth` - Authentication endpoints
- `/api/user` - User management
- `/api/products` - Product search and filtering
- `/api/suppliers` - Supplier data and ratings
- `/api/admin` - Admin dashboard and management
- `/api/webhooks` - Google Sheets and Stripe webhooks
- `/api/stripe` - Payment processing
- `/api/interest-list` - User product watchlists
- `/api/notifications` - User notifications
- `/api/public` - Public endpoints (no auth)
- `/api/v1` - External API (requires API key)

**Route Registration Order Matters**: Authentication routes must be registered first, followed by public routes, then protected routes. Filter routes must be last to avoid path conflicts.

### Key Services

#### Google Sheets Integration (`server/services/google-sheets.ts`)
- Fetches supplier price data from Google Sheets
- Implements 15-minute caching to reduce API costs
- Handles inflight request deduplication
- Parses sheet data into structured product records

#### Search Engine (`server/services/search-engine.ts`)
- Advanced product search with multiple filters
- Supports text search, category filtering, price ranges
- Integrates with PostgreSQL full-text search
- Returns paginated results with supplier information

#### WebSocket Manager (`server/services/websocket-manager.ts`)
- Unified WebSocket manager (singleton pattern)
- Broadcasts real-time updates (price changes, sheet updates)
- Manages client connections and heartbeats
- Integrates with HTTP server in `server/index.ts`

#### Price Monitor Service (`server/services/price-monitor.ts`)
- Tracks price changes over time
- Sends notifications when prices drop
- Manages user price alerts

#### Session Management (`server/services/session-manager.service.ts`)
- Handles user session lifecycle
- Tracks active sessions with geolocation
- Enforces concurrent IP limits
- Cleanup service runs periodically

### Authentication Flow

1. **Firebase Authentication**: Client authenticates with Firebase
2. **Custom Session**: Backend creates session after verifying Firebase token
3. **Session Validation**: Middleware validates session on protected routes
4. **Role-Based Access**: Admin routes check `isAdmin` flag, subscription routes check plan tier

### Real-time Updates Architecture

Webhook flow for Google Sheets updates:
1. Google Apps Script sends POST to `/api/webhook/google-sheets`
2. Backend triggers manual sync via `/api/sync/manual`
3. After sync completes, invalidates server cache
4. Broadcasts WebSocket message to all connected clients
5. Clients refresh data via React Query invalidation

### Frontend Architecture

- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, Zustand for global client state
- **Lazy Loading**: Admin and heavy pages use React lazy loading
- **Theme**: Custom Tailwind config with dark mode support via `next-themes`
- **Error Boundaries**: Top-level error boundary catches runtime errors
- **Loading States**: Uses custom spinner and loading components

### Database Schema Highlights

Key tables (defined in `shared/schema.ts`):
- `users` - User accounts with subscription, tester, and admin fields
- `products` - Product catalog synced from Google Sheets
- `suppliers` - Supplier information and ratings
- `activeSessions` - User session tracking with geolocation
- `priceAlerts` - User-configured price monitoring alerts
- `interestList` - User product watchlists
- `supplierRatings` - User ratings and reviews for suppliers
- `emergencyAlerts` - System-wide alert banners
- `feedbackAlerts` - User feedback prompts

### Environment Configuration

Critical environment variables (validated in `server/config-validator.ts`):
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_SHEET_ID` - Source spreadsheet for product data
- `FIREBASE_*` - Firebase admin SDK credentials
- `STRIPE_*` - Payment processing keys
- `OPENAI_API_KEY` - AI search features
- `SESSION_SECRET` - Session encryption

The application validates required environment variables at startup and fails fast if missing.

## Common Development Workflows

### Adding a New API Endpoint

1. Create route file in `server/routes/` (e.g., `my-feature.routes.ts`)
2. Import and register in `server/routes.ts` with appropriate prefix
3. Add middleware if authentication/authorization required
4. Implement service logic in `server/services/` if complex
5. Update TypeScript types in `server/types/` or `shared/`

### Adding a New Frontend Page

1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx` (inside appropriate `<Route>` section)
3. Consider lazy loading for admin or heavy pages
4. Add navigation links in relevant components
5. Implement data fetching with TanStack Query hooks

### Updating Database Schema

1. Modify `shared/schema.ts` (Drizzle schema)
2. Run `npm run db:push` to apply changes
3. Update `prisma/schema.prisma` if Prisma compatibility needed
4. Handle migrations for production if required
5. Update TypeScript types that depend on schema

### Working with Google Sheets Data

- Product data source: Google Sheets spreadsheet (ID in env var)
- Sync triggered via webhook from Google Apps Script
- Manual sync available via admin dashboard
- Data cached for 15 minutes on server side
- Cache invalidation happens after webhook updates

### Testing Real-time Features

1. Ensure WebSocket server is initialized (check console for "WebSocket Manager initialized")
2. Open browser DevTools → Network → WS to monitor WebSocket connections
3. Trigger updates via admin dashboard or webhook
4. Verify client receives broadcast and updates UI

## Performance Considerations

- **Frontend Bundle**: Uses lazy loading for admin pages to reduce initial load
- **Database Queries**: Services use Drizzle for optimized queries with proper indexing
- **Caching**: Google Sheets data cached for 15 minutes, Redis used for session storage
- **API Rate Limiting**: Implemented for external API endpoints (`/api/v1`)
- **Connection Pooling**: PostgreSQL connections managed by database driver

## Security Notes

- Firebase tokens validated on every authenticated request
- Session tokens stored in HTTP-only cookies
- CORS configured for production domain
- SQL injection prevented via ORM parameterization
- User roles enforced at route middleware level
- API keys required for external API access
