
import { PrismaClient } from '@prisma/client';
import { getInitialData } from '../src/lib/seed-data';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Clearing existing data...`);
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
  await prisma.role.deleteMany({});
  await prisma.department.deleteMany({});
  console.log('Existing data cleared.');

  console.log(`Start seeding ...`);

  const seedData = getInitialData();
  const allDepartments = seedData.departments;
  const allRoles = [
      { name: 'Requester', description: 'Can create purchase requisitions.' },
      { name: 'Approver', description: 'Can approve or reject requisitions.' },
      { name: 'Procurement Officer', description: 'Manages the RFQ and PO process.' },
      { name: 'Finance', description: 'Manages invoices and payments.' },
      { name: 'Admin', description: 'System administrator with all permissions.' },
      { name: 'Receiving', description: 'Manages goods receipt notes.' },
      { name: 'Vendor', description: 'External supplier of goods/services.' },
      { name: 'Committee Member', description: 'Scores and evaluates vendor quotations.' },
      { name: 'Committee', description: 'Manages evaluation committees.' },
  ];

  // Seed Roles
  for (const role of allRoles) {
      await prisma.role.create({ data: role });
  }
  console.log('Seeded roles.');

  // Seed Departments
  for (const department of seedData.departments) {
    await prisma.department.create({
      data: department,
    });
  }
  console.log('Seeded departments.');

  // Seed non-vendor users first
  for (const user of seedData.users.filter(u => u.role !== 'Vendor')) {
    const { committeeAssignments, departmentId, department, vendorId, password, managerId, ...userData } = user;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    await prisma.user.create({
      data: {
          ...userData,
          password: hashedPassword,
          role: { connect: { name: userData.role } },
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
      const { kycDocuments, userId, ...vendorData } = vendor; // Destructure userId out
      const vendorUser = seedData.users.find(u => u.id === userId);

      if (!vendorUser) {
          console.warn(`Skipping vendor ${vendor.name} because its user was not found.`);
          continue;
      }
      
      const hashedPassword = await bcrypt.hash(vendorUser.password || 'password123', 10);
      
      // Create user for the vendor first
      const createdUser = await prisma.user.create({
          data: {
              id: vendorUser.id,
              name: vendorUser.name,
              email: vendorUser.email,
              password: hashedPassword,
              approvalLimit: vendorUser.approvalLimit,
              role: { connect: { name: vendorUser.role } },
          }
      });
      
      // Then create the vendor and link it to the user
    const createdVendor = await prisma.vendor.create({
      data: {
          ...vendorData,
          userId: createdUser.id, // Explicitly set the foreign key
          kycStatus: vendorData.kycStatus.replace(/ /g, '_') as any,
          user: { connect: { id: createdUser.id } }
      },
    });

    // Now, update the user with the vendorId
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

  // Seed Requisitions
  for (const requisition of seedData.requisitions) {
      const { 
          items, 
          customQuestions, 
          evaluationCriteria, 
          quotations, 
          requesterId,
          approverId,
          currentApproverId,
          financialCommitteeMemberIds,
          technicalCommitteeMemberIds,
          department,
          departmentId,
          committeeMemberIds, // old field, remove it
          ...reqData 
      } = requisition;

      const departmentRecord = allDepartments.find(d => d.name === department);

      const createdRequisition = await prisma.purchaseRequisition.create({
          data: {
              ...reqData,
              status: reqData.status.replace(/ /g, '_') as any,
              urgency: reqData.urgency || 'Low',
              requester: { connect: { id: requesterId } },
              approver: approverId ? { connect: { id: approverId } } : undefined,
              currentApprover: currentApproverId ? { connect: { id: currentApproverId } } : undefined,
              department: departmentId ? { connect: { id: departmentId } } : undefined,
              financialCommitteeMembers: financialCommitteeMemberIds ? { connect: financialCommitteeMemberIds.map(id => ({ id })) } : undefined,
              technicalCommitteeMembers: technicalCommitteeMemberIds ? { connect: technicalCommitteeMemberIds.map(id => ({ id })) } : undefined,
              deadline: reqData.deadline ? new Date(reqData.deadline) : undefined,
              scoringDeadline: reqData.scoringDeadline ? new Date(reqData.scoringDeadline) : undefined,
              awardResponseDeadline: reqData.awardResponseDeadline ? new Date(reqData.awardResponseDeadline) : undefined,
          }
      });
      
      // Seed RequisitionItems
      if (items) {
          for (const item of items) {
              await prisma.requisitionItem.create({
                  data: {
                      ...item,
                      unitPrice: item.unitPrice || 0,
                      requisitionId: createdRequisition.id
                  }
              });
          }
      }

      // Seed CustomQuestions
      if (customQuestions) {
          for (const question of customQuestions) {
              await prisma.customQuestion.create({
                  data: {
                      ...question,
                      options: question.options || [],
                      requisitionId: createdRequisition.id,
                  }
              });
          }
      }

      // Seed EvaluationCriteria
      if (evaluationCriteria) {
          await prisma.evaluationCriteria.create({
              data: {
                  requisitionId: createdRequisition.id,
                  financialWeight: evaluationCriteria.financialWeight,
                  technicalWeight: evaluationCriteria.technicalWeight,
                  financialCriteria: {
                      create: evaluationCriteria.financialCriteria
                  },
                  technicalCriteria: {
                      create: evaluationCriteria.technicalCriteria
                  }
              }
          })
      }
  }
  console.log('Seeded requisitions and related items/questions/criteria.');

   // Seed Quotations
   for (const quote of seedData.quotations) {
       const { items, answers, scores, requisitionId, vendorId, ...quoteData } = quote;
       const createdQuote = await prisma.quotation.create({
           data: {
               ...quoteData,
               status: quoteData.status.replace(/_/g, '_') as any,
               deliveryDate: new Date(quoteData.deliveryDate),
               createdAt: new Date(quoteData.createdAt),
               vendor: { connect: { id: vendorId } },
               requisition: { connect: { id: requisitionId } },
           }
       });

       if (items) {
           for (const item of items) {
               await prisma.quoteItem.create({
                   data: {
                       ...item,
                       quotationId: createdQuote.id
                   }
               })
           }
       }

       if (answers) {
           for (const answer of answers) {
               await prisma.quoteAnswer.create({
                   data: {
                       ...answer,
                       quotationId: createdQuote.id
                   }
               })
           }
       }
   }
   console.log('Seeded quotations and related items/answers.');

   // Seed Purchase Orders
    for (const po of seedData.purchaseOrders) {
        const { items, receipts, invoices, vendor, ...poData } = po;
        const createdPO = await prisma.purchaseOrder.create({
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
                        requisitionItem: { connect: { id: item.requisitionItemId } }
                    })),
                },
            }
        });
    }
    console.log('Seeded purchase orders and related items.');
    
    // Seed Invoices
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
                await prisma.invoiceItem.create({
                    data: {
                        ...item,
                        invoiceId: createdInvoice.id,
                    }
                })
            }
        }
    }
    console.log('Seeded invoices and related items.');

    // Seed Goods Receipt Notes
    for (const grn of seedData.goodsReceipts) {
        const { items, ...grnData } = grn;
        const createdGrn = await prisma.goodsReceiptNote.create({
            data: {
                ...grnData,
                receivedDate: new Date(grnData.receivedDate),
            }
        });

        if (items) {
            for (const item of items) {
                await prisma.receiptItem.create({
                    data: {
                        ...item,
                        condition: item.condition.replace(/ /g, '_') as any,
                        goodsReceiptNoteId: createdGrn.id,
                    }
                })
            }
        }
    }
    console.log('Seeded goods receipts and related items.');


  // Seed Audit Logs
  for (const log of seedData.auditLogs) {
    const userForLog = seedData.users.find(u => u.name === log.user);
    // Exclude user and role from logData as they are not direct fields on the model
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
