require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting system and banks seed...');

    // Singleton system record: id is fixed as "system" in Prisma schema.
    const system = await prisma.system.upsert({
        where: { id: 'system' },
        update: {
            timeRefund: 72,
            limitRefund: 3,
            comissionRate: '5.00',
            term: 'Refund allowed within 72 hours after purchase if less than 30 percent content is consumed.',
        },
        create: {
            id: 'system',
            timeRefund: 72,
            limitRefund: 3,
            comissionRate: '5.00',
            term: 'Refund allowed within 72 hours after purchase if less than 30 percent content is consumed.',
        },
    });

    console.log(`System seeded: ${system.id}`);

    const banksData = [
        {
            bankNumber: '9704220001122334',
            bankName: 'MBBank',
            recipient: 'KLTN Academy',
        },
        {
            bankNumber: '9704158877665544',
            bankName: 'VietinBank',
            recipient: 'KLTN Academy',
        },
        {
            bankNumber: '9704361234567890',
            bankName: 'Vietcombank',
            recipient: 'KLTN Academy',
        },
    ];

    for (const bank of banksData) {
        const existing = await prisma.bank.findFirst({
            where: {
                systemId: system.id,
                bankNumber: bank.bankNumber,
                isDeleted: false,
            },
        });

        if (!existing) {
            await prisma.bank.create({
                data: {
                    systemId: system.id,
                    bankNumber: bank.bankNumber,
                    bankName: bank.bankName,
                    recipient: bank.recipient,
                },
            });
            console.log(`Created bank: ${bank.bankName} - ${bank.bankNumber}`);
        } else {
            console.log(`Bank already exists: ${bank.bankName} - ${bank.bankNumber}`);
        }
    }

    console.log('Seed completed.');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
