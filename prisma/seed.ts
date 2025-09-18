
import { PrismaClient } from '@prisma/client';
import { getInitialData } from '../src/lib/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const seedData = getInitialData();

  // Seed Departments
  for (const department of seedData.departments) {
    await prisma.department.create({
      data: department,
    });
  }
  console.log('Seeded departments.');

  // Seed Users
  for (const user of seedData.users) {
    // Prisma doesn't like extra fields like committeeAssignments or direct foreign keys when using connect
    const { committeeAssignments, departmentId, department, ...userData } = user;
    await prisma.user.create({
      data: {
          ...userData,
          // @ts-ignore
          role: userData.role.replace(/ /g, '_'),
          department: user.departmentId ? { connect: { id: user.departmentId } } : undefined,
      },
    });
  }
  console.log('Seeded users.');

  // Seed Vendors
  for (const vendor of seedData.vendors) {
      const { kycDocuments, ...vendorData } = vendor;
    const createdVendor = await prisma.vendor.create({
      data: {
          ...vendorData,
          user: { connect: { id: vendor.userId } }
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
  console.log('Seeded vendors.');

  // Seed Requisitions
  for (const requisition of seedData.requisitions) {
      const { items, customQuestions, evaluationCriteria, quotations, ...reqData } = requisition;
      const createdRequisition = await prisma.purchaseRequisition.create({
          data: {
              ...reqData,
              requester: { connect: { id: reqData.requesterId } },
              approver: reqData.approverId ? { connect: { id: reqData.approverId } } : undefined,
              financialCommitteeMembers: { connect: reqData.financialCommitteeMemberIds?.map(id => ({ id })) },
              technicalCommitteeMembers: { connect: reqData.technicalCommitteeMemberIds?.map(id => ({ id })) },
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
          const createdCriteria = await prisma.evaluationCriteria.create({
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
       const { items, answers, scores, ...quoteData } = quote;
       const createdQuote = await prisma.quotation.create({
           data: {
               ...quoteData,
               deliveryDate: new Date(quoteData.deliveryDate),
               createdAt: new Date(quoteData.createdAt)
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
                createdAt: new Date(poData.createdAt),
                vendorId: po.vendor.id,
            }
        });

        if (items) {
            for (const item of items) {
                await prisma.pOItem.create({
                    data: {
                        ...item,
                        purchaseOrderId: createdPO.id,
                    }
                })
            }
        }
    }
    console.log('Seeded purchase orders and related items.');
    
    // Seed Invoices
    for (const invoice of seedData.invoices) {
        const { items, ...invoiceData } = invoice;
        const createdInvoice = await prisma.invoice.create({
            data: {
                ...invoiceData,
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
                        goodsReceiptNoteId: createdGrn.id,
                    }
                })
            }
        }
    }
    console.log('Seeded goods receipts and related items.');


  // Seed Audit Logs
  for (const log of seedData.auditLogs) {
    await prisma.auditLog.create({
      data: {
          ...log,
          // @ts-ignore
          role: log.role.replace(/ /g, '_'),
          timestamp: new Date(log.timestamp),
          userId: log.user === 'System' ? undefined : seedData.users.find(u => u.name === log.user)?.id
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
