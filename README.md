# Nib InternationalBank Procurement System

This is a comprehensive, full-stack procurement management system built with Next.js, Prisma, and PostgreSQL. It is designed to streamline the entire procurement lifecycle, from initial requisition to final payment, incorporating robust approval workflows, vendor management, and automated three-way matching.

## Key Features

- **Role-Based Access Control (RBAC)**: A granular permissions system that tailors the user experience to specific roles (Requester, Approver, Procurement Officer, Finance, etc.).
- **Dynamic Procurement Workflow**: Manage the entire lifecycle:
    1.  **Needs Recognition**: Users create purchase requisitions with detailed justifications and item lists.
    2.  **Approval Chains**: Requisitions are automatically routed to the correct department head or manager for approval based on predefined logic.
    3.  **RFQ & Quotations**: Procurement officers send out Requests for Quotation (RFQs) to verified vendors.
    4.  **Committee Evaluation**: Assigned committees score vendor quotations based on weighted financial and technical criteria.
    5.  **Awarding**: The system recommends a winner, and procurement officers finalize the award.
    6.  **Contract & PO Generation**: Contracts are managed, and Purchase Orders (POs) are automatically generated upon award acceptance.
    7.  **Goods Receipt**: The receiving department logs incoming goods against POs.
    8.  **Three-Way Matching**: The system automatically performs a three-way match between the PO, Goods Receipt Note (GRN), and Invoice to identify discrepancies.
    9.  **Payment Processing**: The finance team processes payments for matched and approved invoices.
- **Vendor Management**: Includes a vendor registration portal, KYC verification workflow, and a central vendor database.
- **Comprehensive Auditing**: Every significant action is logged for full transparency and traceability.
- **Document Management**: A central repository for all procurement-related documents (Requisitions, POs, Invoices, Contracts).
- **Admin & Settings Panel**: Configure user roles, permissions, departments, and other system settings.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components.
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: JWT-based authentication

---

## Getting Started

### 1. Prerequisites
- Node.js (v20 or later)
- npm or a compatible package manager
- PostgreSQL database server

### 2. Set Up Your Database
1.  Make sure you have PostgreSQL installed and running.
2.  Create a new database for this project.
3.  Update the `.env` file in the root of the project with your PostgreSQL connection string:

    ```env
    # .env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    JWT_SECRET="YOUR_SUPER_SECRET_KEY"
    ```

    Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE` with your actual database credentials. Change `JWT_SECRET` to a long, random, and secret string.

### 3. Install Dependencies
```bash
npm install
```

### 4. Apply the Database Schema
This command applies the defined schema in `prisma/schema.prisma` to your database, creating all tables and relationships.

```bash
npx prisma migrate dev --name init
```

This will also automatically generate the Prisma Client based on your schema.

### 5. Seed the Database
To populate your database with initial sample data (users, vendors, requisitions, etc.), run the seed command:

```bash
npm run db:seed
```

### 6. Run the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

---

## The Procurement Workflow Explained

1.  **A Requester** (e.g., Alice from Design) logs in and creates a new Purchase Requisition for items she needs.
2.  The system determines the appropriate **Approver** (e.g., her department head, Bob) and assigns the requisition to them.
3.  **The Approver** logs in, reviews the requisition, and either approves or rejects it.
4.  Once approved, the requisition becomes visible to the **Procurement Officer** (Charlie).
5.  **The Procurement Officer** initiates an RFQ process, setting deadlines and selecting vendors. They also form an evaluation committee.
6.  **Vendors** log in to their portal, view the RFQ, and submit their quotations.
7.  After the RFQ deadline, the assigned **Committee Members** log in to score the submitted quotations based on the pre-defined criteria.
8.  Once all scores are submitted, the **Procurement Officer** finalizes the award, which notifies the winning and losing vendors.
9.  The winning **Vendor** accepts the award, which automatically generates a Purchase Order (PO).
10. The **Receiving** department logs the arrival of goods using a Goods Receipt Note (GRN), referencing the PO.
11. The **Finance** team receives an invoice from the vendor and initiates the three-way matching process.
12. If the PO, GRN, and Invoice all match, the invoice is approved for payment.
13. The **Finance** team processes the payment, and the requisition lifecycle is marked as closed.

---
## Project Structure

```
.
├── /prisma/                # Prisma schema and seed script
├── /public/                # Static assets (images, logos)
├── /src/
│   ├── /app/
│   │   ├── /(app)/         # Main authenticated app routes
│   │   ├── /api/           # API route handlers
│   │   ├── /login/         # Login page
│   │   ├── /register/      # Vendor registration page
│   │   └── /vendor/        # Vendor portal routes
│   ├── /components/        # React components (UI and logic)
│   ├── /contexts/          # React contexts (Auth, Theme)
│   ├── /hooks/             # Custom React hooks
│   ├── /lib/               # Core libraries, types, and utilities
│   └── /services/          # Business logic services (email, matching)
├── .env                    # Environment variables (DATABASE_URL, JWT_SECRET)
└── package.json
```
For a more detailed technical overview, please see `docs/architecture.md`.
