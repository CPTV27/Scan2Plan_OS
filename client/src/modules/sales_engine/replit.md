# Scan2Plan BIM Pricing Calculator

## Overview

A professional web-based pricing calculator for Scan-to-BIM (Building Information Modeling) services. The application enables users to generate detailed quotes for architectural scanning and modeling projects through either a quick quote calculator or a comprehensive scoping form. The system calculates pricing based on building types, square footage tiers (or acreage for landscape projects), disciplines (Architecture, Structure, MEPF, Site/Topography), Level of Detail (LoD), risk factors, travel costs, and additional services. Built as a B2B utility tool with emphasis on data organization, clarity, and efficient quote generation.

## Recent Changes

### Admin Pricing Parameters Implementation (November 2025)
- Integrated database-driven pricing parameters for all configurable system values
- Added API endpoints `/api/pricing-parameters` (GET) and `/api/pricing-parameters/:id` (PATCH)
- Implemented type-aware validation: numeric validation for 'number'/'percentage' types, text pass-through for future text parameters
- Added Promise.allSettled error handling for multi-parameter saves with aggregate success/failure reporting
- Created PARAMETER_LABELS mapping for display names and CATEGORY_TITLES for grouping
- Parameters organized into 6 categories: Risk Premiums, Travel Costs, Scope Discounts, Additional Services, Payment Terms, General
- End-to-end type preservation: database stores as text, API returns numbers for numeric types and strings for text types
- Admin UI dynamically groups 33 parameters by category with real-time React Query cache invalidation
- Robust error handling with detailed user feedback for full success, partial save, and full failure scenarios
- Server-side validation returns 400 with parameter-specific error messages for invalid inputs

### Upteam Pricing Database Integration (November 2025)
- Integrated upteam pricing matrix from database for accurate internal vendor cost calculations
- Added API endpoint `/api/upteam-pricing-matrix` to fetch upteam pricing rates
- Created `getUpteamPricingRate()` function to look up rates by building type, area tier, discipline, and LoD
- Updated cost calculation logic to use actual upteam rates from database instead of simple 0.65 multiplier
- Applied scope discounts proportionally to both client pricing and upteam costs
- Fallback to 0.65 multiplier for special cases (landscape, ACT, Matterport) and when database rate not found
- Cost Summary now displays actual vendor costs from database for accurate profit margin calculations

### Account Contact Fields Enhancement (November 2025)
- Added dedicated email and phone fields under Account Contact in Contacts & Communication section
- Contact information now displays in structured format: name, email, and phone on separate lines
- Enhanced data organization for better CRM integration and client communication

### Landscape Pricing Implementation (November 2025)
- Added two landscape building types: "Built Landscape" (14) and "Natural Landscape" (15)
- Landscape areas use per-acre pricing instead of per-square-foot pricing
- Simplified UI for landscape: shows only LoD dropdown (no disciplines menu)
- Acreage is automatically converted to square feet (43,560 sqft per acre) for display and aggregate calculations
- Pricing calculation uses tiered per-acre rates based on acreage ranges and LoD
- Hardcoded landscape pricing rates (temporary until pricing matrix database is updated):
  - Built Landscape: $875-$1,250/acre (up to 5 acres, LoD 200-350)
  - Natural Landscape: $625-$1,000/acre (up to 5 acres, LoD 200-350)
  - Additional tiers for 5-20, 20-50, 50+, and 100+ acres with decreasing rates
- Landscape areas auto-initialize with "site" discipline and LoD 300 default

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & UI Library**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- Tailwind CSS for utility-first styling with custom design system

**Component Strategy**
- shadcn/ui component library (Radix UI primitives) for accessible, customizable UI components
- Component architecture follows Material Design-inspired principles with emphasis on professional B2B aesthetics
- Modular component design with separate files for each major UI element (AreaInput, DisciplineSelector, PricingSummary, etc.)
- Example components provided for development reference and testing

**State Management**
- React Query (TanStack Query) for server state management, caching, and data synchronization
- Local component state with useState for form inputs and UI interactions
- No global state management library - leverages React Query for data fetching/mutations

**Design System**
- Custom Tailwind configuration with HSL color variables for theme consistency
- Typography system using Inter for UI and JetBrains Mono for numerical data
- Spacing primitives based on Tailwind units (2, 4, 6, 8)
- Responsive grid layouts with mobile-first approach
- Material Design-inspired elevation system using shadow utilities

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for RESTful API endpoints
- Middleware for JSON parsing, logging, and request/response handling
- Route registration pattern separating concerns between routing logic and business logic

**API Design**
- RESTful endpoints following standard HTTP methods (GET, POST, PATCH, DELETE)
- Quote management CRUD operations at `/api/quotes`
- Validation using Zod schemas for type-safe data validation
- Error handling with appropriate HTTP status codes (400, 404, 500)

**Business Logic Layer**
- Storage abstraction pattern (IStorage interface) separating database operations from route handlers
- DbStorage implementation using Drizzle ORM for database queries
- Quote number generation with timestamp-based unique identifiers
- Data transformation between database models and API responses

### Data Storage Solutions

**Database Technology**
- PostgreSQL via Neon serverless platform for cloud-hosted database
- WebSocket-based connection using @neondatabase/serverless driver
- Connection pooling for efficient database resource management

**ORM & Schema Management**
- Drizzle ORM for type-safe database queries and schema definition
- Schema-first design with TypeScript types inferred from database schema
- Zod integration (drizzle-zod) for runtime validation matching database constraints
- Migration management through drizzle-kit

**Data Models**
- **Users**: Authentication and user management (id, username, password)
- **Quotes**: Project quote storage (quoteNumber, projectName, clientName, projectData as JSONB, pricing fields)
- **Pricing Matrix**: Base rates by building type, area tier, discipline, and LoD
- **CAD Pricing Matrix**: Rates for CAD deliverable packages
- **Pricing Parameters**: Configurable system parameters (risk premiums, travel rates, discounts, service fees)

**Schema Design Rationale**
- JSONB fields for flexible storage of complex form data without rigid schema constraints
- Separate pricing reference tables for admin configurability without code changes
- Decimal type for precise financial calculations
- Timestamp fields for audit trails and quote history

### External Dependencies

**UI Component Libraries**
- @radix-ui/* packages: Headless, accessible component primitives (dialogs, dropdowns, checkboxes, etc.)
- cmdk: Command palette component
- react-day-picker: Date selection functionality
- lucide-react: Icon library for consistent iconography
- class-variance-authority: Type-safe variant management for components

**Form Management**
- react-hook-form: Performant form state management
- @hookform/resolvers: Validation integration with Zod schemas

**Data Fetching & State**
- @tanstack/react-query: Server state management, caching, and synchronization
- Automatic refetching disabled to prevent unnecessary API calls
- Infinite stale time for data that doesn't change frequently

**Development Tools**
- tsx: TypeScript execution for development server
- esbuild: Fast bundler for production builds
- Replit-specific plugins for development environment integration
- postcss & autoprefixer: CSS processing for browser compatibility

**CSV Processing**
- csv-parse: Importing pricing data from CSV files during setup/migration

**Utility Libraries**
- date-fns: Date manipulation and formatting
- clsx & tailwind-merge: Conditional CSS class composition
- nanoid: Unique ID generation for client-side operations

**Database & ORM**
- @neondatabase/serverless: PostgreSQL driver for Neon platform
- drizzle-orm: Type-safe ORM for database queries
- drizzle-zod: Schema validation from database types
- ws: WebSocket support for Neon connections
- connect-pg-simple: Session store for PostgreSQL (if authentication is expanded)