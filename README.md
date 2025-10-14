
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

This scenario illustrates the end-to-end journey of a procurement request, involving multiple user roles and system processes.

### 1. **Needs Recognition (Requester)**
- **Actor**: Alice, a designer in the "Design" department.
- **Scenario**: Alice needs new, powerful laptops for her team. She logs into the system, navigates to "New Requisition," and fills out the form. She specifies the items needed (5 MacBook Pros), provides a business justification ("Current laptops are outdated and slow"), and defines the evaluation criteria (e.g., 60% technical, 40% financial) that will be used to score vendor quotes later.
- **System Action**: Upon submission, the system saves the requisition with a "Draft" status. Alice reviews it one last time and clicks "Submit for Approval." The status changes to "Pending Approval," and the system automatically assigns it to her department head, Bob, for review.

### 2. **Approval (Approver)**
- **Actor**: Bob, the head of the Design department.
- **Scenario**: Bob logs in and sees a notification for a pending approval. He navigates to his "Approvals" dashboard, reviews Alice's request, and sees that the justification is sound.
- **System Action**: Bob clicks "Approve" and adds a comment: "Approved. This is critical for the upcoming project." The requisition's status updates to "Approved," and it now becomes visible to the Procurement team.

### 3. **Request for Quotation (Procurement Officer)**
- **Actor**: Charlie, a Procurement Officer.
- **Scenario**: Charlie sees the newly approved requisition in the "Quotations" queue under "Ready for RFQ." He opens it, reviews the details, and decides to initiate the RFQ process.
- **System Action**:
    1. **Assigns a Committee**: Charlie assigns financial and technical experts to an evaluation committee.
    2. **Sets Deadlines**: He sets a deadline for vendors to submit their quotes and a separate, later deadline for the committee to finish scoring.
    3. **Distributes RFQ**: He sends the RFQ to a list of selected, verified vendors (or to all verified vendors). The system automatically emails the RFQ details to the chosen vendors. The requisition status changes to "RFQ In Progress."

### 4. **Quotation Submission (Vendor)**
- **Actor**: A sales representative from "Apple Inc."
- **Scenario**: The vendor receives an email notification about the new RFQ. They log into the secure vendor portal, view the requisition details, and submit their quotation, providing pricing, lead times, and answers to any custom questions.
- **System Action**: The quotation is securely stored and is only visible to the procurement team after the submission deadline has passed to ensure a fair process.

### 5. **Committee Evaluation (Committee Members)**
- **Actor**: Fiona (Financial Expert) and George (Technical Expert).
- **Scenario**: After the vendor submission deadline passes, Fiona and George are notified. They log in and go to the quotation management page for the requisition.
- **System Action**:
    - **Technical Evaluation**: George, the technical expert, reviews the quotes. Based on the system settings, pricing information may be hidden from him to ensure an unbiased technical evaluation. He scores each quote based on the pre-defined technical criteria (e.g., adherence to specs, warranty).
    - **Financial Evaluation**: Fiona scores the quotes based on financial criteria (e.g., cost-effectiveness).
    - **Finalization**: Once all committee members have submitted their scores for all quotes, they finalize their submissions. The system then calculates a final, weighted-average score for each quotation.

### 6. **Awarding (Procurement Officer)**
- **Actor**: Charlie, the Procurement Officer.
- **Scenario**: Charlie is notified that scoring is complete. He views a comparison of the quotations, now ranked by their final scores. The system recommends "Apple Inc." as the winner.
- **System Action**: Charlie clicks "Finalize Scores and Award." He confirms the award, and the system updates the statuses:
    - **Apple Inc.**: Status becomes "Awarded." An email notification is sent, requesting they accept or decline the award by a specific deadline.
    - **Other Vendors**: Statuses become "Standby" (for 2nd/3rd place) or "Rejected."

### 7. **Award Acceptance & PO Generation (Vendor & System)**
- **Actor**: The sales rep from "Apple Inc."
- **Scenario**: The vendor receives the award notification, logs in, and officially accepts the award.
- **System Action**: Upon acceptance, the system automatically:
    1. Changes the quotation status to "Accepted."
    2. Generates a formal **Purchase Order (PO)** with a unique ID, detailing the items, prices, and terms from the winning quote.
    3. Updates the original requisition's status to "PO Created" and links it to the new PO.

### 8. **Goods Receipt (Receiving Department)**
- **Actor**: David, from the Receiving department.
- **Scenario**: The laptops are delivered. David logs into the system, finds the corresponding PO, and creates a **Goods Receipt Note (GRN)**. He records the quantity received and notes their condition (e.g., "All 5 received in good condition").
- **System Action**: The system updates the PO status to "Delivered" and logs the received quantities against each line item.

### 9. **Invoice & Three-Way Matching (Finance)**
- **Actor**: Eve, from the Finance team.
- **Scenario**: Eve receives an invoice from Apple Inc. She logs it in the system against the PO.
- **System Action**: The system automatically performs a **three-way match**, comparing:
    1. The **Purchase Order** (what was ordered).
    2. The **Goods Receipt Note** (what was received).
    3. The **Invoice** (what was billed).
- If all three documents align on items, quantities, and prices, the invoice status becomes "Approved for Payment." If not, it's flagged as "Mismatched" for manual review.

### 10. **Payment (Finance)**
- **Actor**: Eve, from the Finance team.
- **Scenario**: Eve sees the "Approved for Payment" invoice in her queue. She processes the payment through the bank's system.
- **System Action**: Eve marks the invoice as "Paid" in the system, entering a payment reference number. The system updates the original requisition's status to "Closed," completing the procurement lifecycle.

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
