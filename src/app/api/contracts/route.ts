
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ContractStatus } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function GET() {
    try {
        const contracts = await prisma.contract.findMany({
            include: {
                requisition: {
                    select: {
                        title: true
                    }
                },
                vendor: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        const now = new Date();
        const contractsWithStatus = contracts.map(c => {
            let status: ContractStatus = 'Draft';
            if (c.startDate && c.endDate) {
                if (now >= new Date(c.startDate) && now <= new Date(c.endDate)) {
                    status = 'Active';
                } else if (now > new Date(c.endDate)) {
                    status = 'Expired';
                }
            }
            return { ...c, status };
        });

        return NextResponse.json(contractsWithStatus);
    } catch (error) {
        console.error("Failed to fetch contracts:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to fetch contracts', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred while fetching contracts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { requisitionId, vendorId, startDate, endDate, userId } = body;

        const actor = users.find(u => u.id === userId);
        if (!actor) {
            return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
        }

        const newContract = await prisma.contract.create({
            data: {
                requisition: { connect: { id: requisitionId } },
                vendor: { connect: { id: vendorId } },
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'Draft',
            }
        });

        await prisma.auditLog.create({
            data: {
                user: { connect: { id: actor.id } },
                action: 'CREATE_CONTRACT',
                entity: 'Contract',
                entityId: newContract.id,
                details: `Created new draft contract ${newContract.contractNumber} for requisition ${requisitionId}.`,
            }
        });

        return NextResponse.json(newContract, { status: 201 });
    } catch (error) {
        console.error("Failed to create contract:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
