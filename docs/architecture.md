
# Application Architecture

This document provides a deeper dive into the technical architecture of the Nib InternationalBank Procurement System.

## 1. Frontend Architecture

The frontend is built using Next.js with the App Router, providing a modern, server-centric approach to building React applications.

-   **Routing**: The file system-based App Router (`src/app`) is used for all routing.
    -   `/(app)`: This is a route group for all pages that require authentication and the main application layout.
    -   `/vendor`: A separate route group for the vendor-specific portal and layout.
    -   `/login`, `/register`: Publicly accessible routes for authentication.
-   **Components**:
    -   **UI Components**: Located in `src/components/ui`, these are primarily built using the [ShadCN UI](https://ui.shadcn.com/) library, which provides accessible and unstyled component primitives.
    -   **Application Components**: Located directly in `src/components`, these are higher-level components that encapsulate specific features (e.g., `requisitions-table.tsx`, `needs-recognition-form.tsx`).
-   **State Management**:
    -   **Global State**: React Context (`src/contexts/auth-context.tsx`) is used for managing global state like the current user, their role, authentication token, and role-based permissions. This is sufficient for the application's current needs and avoids the complexity of larger state management libraries.
    -   **Local State**: Standard React hooks (`useState`, `useEffect`, `useMemo`) are used for component-level state.
-   **Styling**:
    -   **[Tailwind CSS](https://tailwindcss.com/)** is used for all styling, providing a utility-first approach for rapid UI development.
    -   The theme is configured in `src/app/globals.css` using CSS variables, allowing for easy theming (including dark mode).

## 2. Backend Architecture

The backend logic is handled by Next.js API Routes, located in `src/app/api`.

-   **API Routes**: Each feature or model has its own API route handler directory (e.g., `/api/requisitions`, `/api/users`). These handlers are responsible for:
    -   Receiving and validating client requests.
    -   Interacting with the database via the Prisma client.
    -   Performing business logic (e.g., status changes, notifications).
    -   Sending back JSON responses.
-   **Database**:
    -   **[PostgreSQL](https://www.postgresql.org/)** is the chosen relational database for its robustness and scalability.
    -   **[Prisma](https://www.prisma.io/)** serves as the Object-Relational Mapper (ORM).
        -   The database schema is declaratively defined in `prisma/schema.prisma`.
        -   Prisma Client provides a type-safe API for all database queries.
        -   Prisma Migrate is used for managing database schema migrations.
-   **Business Logic Services**:
    -   To keep API routes clean, complex business logic is abstracted into services located in `src/services`.
    -   `matching-service.ts`: Contains the logic for the three-way match algorithm.
    -   `email-service.ts`: A placeholder service for sending email notifications (currently logs to the console).

## 3. Authentication Flow

Authentication is handled using JSON Web Tokens (JWT).

1.  **Login**: A user submits their email and password to the `/api/auth/login` endpoint.
2.  **Verification**: The server validates the credentials against the `User` table in the database using `bcrypt` for password hashing.
3.  **Token Generation**: Upon successful validation, the server generates a JWT containing the user's ID, role, and other non-sensitive information. This token is signed with a `JWT_SECRET` from the environment variables.
4.  **Token Storage**: The client receives the token and stores it in `localStorage`. The `AuthContext` is updated with the user's information.
5.  **Authenticated Requests**: For all subsequent requests to protected API routes, the client includes the JWT in the `Authorization: Bearer <token>` header.
6.  **Server-Side Validation**: API routes that require authentication read the `Authorization` header, verify the JWT's signature and expiration, and use the decoded payload to authorize the user's action based on their role and ID.

## 4. Database Schema (`prisma/schema.prisma`)

The schema is the single source of truth for the database structure. It defines all the models and their relationships, which Prisma uses to generate the type-safe client and manage migrations.

### Key Models and Relationships:

-   **User & Department**: A `User` belongs to one `Department`, and a `Department` can have one `User` as its head. This forms the basis of the organizational structure and approval chains.

-   **PurchaseRequisition**: This is the central model of the application.
    -   It has a **one-to-many** relationship with `RequisitionItem`, meaning one requisition can have many line items.
    -   It has a **one-to-many** relationship with `Quotation`, as multiple vendors can submit a quote for a single requisition.
    -   It has a **many-to-many** relationship with `User` to define the evaluation committees (`financialCommitteeMembers` and `technicalCommitteeMembers`).

-   **Quotation & Scoring**:
    -   A `Quotation` is submitted by a `Vendor` for a `PurchaseRequisition`.
    -   Each `Quotation` can have multiple `CommitteeScoreSet` records, one for each scoring member of the committee.
    -   Each `CommitteeScoreSet` contains multiple `ItemScore` records, linking a score to a specific item within the quote.
    -   Each `ItemScore` has multiple `Score` records, one for each specific criterion (e.g., 'Price', 'Warranty').

-   **PurchaseOrder, GoodsReceiptNote, and Invoice**: This triad is crucial for the final stages of procurement.
    -   A `PurchaseOrder` is generated from an accepted `Quotation`.
    -   A `PurchaseOrder` can have one or more `GoodsReceiptNote`s (for partial deliveries).
    -   A `PurchaseOrder` is linked to one or more `Invoice`s.
    -   All three models share a `transactionId`, which originates from the `PurchaseRequisition`. This allows the system to easily group all related documents for auditing and matching purposes.

-   **AuditLog**: This model is designed for complete traceability.
    -   Almost every create, update, or delete action in the system generates an `AuditLog` entry.
    -   It is linked to the `User` who performed the action and the `transactionId` of the document being acted upon, creating a clear, unchangeable history for every procurement lifecycle.
