
-- ####################################################################
-- MIGRATION PLAN
-- ####################################################################
--
-- This script upgrades the database schema to support the new hierarchical
-- approval and reviewer workflow.
--
-- The migration is performed in the following stages to minimize locking and downtime:
--
-- 1.  **ENUM TYPE CREATION**: Create new ENUM types required for the new workflow states
--     (`RequisitionStatus`, `ReviewDecision`, `ApprovalDecision`).
--
-- 2.  **ADD COLUMNS**: Add all new nullable columns to existing tables (`User`, `PurchaseRequisition`).
--     This is a fast, metadata-only change.
--
-- 3.  **CREATE NEW TABLES**: Create the new `Review` and `Approval` tables to store workflow decisions.
--
-- 4.  **BACKFILL DATA**: Update existing `PurchaseRequisition` records to map old statuses to new ones.
--     This is the most critical step and is designed to be idempotent. It populates the
--     new `status` and `totalAwardValue` fields based on the old state.
--
-- 5.  **ADD CONSTRAINTS**: Add foreign key constraints to the new tables and columns. This is done
--     last to avoid validation errors during data backfilling.
--
-- Recommended Staging Steps:
--    a. Backup the production database before applying this migration.
--    b. Test this entire script on a staging environment that is a recent clone of production.
--    c. Apply the migration during a low-traffic maintenance window.
--
-- Estimated Downtime:
--    Minimal. The operations are designed to be fast. The longest step will be the `UPDATE`
--    statement in the data backfilling stage, but on indexed columns, it should be quick.
--    Total downtime should be less than a few minutes.

-- ####################################################################
-- 1. CREATE NEW ENUM TYPES
-- ####################################################################

-- We need to add the new states to the existing RequisitionStatus ENUM.
-- PostgreSQL doesn't allow removing ENUM values, but we can add new ones.
-- The safest way is to create a new type, migrate, drop the old, and rename.

-- Create new status ENUM with all required values for the new workflow
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisitionstatus_new') THEN
        CREATE TYPE "RequisitionStatus_new" AS ENUM ('Draft', 'Pending_Approval', 'Approved', 'Rejected', 'RFQ_In_Progress', 'PO_Created', 'Fulfilled', 'Closed', 'Pending_Managerial_Approval', 'Pending_Committee_A_Review', 'Pending_Committee_B_Review', 'Pending_Final_Approval');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewdecision') THEN
        CREATE TYPE "ReviewDecision" AS ENUM ('Recommended', 'ChangesRequested');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approvaldecision') THEN
        CREATE TYPE "ApprovalDecision" AS ENUM ('Approved', 'Rejected', 'Escalated');
    END IF;
END$$;


-- ####################################################################
-- 2. ADD COLUMNS TO EXISTING TABLES
-- ####################################################################

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "approvalLimit" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "managerId" TEXT;

ALTER TABLE "PurchaseRequisition"
  ADD COLUMN IF NOT EXISTS "totalAwardValue" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentReviewerCommittee" TEXT,
  ADD COLUMN IF NOT EXISTS "currentApproverId" TEXT,
  -- Add the new status column with the new ENUM type, but nullable for now
  ADD COLUMN IF NOT EXISTS "status_new" "RequisitionStatus_new";


-- ####################################################################
-- 3. CREATE NEW TABLES
-- ####################################################################

-- Create Review Table
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "committee" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create Approval Table
CREATE TABLE IF NOT EXISTS "Approval" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- Create Indexes for new tables
CREATE INDEX IF NOT EXISTS "Review_requisitionId_idx" ON "Review"("requisitionId");
CREATE INDEX IF NOT EXISTS "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX IF NOT EXISTS "Approval_requisitionId_idx" ON "Approval"("requisitionId");
CREATE INDEX IF NOT EXISTS "Approval_approverId_idx" ON "Approval"("approverId");


-- ####################################################################
-- 4. BACKFILL DATA (MIGRATE OLD STATE TO NEW STATE)
-- ####################################################################

-- This UPDATE statement will map old statuses to the new `status_new` column.
-- It's designed to be run multiple times safely (idempotent).
UPDATE "PurchaseRequisition"
SET "status_new" = CASE
    WHEN "status" = 'Draft' THEN 'Draft'::"RequisitionStatus_new"
    WHEN "status" = 'Pending_Approval' THEN 'Pending_Approval'::"RequisitionStatus_new"
    WHEN "status" = 'Approved' THEN 'Approved'::"RequisitionStatus_new"
    WHEN "status" = 'Rejected' THEN 'Rejected'::"RequisitionStatus_new"
    WHEN "status" = 'RFQ_In_Progress' THEN 'RFQ_In_Progress'::"RequisitionStatus_new"
    WHEN "status" = 'PO_Created' THEN 'PO_Created'::"RequisitionStatus_new"
    WHEN "status" = 'Fulfilled' THEN 'Closed'::"RequisitionStatus_new" -- Mapping Fulfilled to Closed
    WHEN "status" = 'Closed' THEN 'Closed'::"RequisitionStatus_new"
    -- Add mappings for old review statuses if they exist
    WHEN "status" = 'Pending_Managerial_Approval' THEN 'Pending_Approval'::"RequisitionStatus_new"
    WHEN "status" = 'Pending_Committee_A_Review' THEN 'PendingReview'::"RequisitionStatus_new"
    WHEN "status" = 'Pending_Committee_B_Review' THEN 'PendingReview'::"RequisitionStatus_new"
    WHEN "status" = 'Pending_Final_Approval' THEN 'PendingApproval'::"RequisitionStatus_new"
    ELSE "status"::text::"RequisitionStatus_new" -- Fallback cast
END
WHERE "status_new" IS NULL;


-- ####################################################################
-- 5. APPLY CONSTRAINTS AND FINALIZE SCHEMA
-- ####################################################################

-- Drop the old status column
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "status";
-- Rename the new column to 'status'
ALTER TABLE "PurchaseRequisition" RENAME COLUMN "status_new" TO "status";
-- Drop old ENUM type
DROP TYPE IF EXISTS "RequisitionStatus";
-- Rename new ENUM type
ALTER TYPE "RequisitionStatus_new" RENAME TO "RequisitionStatus";

-- Add Foreign Key Constraints
ALTER TABLE "User"
  ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "PurchaseRequisition"
  ADD CONSTRAINT "PurchaseRequisition_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Approval"
  ADD CONSTRAINT "Approval_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

