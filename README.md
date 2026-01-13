# Scan2Plan OS

**Scan2Plan OS** is a comprehensive Project Management, CRM, and Field Operations platform designed for laser scanning and BIM modeling workflows. It orchestrates the entire lifecycle of a project from initial lead capture and CPQ (Configure, Price, Quote) to field data capture, processing, and final delivery.

## 🚀 Quick Start

### Prerequisites
*   **Node.js** (v20+ recommended)
*   **PostgreSQL** (Active database server)
*   **npm** or **yarn**

### Installation

1.  **Clone findings** (or pull latest):
    ```bash
    git pull origin main
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Copy the example environment file and configure your secrets.
    ```bash
    cp .env.example .env
    ```
    *   **Critical**: Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.
    *   See `.env.example` for required API keys (Google Maps, OpenAI, etc.).

4.  **Database Setup**:
    Push the Drizzle schema to your database.
    ```bash
    npm run db:push
    ```

5.  **Run Development Server**:
    Start the Express backend and React frontend concurrently.
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5000`.

## 🏗️ System Architecture

### Tech Stack
*   **Frontend**: React, Vite, TailwindCSS, Shadcn UI
*   **Backend**: Node.js, Express
*   **Database**: PostgreSQL, Drizzle ORM
*   **Type Safety**: TypeScript (Full stack)

### Storage Module Structure
The backend storage logic has been modularized for maintainability:
*   `server/storage/` - Domain-specific modules (`projects.ts`, `leads.ts`, `financial.ts`, etc.).
*   `server/storage.ts` - **Facade** that aggregates all modules into a unified `IStorage` interface for backward compatibility.

## 📚 Documentation Index

Detailed documentation can be found in the project root and `docs/` folder:

*   **[Features Documentation](FEATURES_DOCUMENTATION.md)**: Deep dive into all functional modules (Sales, Production, Field Ops, Financials).
*   **[System Architecture](SYSTEM_ARCHITECTURE_EXPORT.md)**: Technical audit, database schema diagrams, and backend logic explanation.
*   **[CPQ Integration Guide](CPQ_INTEGRATION_GUIDE.md)**: Details on the Configure-Price-Quote system and pricing logic.
*   **[Tier A Pricing Guide](TIER_A_PRICING_GUIDE.md)**: Logic for enterprise-grade pricing tiers.

## 🧪 Testing & Verification

### Type Checking
Ensure type safety across the monorepo:
```bash
npm run check
```

### Running Tests
Execute the test suite (Vitest):
```bash
npm test
```

## 🔐 Authentication & Roles
The system uses **Replit Auth** (OpenID Connect) for authentication and role-based access control.
*   **Roles**: `ceo`, `sales`, `production`, `accounting`.
*   **RoleGuard**: Frontend component that protects routes based on user role.

---
*For further assistance, refer to the [System Architecture](SYSTEM_ARCHITECTURE_EXPORT.md) document.*
