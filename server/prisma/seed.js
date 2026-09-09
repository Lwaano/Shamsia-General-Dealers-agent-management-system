require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shamsia.co.zm' },
    update: {},
    create: { name: 'Shamsia Admin', email: 'admin@shamsia.co.zm', passwordHash, role: 'ADMIN' },
  });

  const managerHash = await bcrypt.hash('Manager@123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@shamsia.co.zm' },
    update: {},
    create: { name: 'Operations Manager', email: 'manager@shamsia.co.zm', passwordHash: managerHash, role: 'MANAGER' },
  });

  const tellerHash = await bcrypt.hash('Teller@123', 10);
  await prisma.user.upsert({
    where: { email: 'teller@shamsia.co.zm' },
    update: {},
    create: { name: 'Front Desk Teller', email: 'teller@shamsia.co.zm', passwordHash: tellerHash, role: 'TELLER' },
  });

  const providersData = [
    { name: 'MTN Mobile Money', code: 'MTN', type: 'MOBILE_MONEY' },
    { name: 'Airtel Money', code: 'AIRTEL', type: 'MOBILE_MONEY' },
    { name: 'Zamtel Kwacha', code: 'ZAMTEL', type: 'MOBILE_MONEY' },
    { name: 'Zanaco Bank', code: 'ZANACO', type: 'BANK' },
    { name: 'FNB Zambia', code: 'FNB', type: 'BANK' },
  ];

  const providers = {};
  for (const p of providersData) {
    const provider = await prisma.provider.upsert({ where: { code: p.code }, update: {}, create: p });
    providers[p.code] = provider;
    const existingMaster = await prisma.floatAccount.findFirst({ where: { providerId: provider.id, agentId: null } });
    if (!existingMaster) {
      await prisma.floatAccount.create({ data: { providerId: provider.id, agentId: null, balance: 50000 } });
    }
  }

  const agentsData = [
    { name: 'Chilenje Market Agent', phoneNumber: '0977111222', location: 'Chilenje', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.02, providerCode: 'MTN' },
    { name: 'Kabwata Corner Shop', phoneNumber: '0966333444', location: 'Kabwata', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.018, providerCode: 'AIRTEL' },
    { name: 'Matero Trading Post', phoneNumber: '0955555666', location: 'Matero', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.02, providerCode: 'ZAMTEL' },
    { name: 'Cairo Road Banking Agent', phoneNumber: '0977888999', location: 'Cairo Road', agentType: 'BANKING_AGENT', commissionRate: 0.01, providerCode: 'ZANACO' },
    { name: 'Levy Junction Agent', phoneNumber: '0966222111', location: 'Levy Junction', agentType: 'BANKING_AGENT', commissionRate: 0.012, providerCode: 'FNB' },
  ];

  for (const a of agentsData) {
    const provider = providers[a.providerCode];
    const existing = await prisma.agent.findFirst({ where: { phoneNumber: a.phoneNumber } });
    let agent = existing;
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: a.name,
          phoneNumber: a.phoneNumber,
          location: a.location,
          agentType: a.agentType,
          commissionRate: a.commissionRate,
          providerId: provider.id,
        },
      });
    }
    await prisma.floatAccount.upsert({
      where: { providerId_agentId: { providerId: provider.id, agentId: agent.id } },
      update: {},
      create: { providerId: provider.id, agentId: agent.id, balance: 3000 },
    });
  }

  const categories = ['Airtime & Data', 'Stationery', 'Beverages', 'Electronics'];
  const categoryRecords = {};
  for (const name of categories) {
    categoryRecords[name] = await prisma.inventoryCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const itemsData = [
    { name: 'MTN Scratch Card 20', sku: 'MTN-SC-20', unitCost: 18, unitPrice: 20, quantityOnHand: 100, reorderLevel: 20, category: 'Airtime & Data' },
    { name: 'Airtel Scratch Card 50', sku: 'AIRTEL-SC-50', unitCost: 46, unitPrice: 50, quantityOnHand: 80, reorderLevel: 15, category: 'Airtime & Data' },
    { name: 'A4 Printing Paper (Ream)', sku: 'STN-A4-01', unitCost: 85, unitPrice: 110, quantityOnHand: 25, reorderLevel: 5, category: 'Stationery' },
    { name: 'Ballpoint Pens (Box of 50)', sku: 'STN-PEN-50', unitCost: 60, unitPrice: 85, quantityOnHand: 12, reorderLevel: 5, category: 'Stationery' },
    { name: 'Coca-Cola 500ml', sku: 'BEV-COKE-500', unitCost: 8, unitPrice: 12, quantityOnHand: 4, reorderLevel: 10, category: 'Beverages' },
    { name: 'USB Flash Drive 32GB', sku: 'ELEC-USB-32', unitCost: 90, unitPrice: 130, quantityOnHand: 15, reorderLevel: 5, category: 'Electronics' },
  ];

  for (const item of itemsData) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        name: item.name,
        sku: item.sku,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        categoryId: categoryRecords[item.category].id,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Login with: admin@shamsia.co.zm / Admin@123 (ADMIN)');
  console.log('            manager@shamsia.co.zm / Manager@123 (MANAGER)');
  console.log('            teller@shamsia.co.zm / Teller@123 (TELLER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
