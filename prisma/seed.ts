
import { PrismaClient, UserRole, PermissionAction, PermissionSubject } from '@prisma/client';
import { getInitialData } from '../src/lib/seed-data';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Clearing existing data...`);
  // Deleting in reverse order of creation to respect foreign key constraints
  await prisma.auditLog.deleteMany({});
  await prisma.receiptItem.deleteMany({});
  await prisma.goodsReceiptNote.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.pOItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.quoteAnswer.deleteMany({});
  await prisma.financialScore.deleteMany({});
  await prisma.technicalScore.deleteMany({});
  await prisma.itemScore.deleteMany({});
  await prisma.committeeScoreSet.deleteMany({});
  await prisma.quoteItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.technicalCriterion.deleteMany({});
  await prisma.financialCriterion.deleteMany({});
  await prisma.evaluationCriteria.deleteMany({});
  await prisma.customQuestion.deleteMany({});
  await prisma.requisitionItem.deleteMany({});
  await prisma.committeeAssignment.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.purchaseRequisition.deleteMany({});
  await prisma.kYC_Document.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  
  // Clear RBAC tables
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('Existing data cleared.');

  console.log(`Start seeding ...`);

  // Seed Departments
  for (const department of getInitialData().departments) {
    await prisma.department.create({
      data: department,
    });
  }
  console.log('Seeded departments.');

  // Seed RBAC Roles & Permissions
  const allPermissions = [
    // Page Permissions
    { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
    { action: PermissionAction.VIEW, subject: PermissionSubject.REQUISITIONS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.APPROVALS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.VENDORS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.QUOTATIONS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.CONTRACTS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.PURCHASE_ORDERS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.INVOICES },
    { action: PermissionAction.VIEW, subject: PermissionSubject.GOODS_RECEIPT },
    { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    { action: PermissionAction.VIEW, subject: PermissionSubject.AUDIT_LOG },
    { action: PermissionAction.VIEW, subject: PermissionSubject.SETTINGS },
    // Action Permissions
    { action: PermissionAction.CREATE, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.EDIT, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.DELETE, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.SUBMIT, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.APPROVE, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.REJECT, subject: PermissionSubject.REQUISITION },
    { action: PermissionAction.CREATE, subject: PermissionSubject.VENDOR },
    { action: PermissionAction.VERIFY, subject: PermissionSubject.VENDOR },
    { action: PermissionAction.SEND, subject: PermissionSubject.RFQ },
    { action: PermissionAction.MANAGE, subject: PermissionSubject.COMMITTEE },
    { action: PermissionAction.FINALIZE_SCORES, subject: PermissionSubject.QUOTATION },
    { action: PermissionAction.SUBMIT_SCORES, subject: PermissionSubject.QUOTATION },
    { action: PermissionAction.SCORE, subject: PermissionSubject.QUOTATION },
    { action: PermissionAction.CREATE, subject: PermissionSubject.CONTRACT },
    { action: PermissionAction.APPROVE, subject: PermissionSubject.PAYMENT },
    { action: PermissionAction.PROCESS, subject: PermissionSubject.PAYMENT },
    { action: PermissionAction.MANAGE, subject: PermissionSubject.PERMISSIONS },
  ];

  for (const perm of allPermissions) {
    await prisma.permission.create({ data: perm });
  }
  console.log('Seeded permissions.');

  const rolePermissionsMap: Record<UserRole, { action: PermissionAction, subject: PermissionSubject }[]> = {
    Admin: allPermissions,
    Procurement_Officer: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.REQUISITIONS },
        { action: PermissionAction.CREATE, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.VENDORS },
        { action: PermissionAction.CREATE, subject: PermissionSubject.VENDOR },
        { action: PermissionAction.VERIFY, subject: PermissionSubject.VENDOR },
        { action: PermissionAction.VIEW, subject: PermissionSubject.QUOTATIONS },
        { action: PermissionAction.SEND, subject: PermissionSubject.RFQ },
        { action: PermissionAction.MANAGE, subject: PermissionSubject.COMMITTEE },
        { action: PermissionAction.FINALIZE_SCORES, subject: PermissionSubject.QUOTATION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.CONTRACTS },
        { action: PermissionAction.CREATE, subject: PermissionSubject.CONTRACT },
        { action: PermissionAction.VIEW, subject: PermissionSubject.PURCHASE_ORDERS },
        { action: PermissionAction.VIEW, subject: PermissionSubject.INVOICES },
        { action: PermissionAction.APPROVE, subject: PermissionSubject.PAYMENT },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
        { action: PermissionAction.VIEW, subject: PermissionSubject.AUDIT_LOG },
        { action: PermissionAction.VIEW, subject: PermissionSubject.SETTINGS },
    ],
    Requester: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.REQUISITIONS },
        { action: PermissionAction.CREATE, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.EDIT, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.DELETE, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.SUBMIT, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Approver: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.REQUISITIONS },
        { action: PermissionAction.VIEW, subject: PermissionSubject.APPROVALS },
        { action: PermissionAction.APPROVE, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.REJECT, subject: PermissionSubject.REQUISITION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Finance: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.INVOICES },
        { action: PermissionAction.PROCESS, subject: PermissionSubject.PAYMENT },
        { action: PermissionAction.VIEW, subject: PermissionSubject.PURCHASE_ORDERS },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Receiving: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.GOODS_RECEIPT },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Committee_Member: [
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.QUOTATIONS },
        { action: PermissionAction.SCORE, subject: PermissionSubject.QUOTATION },
        { action: PermissionAction.SUBMIT_SCORES, subject: PermissionSubject.QUOTATION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Committee: [ // This role is for the chair/lead
        { action: PermissionAction.VIEW, subject: PermissionSubject.DASHBOARD },
        { action: PermissionAction.VIEW, subject: PermissionSubject.QUOTATIONS },
        { action: PermissionAction.MANAGE, subject: PermissionSubject.COMMITTEE },
        { action: PermissionAction.FINALIZE_SCORES, subject: PermissionSubject.QUOTATION },
        { action: PermissionAction.VIEW, subject: PermissionSubject.RECORDS },
    ],
    Vendor: [], // Vendor permissions are not managed through this system
  };

  for (const roleName of Object.values(UserRole)) {
      const perms = rolePermissionsMap[roleName];
      await prisma.role.create({
          data: {
              name: roleName,
              permissions: perms ? {
                  connect: perms.map(p => ({ action_subject: { action: p.action, subject: p.subject }}))
              } : undefined
          },
      });
  }
  console.log('Seeded roles and assigned permissions.');

  const seedData = getInitialData();
  
  // Seed non-vendor users first
  for (const user of seedData.users.filter(u => u.role !== 'Vendor')) {
    const { committeeAssignments, departmentId, department, vendorId, password, ...userData } = user;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    await prisma.user.create({
      data: {
          ...userData,
          password: hashedPassword,
          roleName: userData.role as UserRole,
          department: user.departmentId ? { connect: { id: user.departmentId } } : undefined,
      },
    });
  }
  console.log('Seeded non-vendor users.');
  
  // Second pass to link managers
  for (const user of seedData.users.filter(u => u.role !== 'Vendor' && u.managerId)) {
      await prisma.user.update({
          where: { id: user.id },
          data: {
              manager: { connect: { id: user.managerId } }
          }
      });
  }
  console.log('Linked managers to users.');

  // Seed Vendors and their associated users
  for (const vendor of seedData.vendors) {
      const { kycDocuments, userId, ...vendorData } = vendor;
      const vendorUser = seedData.users.find(u => u.id === userId);

      if (!vendorUser) {
          console.warn(`Skipping vendor ${vendor.name} because its user was not found.`);
          continue;
      }
      
      const hashedPassword = await bcrypt.hash(vendorUser.password || 'password123', 10);
      
      const createdUser = await prisma.user.create({
          data: {
              id: vendorUser.id,
              name: vendorUser.name,
              email: vendorUser.email,
              password: hashedPassword,
              approvalLimit: vendorUser.approvalLimit,
              roleName: vendorUser.role as UserRole,
          }
      });
      
    const createdVendor = await prisma.vendor.create({
      data: {
          ...vendorData,
          userId: createdUser.id,
          kycStatus: vendorData.kycStatus as any,
          user: { connect: { id: createdUser.id } }
      },
    });

    await prisma.user.update({
        where: { id: createdUser.id },
        data: { vendorId: createdVendor.id }
    });

    if (kycDocuments) {
        for (const doc of kycDocuments) {
            await prisma.kYC_Document.create({
                data: {
                    ...doc,
                    vendorId: createdVendor.id,
                }
            });
        }
    }
  }
  console.log('Seeded vendors and their users.');

  // Seed the rest of the data... (requisitions, quotes, etc.)
  for (const requisition of seedData.requisitions) {
      const { 
          items, customQuestions, evaluationCriteria, quotations, requesterId, approverId, currentApproverId,
          financialCommitteeMemberIds, technicalCommitteeMemberIds, department, departmentId, committeeMemberIds, 
          ...reqData 
      } = requisition;

      await prisma.purchaseRequisition.create({
          data: {
              ...reqData,
              status: reqData.status.replace(/ /g, '_') as any,
              requester: { connect: { id: requesterId } },
              approver: approverId ? { connect: { id: approverId } } : undefined,
              currentApproverId: currentApproverId || approverId,
              department: departmentId ? { connect: { id: departmentId } } : undefined,
              financialCommitteeMembers: financialCommitteeMemberIds ? { connect: financialCommitteeMemberIds.map(id => ({ id })) } : undefined,
              technicalCommitteeMembers: technicalCommitteeMemberIds ? { connect: technicalCommitteeMemberIds.map(id => ({ id })) } : undefined,
              deadline: reqData.deadline ? new Date(reqData.deadline) : undefined,
              scoringDeadline: reqData.scoringDeadline ? new Date(reqData.scoringDeadline) : undefined,
              awardResponseDeadline: reqData.awardResponseDeadline ? new Date(reqData.awardResponseDeadline) : undefined,
              items: { create: items },
              customQuestions: { create: customQuestions?.map(q => ({...q, options: q.options || []}))},
              evaluationCriteria: evaluationCriteria ? {
                  create: {
                      financialWeight: evaluationCriteria.financialWeight,
                      technicalWeight: evaluationCriteria.technicalWeight,
                      financialCriteria: { create: evaluationCriteria.financialCriteria },
                      technicalCriteria: { create: evaluationCriteria.technicalCriteria }
                  }
              } : undefined,
          }
      });
  }
  console.log('Seeded requisitions.');
  
  for (const quote of seedData.quotations) {
       const { items, answers, scores, requisitionId, vendorId, ...quoteData } = quote;
       await prisma.quotation.create({
           data: {
               ...quoteData,
               status: quoteData.status.replace(/_/g, '_') as any,
               deliveryDate: new Date(quoteData.deliveryDate),
               createdAt: new Date(quoteData.createdAt),
               vendor: { connect: { id: vendorId } },
               requisition: { connect: { id: requisitionId } },
               items: { create: items },
               answers: { create: answers },
           }
       });
   }
   console.log('Seeded quotations.');

  for (const po of seedData.purchaseOrders) {
        const { items, receipts, invoices, vendor, ...poData } = po;
        await prisma.purchaseOrder.create({
            data: {
                ...poData,
                status: poData.status.replace(/ /g, '_') as any,
                createdAt: new Date(poData.createdAt),
                vendorId: vendor.id,
                requisitionId: po.requisitionId,
                items: {
                    create: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        receivedQuantity: item.receivedQuantity,
                        requisitionItemId: item.requisitionItemId
                    })),
                },
            }
        });
    }
    console.log('Seeded purchase orders.');
    
    for (const invoice of seedData.invoices) {
        const { items, ...invoiceData } = invoice;
        await prisma.invoice.create({
            data: {
                ...invoiceData,
                status: invoiceData.status.replace(/_/g, '_') as any,
                invoiceDate: new Date(invoiceData.invoiceDate),
                paymentDate: invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : undefined,
                items: { create: items }
            }
        });
    }
    console.log('Seeded invoices.');

    for (const grn of seedData.goodsReceipts) {
        const { items, ...grnData } = grn;
        await prisma.goodsReceiptNote.create({
            data: {
                ...grnData,
                receivedDate: new Date(grnData.receivedDate),
                items: {
                  create: items.map(item => ({...item, condition: item.condition as any}))
                }
            }
        });
    }
    console.log('Seeded goods receipts.');

  for (const log of seedData.auditLogs) {
    const userForLog = seedData.users.find(u => u.name === log.user);
    const { user, role, ...logData } = log;
    await prisma.auditLog.create({
      data: {
          ...logData,
          timestamp: new Date(log.timestamp),
          user: userForLog ? { connect: { id: userForLog.id } } : undefined
      },
    });
  }
  console.log('Seeded audit logs.');

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
