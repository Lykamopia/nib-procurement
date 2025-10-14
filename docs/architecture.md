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
    -   **Global State**: React Context is used for managing global state like authentication (`AuthContext`) and theme (`ThemeContext`). This is sufficient for the application's current needs and avoids the complexity of larger state management libraries.
    -   **Local State**: Standard React hooks (`useState`, `useEffect`, `useMemo`) are used for component-level state.
-   **Styling**:
    -   **[Tailwind CSS](https://tailwindcss.com/)** is used for all styling, providing a utility-first approach for rapid UI development.
    -   The theme is configured in `src/app/globals.css` using CSS variables, allowing for easy theming (including dark mode).

## 2. Backend Architecture

The backend logic is handled by Next.js API Routes, located in `src/app/api`.

-   **API Routes**: Each feature or model has its own API route handler directory (e.g., `/api/requisitions`, `/api/users`). These handlers are responsible for:
    -   Receiving and validating client requests.
    -   Interacting with the database via the Prisma client.
    -   Performing business logic.
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
2.  **Verification**: The server validates the credentials against the `User` table in the database.
3.  **Token Generation**: Upon successful validation, the server generates a JWT containing the user's ID, role, and other non-sensitive information. This token is signed with a `JWT_SECRET` from the environment variables.
4.  **Token Storage**: The client receives the token and stores it in `localStorage`. The user's information is stored in the `AuthContext`.
5.  **Authenticated Requests**: For all subsequent requests to protected API routes, the client includes the JWT in the `Authorization: Bearer <token>` header.
6.  **Server-Side Validation**: API routes that require authentication read the `Authorization` header, verify the JWT's signature and expiration, and use the decoded payload to authorize the user's action based on their role.

## 4. Database Schema (`prisma/schema.prisma`)

The schema is the single source of truth for the database structure. Key models include:

-   **User**: Stores user information, roles, and relationships to departments and vendors.
-   **Department**: Defines organizational units and their heads.
-   **Vendor**: Stores all vendor information, including KYC status and documents.
-   **PurchaseRequisition**: The core document for initiating a procurement request. It has complex relationships with items, quotations, committees, and purchase orders.
-   **Quotation**: Represents a vendor's bid for a requisition.
-   **CommitteeScoreSet** & **ItemScore**: Models used to store the detailed scores provided by committee members for each quote item.
-   **PurchaseOrder**: The formal document issued to a vendor after an award is accepted.
-   **GoodsReceiptNote**: Tracks the physical receipt of items.
-   **Invoice**: Represents the bill received from a vendor.
-   **Contract**: Manages contractual agreements.
-   **AuditLog**: A comprehensive log of all major actions performed in the system, linked by `transactionId` to the originating document.

The schema makes extensive use of Prisma's relation attributes (`@relation`) to define foreign keys and relationships (one-to-one, one-to-many).
