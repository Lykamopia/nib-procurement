
# Nib InternationalBank Procurement System

This is a comprehensive, full-stack procurement management system built with Next.js, Prisma, and PostgreSQL. It is designed to streamline the entire procurement lifecycle, from initial requisition to final payment, incorporating robust approval workflows, vendor management, and automated three-way matching.

## Key Features

- **Role-Based Access Control (RBAC)**: A granular permissions system that tailors the user experience to specific roles (Requester, Approver, Procurement Officer, Finance, etc.).
- **Dynamic Procurement Workflow**: Manage the entire lifecycle:
    1.  **Needs Recognition**: Users create purchase requisitions with detailed justifications and item lists.
    2.  **Approval Chains**: Requisitions are automatically routed through a multi-level approval matrix based on total value.
    3.  **RFQ & Quotations**: Procurement officers send out Requests for Quotation (RFQs) to verified vendors and track submissions.
    4.  **Committee Evaluation**: Assigned committees score vendor quotations based on weighted financial and technical criteria.
    5.  **Awarding & Final Review**: The system recommends a winner, and the decision is routed through a final approval chain before the vendor is notified.
    6.  **Contract & PO Generation**: Contracts are managed, and Purchase Orders (POs) are automatically generated upon award acceptance.
    7.  **Goods Receipt**: The receiving department logs incoming goods against POs.
    8.  **Three-Way Matching**: The system automatically performs a three-way match between the PO, Goods Receipt Note (GRN), and Invoice to identify discrepancies.
    9.  **Payment Processing**: The finance team processes payments for matched and approved invoices.
- **Vendor Management**: Includes a vendor registration portal, KYC verification workflow, and a central vendor database.
- **Comprehensive Auditing**: Every significant action is logged for full transparency and traceability.
- **Document Management**: A central repository for all procurement-related documents (Requisitions, POs, Invoices, Contracts).
- **Admin & Settings Panel**: Configure user roles, permissions, departments, the approval matrix, and other system settings.

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
- **Scenario**: Alice needs new, powerful laptops for her team. She logs in, creates a new requisition, and specifies 5 MacBook Pros with an estimated total value of **150,000 ETB**. She provides a business justification and defines the evaluation criteria (e.g., 60% technical, 40% financial).
- **System Action**: Upon submission, the system saves the requisition with a "Draft" status. Alice reviews it and clicks "Submit for Approval." The status changes to "Pending Approval," and it is automatically assigned to her department head, Bob.

### 2. **Departmental Approval (Approver)**
- **Actor**: Bob, the head of the Design department.
- **Scenario**: Bob logs in, sees the pending request from Alice, and approves it.
- **System Action**: Bob clicks "Approve." The system recognizes this is the final departmental approval. It immediately sets the requisition's status to **"Approved"** and automatically assigns it to the designated **RFQ Sender** (a specific user or any Procurement Officer, based on system settings). The requisition now appears in the RFQ Sender's "Quotations" queue.

### 3. **RFQ Distribution (Procurement Officer / RFQ Sender)**
- **Actor**: Charlie, the designated RFQ Sender.
- **Scenario**: Charlie sees the newly approved requisition in his queue with the status **"Ready for RFQ"**. He opens it, sets a deadline for vendors to submit quotes, and assigns a committee of financial and technical experts.
- **System Action**: Charlie sends the RFQ. The requisition's status changes to **"RFQ In Progress"**. The item remains visible in Charlie's queue, now with a status of **"Accepting Quotes"**.

### 4. **Quotation Submission & Deadline**
- **Actor**: Vendors.
- **Scenario**: Vendors submit their quotations before the deadline.
- **System Action**: Once the deadline passes, the requisition's status in Charlie's queue automatically updates to **"Ready for Committee Assignment"**.

### 5. **Committee Scoring**
- **Actors**: Fiona (Financial Expert) and George (Technical Expert).
- **Scenario**: Fiona and George are notified. They log in, review the masked vendor submissions, and submit their scores.
- **System Action**: The system tracks which committee members have submitted their scores. In Charlie's queue, the requisition's status now shows **"Scoring in Progress"**.

### 6. **Award Finalization (Procurement Officer)**
- **Actor**: Charlie, the Procurement Officer.
- **Scenario**: Once all committee members have finalized their scores, the requisition status in Charlie's queue automatically updates to **"Ready to Award"**. Charlie opens it, views the ranked results, and finalizes the award, recommending "Apple Inc."
- **System Action**: Charlie clicks "Finalize Scores and Award." Because the award value (150,000 ETB) is between 10,001 and 200,000 ETB, the system consults the **Approval Matrix**. It determines that a review by "Committee B" is required next.
    - The requisition's status changes to **"Pending Committee B Review."**
    - The item remains visible in Charlie's queue with this new, specific status. It also appears in the "Reviews" queue for all members of Committee B.

### 7. **Hierarchical Review (Committee B Member)**
- **Actor**: Jack, a member of Committee B.
- **Scenario**: Jack logs in, sees the pending review, and approves the award recommendation.
- **System Action**: The system logs Jack's approval. Once all required Committee B members approve, the system consults the Approval Matrix again. It sees that the next step is approval from the "Manager, Procurement Division." The requisition's status updates to **"Pending Managerial Approval"** and is assigned to that specific user. The status in Charlie's queue updates accordingly.

### 8. **Final Approval & Vendor Notification**
- **Actor**: The "Manager, Procurement Division."
- **Scenario**: The manager gives the final approval.
- **System Action**: The system recognizes this is the last step in the chain.
    - The requisition's status is set back to a final, unambiguous **"Approved"** state.
    - On the quotation page, the **"Notify Vendor"** button now becomes active for Charlie, the Procurement Officer.
    - Charlie clicks the button, officially notifying the winning vendor. The status changes to **"RFQ In Progress"** (as it's now waiting on the vendor's response).

### 9. **Award Acceptance & PO Generation (Vendor & System)**
- **Actor**: The sales rep from "Apple Inc."
- **Scenario**: The vendor receives the award notification and accepts it in the portal.
- **System Action**: The system automatically generates a **Purchase Order (PO)** and updates the requisition status to **"PO Created."**

### 10. **Goods Receipt, Invoicing & Payment**
- **Actors**: David (Receiving) and Eve (Finance).
- **Scenario**: The goods are delivered and logged (GRN). An invoice is submitted and automatically matched against the PO and GRN. Finance processes the payment.
- **System Action**: The system tracks the delivery, matching, and payment status, finally closing the requisition once payment is complete.

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
