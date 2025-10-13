
-- ####################################################################
-- ROLLBACK SCRIPT
-- ####################################################################
--
-- This script reverts the changes made by the upgrade_migration.sql script.
-- It should be used with caution as it involves destructive actions (dropping columns and tables).

-- 1. Remove Foreign Key Constraints
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_managerId_fkey";
ALTER TABLE "PurchaseRequisition" DROP CONSTRAINT IF EXISTS "PurchaseRequisition_currentApproverId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_requisitionId_fkey", DROP CONSTRAINT IF EXISTS "Review_reviewerId_fkey";
ALTER TABLE "Approval" DROP CONSTRAINT IF EXISTS "Approval_requisitionId_fkey", DROP CONSTRAINT IF EXISTS "Approval_approverId_fkey";

-- 2. Drop New Tables
DROP TABLE IF EXISTS "Review";
DROP TABLE IF EXISTS "Approval";

-- 3. Remove New Columns from Existing Tables
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "approvalLimit",
  DROP COLUMN IF EXISTS "managerId";

ALTER TABLE "PurchaseRequisition"
  DROP COLUMN IF EXISTS "totalAwardValue",
  DROP COLUMN IF EXISTS "currentReviewerCommittee",
  DROP COLUMN IF EXISTS "currentApproverId";

-- 4. Revert ENUM changes (This is the most complex part)
--    We need to create the old ENUM, add a temporary 'status_old' column,
--    backfill it, drop the new 'status' column, and rename.

-- Create the old ENUM type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisitionstatus_old') THEN
         CREATE TYPE "RequisitionStatus_old" AS ENUM ('Draft', 'Pending_Approval', 'Approved', 'Rejected', 'RFQ_In_Progress', 'PO_Created', 'Fulfilled', 'Closed', 'Pending_Managerial_Approval');
    END IF;
END$$;

-- Add a temporary column with the old ENUM type
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "status_old" "RequisitionStatus_old";

-- Backfill the old status column by mapping new statuses back to old ones
UPDATE "PurchaseRequisition"
SET "status_old" = CASE
    WHEN "status" = 'Draft' THEN 'Draft'::"RequisitionStatus_old"
    WHEN "status" = 'Pending_Approval' THEN 'Pending_Approval'::"RequisitionStatus_old"
    WHEN "status" = 'Approved' THEN 'Approved'::"RequisitionStatus_old"
    WHEN "status" = 'Rejected' THEN 'Rejected'::"RequisitionStatus_old"
    WHEN "status" = 'RFQ_In_Progress' THEN 'RFQ_In_Progress'::"RequisitionStatus_old"
    WHEN "status" = 'PO_Created' THEN 'PO_Created'::"RequisitionStatus_old"
    WHEN "status" = 'Closed' THEN 'Closed'::"RequisitionStatus_old"
    WHEN "status" = 'Pending_Final_Approval' THEN 'Pending_Managerial_Approval'::"RequisitionStatus_old"
    WHEN "status" = 'Pending_Committee_A_Review' THEN 'Pending_Managerial_Approval'::"RequisitionStatus_old"
    WHEN "status" = 'Pending_Committee_B_Review' THEN 'Pending_Managerial_Approval'::"RequisitionStatus_old"
    ELSE 'Draft'::"RequisitionStatus_old" -- Safe fallback
END
WHERE "status_old" IS NULL;

-- Drop the new status column and rename the old one back
ALTER TABLE "PurchaseRequisition" DROP COLUMN IF EXISTS "status";
ALTER TABLE "PurchaseRequisition" RENAME COLUMN "status_old" TO "status";

-- 5. Drop the new ENUM types
DROP TYPE IF EXISTS "RequisitionStatus";
DROP TYPE IF EXISTS "ReviewDecision";
DROP TYPE IF EXISTS "ApprovalDecision";

-- Rename the old type back to the original name
ALTER TYPE "RequisitionStatus_old" RENAME TO "RequisitionStatus";

-- Final check: Log completion
SELECT 'Rollback script completed.' as status;
