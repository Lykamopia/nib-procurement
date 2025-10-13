
import { PrismaClient } from '@prisma/client';
import { getInitialData } from '../src/lib/seed-data';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Clearing existing data...`);
  // Manually order deletion to respect foreign key constraints
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
  await prisma.committeeRecommendation.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.contract.deleteMany({});
  
  await prisma.purchaseRequisition.deleteMany({});
  
  await prisma.kYC_Document.deleteMany({});
  
  // Break user-manager and department-head cycles before deleting users/departments
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.department.updateMany({data: { headId: null }});
  
  // Now delete vendors, which might have user relations
  await prisma.vendor.deleteMany({});

  // Now delete users and departments
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.role.deleteMany({});
  console.log('Existing data cleared.');

  console.log(`Start seeding ...`);

  const seedData = getInitialData();
  
  const allRoles = [
      { name: 'Requester', description: 'Can create purchase requisitions.' },
      { name: 'Approver', description: 'Can approve or reject requisitions based on limits.' },
      { name: 'Procurement_Officer', description: 'Manages the RFQ and PO process.' },
      { name: 'Finance', description: 'Manages invoices and payments.' },
      { name: 'Admin', description: 'System administrator with all permissions.' },
      { name: 'Receiving', description: 'Manages goods receipt notes.' },
      { name: 'Vendor', description: 'External supplier of goods/services.' },
      { name: 'Committee_Member', description: 'Scores and evaluates vendor quotations.' },
      { name: 'Committee_A_Member', description: 'Reviews high-value awards.' },
      { name: 'Committee_B_Member', description: 'Reviews mid-value awards.' },
      { name: 'President', description: 'Top-level approver.' },
      { name: 'VP_Resources', description: 'High-level approver.' },
      { name: 'Director_Supply_Chain', description: 'Mid-level approver.' },
      { name: 'Director_HRM', description: 'Low-level approver.' },
      { name: 'Procurement_Manager', description: 'Low-level approver.' },
      { name: 'Committee', description: 'Manages evaluation committees.' },
  ];

  // Seed Roles
  for (const role of allRoles) {
      await prisma.role.create({ data: { name: role.name, description: role.description } });
  }
  console.log('Seeded roles.');

  // Seed Departments without heads first
  for (const department of seedData.departments) {
    const { headId, ...deptData } = department;
    await prisma.department.create({
      data: deptData,
    });
  }
  console.log('Seeded departments.');

  // Seed non-vendor users
  for (const user of seedData.users.filter(u => u.role !== 'Vendor')) {
    const { committeeAssignments, department, departmentId, vendorId, password, managerId, ...userData } = user;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const roleName = userData.role.replace(/ /g, '_');

    await prisma.user.create({
      data: {
          ...userData,
          password: hashedPassword,
          role: { connect: { name: roleName } },
          department: user.departmentId ? { connect: { id: user.departmentId } } : undefined,
      },
    });
  }
  console.log('Seeded non-vendor users.');
  
  // Link managers to users
  for (const user of seedData.users.filter(u => u.role !== 'Vendor' && u.managerId)) {
      await prisma.user.update({
          where: { id: user.id },
          data: { manager: { connect: { id: user.managerId } } }
      });
  }
  console.log('Linked managers to users.');
  
  // Link department heads
  for (const dept of seedData.departments) {
    if (dept.headId) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { head: { connect: { id: dept.headId } } }
      });
    }
  }
  console.log('Linked department heads.');


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
              role: { connect: { name: vendorUser.role.replace(/ /g, '_') } },
          }
      });
      
    const createdVendor = await prisma.vendor.create({
      data: {
          ...vendorData,
          kycStatus: vendorData.kycStatus.replace(/ /g, '_') as any,
          user: { connect: { id: createdUser.id } },
      },
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

  // Store created requisitions to get their dynamic IDs
  const createdRequisitions: { [key: string]: any } = {};

  // Seed Requisitions
  for (const requisition of seedData.requisitions) {
      const { 
          id: originalId, // Capture the original hardcoded ID
          items, 
          customQuestions, 
          evaluationCriteria, 
          quotations, 
          requesterId,
          approverId,
          currentApproverId,
          departmentId,
          financialCommitteeMemberIds,
          technicalCommitteeMemberIds,
          requesterName, 
          department, 
          ...reqData 
      } = requisition;

      const createdRequisition = await prisma.purchaseRequisition.create({
          data: {
              ...reqData,
              status: reqData.status.replace(/ /g, '_') as any,
              urgency: reqData.urgency || 'Low',
              requester: { connect: { id: requesterId } },
              approver: approverId ? { connect: { id: approverId } } : undefined,
              currentApprover: currentApproverId ? { connect: { id: currentApproverId } } : undefined,
              department: departmentId ? { connect: { id: departmentId } } : undefined,
              deadline: reqData.deadline ? new Date(reqData.deadline) : undefined,
              scoringDeadline: reqData.scoringDeadline ? new Date(reqData.scoringDeadline) : undefined,
              awardResponseDeadline: reqData.awardResponseDeadline ? new Date(reqData.awardResponseDeadline) : undefined,
              financialCommitteeMembers: financialCommitteeMemberIds ? {
                connect: financialCommitteeMemberIds.map(id => ({ id }))
              } : undefined,
              technicalCommitteeMembers: technicalCommitteeMemberIds ? {
                connect: technicalCommitteeMemberIds.map(id => ({ id }))
              } : undefined,
          }
      });
      
      // Store the created requisition with its new ID, using the original ID as the key
      createdRequisitions[originalId] = createdRequisition;

      if (items) {
          for (const item of items) {
              await prisma.requisitionItem.create({
                  data: { ...item, unitPrice: item.unitPrice || 0, requisitionId: createdRequisition.id }
              });
          }
      }

      if (customQuestions) {
          for (const question of customQuestions) {
              await prisma.customQuestion.create({
                  data: { ...question, options: question.options || [], requisitionId: createdRequisition.id, }
              });
          }
      }

      if (evaluationCriteria) {
          await prisma.evaluationCriteria.create({
              data: {
                  requisitionId: createdRequisition.id,
                  financialWeight: evaluationCriteria.financialWeight,
                  technicalWeight: evaluationCriteria.technicalWeight,
                  financialCriteria: { create: evaluationCriteria.financialCriteria },
                  technicalCriteria: { create: evaluationCriteria.technicalCriteria }
              }
          })
      }
  }
  console.log('Seeded requisitions and related data.');

   for (const quote of seedData.quotations) {
       const { items, answers, scores, requisitionId, vendorId, ...quoteData } = quote;
       
       // Use the dynamically created requisition ID
       const dynamicRequisition = createdRequisitions[requisitionId];
       if (!dynamicRequisition) {
           console.warn(`Skipping quote ${quote.id} because its requisition ${requisitionId} was not found in the created list.`);
           continue;
       }

       const createdQuote = await prisma.quotation.create({
           data: {
               ...quoteData,
               status: quoteData.status.replace(/_/g, '_') as any,
               deliveryDate: new Date(quoteData.deliveryDate),
               createdAt: new Date(quoteData.createdAt),
               vendor: { connect: { id: vendorId } },
               requisition: { connect: { id: dynamicRequisition.id } },
           }
       });

       if (items) {
           for (const item of items) {
               await prisma.quoteItem.create({ data: { ...item, quotationId: createdQuote.id } })
           }
       }

       if (answers) {
           for (const answer of answers) {
               await prisma.quoteAnswer.create({ data: { ...answer, quotationId: createdQuote.id } })
           }
       }
   }
   console.log('Seeded quotations and related data.');

    for (const po of seedData.purchaseOrders) {
        const { items, receipts, invoices, vendor, ...poData } = po;
        const dynamicRequisition = createdRequisitions[po.requisitionId];
        if (!dynamicRequisition) {
           console.warn(`Skipping PO ${po.id} because its requisition ${po.requisitionId} was not found in the created list.`);
           continue;
        }

        await prisma.purchaseOrder.create({
            data: {
                ...poData,
                status: poData.status.replace(/_/g, '_') as any,
                createdAt: new Date(poData.createdAt),
                vendorId: vendor.id,
                requisitionId: dynamicRequisition.id,
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
        const createdInvoice = await prisma.invoice.create({
            data: {
                ...invoiceData,
                status: invoiceData.status.replace(/_/g, '_') as any,
                invoiceDate: new Date(invoiceData.invoiceDate),
                paymentDate: invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : undefined,
            }
        });

        if (items) {
            for (const item of items) {
                await prisma.invoiceItem.create({ data: { ...item, invoiceId: createdInvoice.id, } })
            }
        }
    }
    console.log('Seeded invoices.');

    for (const grn of seedData.goodsReceipts) {
        const { items, ...grnData }. = grn;
        const createdGrn = await prisma.goodsReceiptNote.create({
            data: { 
                ...grnData, 
                receivedDate: new Date(grnData.receivedDate),
                receivedBy: { connect: { id: grnData.receivedById } }
            }
        });

        if (items) {
            for (const item of items) {
                await prisma.receiptItem.create({
                    data: { 
                        quantityReceived: item.quantityReceived,
                        condition: item.condition.replace(/ /g, '_') as any, 
                        notes: item.notes,
                        goodsReceiptNoteId: createdGrn.id,
                        poItemId: item.poItemId,
                    }
                })
            }
        }
    }
    console.log('Seeded goods receipts.');

  for (const log of seedData.auditLogs) {
    const userForLog = seedData.users.find(u => u.name === log.user);
    const { user, role, ...logData } = log;
    await prisma.auditLog.create({
      data: {
          ...logData,
          timestamp: new Date(log.timestamp),
          userId: userForLog ? userForLog.id : undefined
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

    