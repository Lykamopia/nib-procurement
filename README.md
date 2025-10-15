
# Nib InternationalBank Procurement System

This is a comprehensive, full-stack procurement management system built with Next.js, Prisma, and PostgreSQL. It is designed to streamline the entire procurement lifecycle, from initial requisition to final payment, incorporating robust approval workflows, vendor management, and automated three-way matching.

## Key Features

- **Role-Based Access Control (RBAC)**: A granular permissions system that tailors the user experience to specific roles (Requester, Approver, Procurement Officer, Finance, etc.).
- **Dynamic Procurement Workflow**: Manage the entire lifecycle:
    1.  **Needs Recognition**: Users create purchase requisitions with detailed justifications and item lists.
    2.  **Approval Chains**: Requisitions are automatically routed to the correct department head or manager for approval based on predefined logic.
    3.  **RFQ & Quotations**: Procurement officers send out Requests for Quotation (RFQs) to verified vendors.
    4.  **Committee Evaluation**: Assigned committees score vendor quotations based on weighted financial and technical criteria.
    5.  **Awarding & Final Review**: The system recommends a winner, and for high-value awards, the decision is routed to a higher-level committee for final approval before the vendor is notified.
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
- **Scenario**: Alice needs new, powerful laptops for her team. She logs into the system, navigates to "New Requisition," and fills out the form. She specifies the items needed (5 MacBook Pros with an estimated total value of 150,000 ETB), provides a business justification ("Current laptops are outdated and slow"), and defines the evaluation criteria (e.g., 60% technical, 40% financial) that will be used to score vendor quotes later.
- **System Action**: Upon submission, the system saves the requisition with a "Draft" status. Alice reviews it one last time and clicks "Submit for Approval." The status changes to "Pending Approval," and the system automatically assigns it to her department head, Bob, for review.

### 2. **Departmental Approval (Approver)**
- **Actor**: Bob, the head of the Design department.
- **Scenario**: Bob logs in and sees a notification for a pending approval. He reviews Alice's request, sees that the justification is sound, and approves it.
- **System Action**: Bob clicks "Approve." The requisition's status updates to "Approved," and it now becomes visible to the Procurement team.

### 3. **Request for Quotation (Procurement Officer)**
- **Actor**: Charlie, a Procurement Officer.
- **Scenario**: Charlie sees the newly approved requisition in the "Quotations" queue. He opens it, reviews the details, and decides to initiate the RFQ process.
- **System Action**:
    1. **Assigns a Committee**: Charlie assigns financial and technical experts to an evaluation committee.
    2. **Sets Deadlines**: He sets a deadline for vendors to submit their quotes and a separate, later deadline for the committee to finish scoring.
    3. **Distributes RFQ**: He sends the RFQ to a list of selected, verified vendors. The system automatically emails the RFQ details to them. The requisition status changes to "RFQ In Progress."

### 4. **Quotation Submission (Vendor)**
- **Actor**: A sales representative from "Apple Inc."
- **Scenario**: The vendor receives an email about the new RFQ. They log into the secure vendor portal, view the details, and submit their quotation with a final price of 145,000 ETB.
- **System Action**: The quotation is securely stored and is only visible to the procurement team after the submission deadline has passed.

### 5. **Committee Evaluation (Committee Members)**
- **Actor**: Fiona (Financial Expert) and George (Technical Expert).
- **Scenario**: After the vendor submission deadline, Fiona and George are notified. They log in and score each vendor's quote based on the pre-defined criteria.
- **System Action**: The system calculates a final, weighted-average score for each quotation after all committee members have finalized their submissions.

### 6. **Award Finalization (Procurement Officer)**
- **Actor**: Charlie, the Procurement Officer.
- **Scenario**: Charlie is notified that scoring is complete. He views a comparison of the quotations, ranked by their final scores. The system recommends "Apple Inc." as the winner with a total award value of 145,000 ETB.
- **System Action**: Charlie clicks "Finalize Scores and Award." Because the award value (145,000 ETB) is between 10,000 and 200,000 ETB, the system **does not** immediately notify the vendor. Instead, it routes the decision for final review:
    - The requisition status changes to **"Pending Committee B Review."**
    - The item appears in the "Reviews" dashboard for all members of Committee B.

### 7. **Final Review (Committee B Member)**
- **Actor**: Jack, a member of Committee B.
- **Scenario**: Jack logs in and sees the pending award recommendation on his "Reviews" page. He reviews the entire process—the initial request, the scores, and the final award decision made by Charlie. He agrees with the decision.
- **System Action**: Jack clicks "Approve & Recommend." The system logs his approval. Once all required Committee B members have approved, the system officially finalizes the award and automatically sends a notification email to the winning vendor, "Apple Inc."

### 8. **Award Acceptance & PO Generation (Vendor & System)**
- **Actor**: The sales rep from "Apple Inc."
- **Scenario**: The vendor receives the award notification, logs in, and officially accepts the award.
- **System Action**: Upon acceptance, the system automatically:
    1. Generates a formal **Purchase Order (PO)** with a unique ID.
    2. Updates the original requisition's status to "PO Created."

### 9. **Goods Receipt (Receiving Department)**
- **Actor**: David, from the Receiving department.
- **Scenario**: The laptops are delivered. David finds the PO in the system and creates a **Goods Receipt Note (GRN)**, recording the quantity and condition of the items received.
- **System Action**: The system updates the PO status to "Delivered."

### 10. **Invoice & Three-Way Matching (Finance)**
- **Actor**: Eve, from the Finance team.
- **Scenario**: Eve receives an invoice from Apple Inc. and logs it against the PO.
- **System Action**: The system automatically performs a **three-way match** between the PO, GRN, and Invoice. If they align, the invoice status becomes "Approved for Payment."

### 11. **Payment (Finance)**
- **Actor**: Eve.
- **Scenario**: Eve sees the "Approved for Payment" invoice, processes the payment, and marks it as "Paid" in the system.
- **System Action**: The original requisition status is updated to "Closed," completing the lifecycle.

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
