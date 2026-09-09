require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const branchNames = [...Array.from({ length: 10 }, (_, i) => `Mazabuka Branch ${i + 1}`), 'Pemba Branch'];
  const branches = {};
  for (const name of branchNames) {
    const town = name.startsWith('Mazabuka') ? 'Mazabuka' : 'Pemba';
    branches[name] = await prisma.branch.upsert({ where: { name }, update: {}, create: { name, town } });
  }
  const mainBranch = branches['Mazabuka Branch 1'];
  const secondBranch = branches['Pemba Branch'];

  const adminHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@shamsia.co.zm' },
    update: {},
    create: { name: 'Shamsia Admin', position: 'Managing Director', email: 'admin@shamsia.co.zm', passwordHash: adminHash, role: 'ADMIN' },
  });

  const managerHash = await bcrypt.hash('Manager@123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@shamsia.co.zm' },
    update: {},
    create: {
      name: 'Operations Manager',
      position: 'Branch Operations Manager',
      email: 'manager@shamsia.co.zm',
      passwordHash: managerHash,
      role: 'MANAGER',
      branchId: mainBranch.id,
    },
  });

  const tellerHash = await bcrypt.hash('Teller@123', 10);
  await prisma.user.upsert({
    where: { email: 'teller@shamsia.co.zm' },
    update: {},
    create: {
      name: 'Front Desk Teller',
      position: 'Teller',
      email: 'teller@shamsia.co.zm',
      passwordHash: tellerHash,
      role: 'TELLER',
      branchId: mainBranch.id,
    },
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
    providers[p.code] = await prisma.provider.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  // Every branch gets its own master float account per provider.
  for (const branch of Object.values(branches)) {
    for (const provider of Object.values(providers)) {
      const existing = await prisma.floatAccount.findFirst({ where: { providerId: provider.id, branchId: branch.id, agentId: null } });
      if (!existing) {
        await prisma.floatAccount.create({ data: { providerId: provider.id, branchId: branch.id, agentId: null, balance: 50000 } });
      }
    }
  }

  const agentsData = [
    { name: 'Chilenje Market Agent', phoneNumber: '0977111222', location: 'Chilenje', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.02, providerCode: 'MTN', branch: mainBranch },
    { name: 'Kabwata Corner Shop', phoneNumber: '0966333444', location: 'Kabwata', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.018, providerCode: 'AIRTEL', branch: mainBranch },
    { name: 'Matero Trading Post', phoneNumber: '0955555666', location: 'Matero', agentType: 'MOBILE_MONEY_AGENT', commissionRate: 0.02, providerCode: 'ZAMTEL', branch: mainBranch },
    { name: 'Cairo Road Banking Agent', phoneNumber: '0977888999', location: 'Cairo Road', agentType: 'BANKING_AGENT', commissionRate: 0.01, providerCode: 'ZANACO', branch: secondBranch },
    { name: 'Levy Junction Agent', phoneNumber: '0966222111', location: 'Levy Junction', agentType: 'BANKING_AGENT', commissionRate: 0.012, providerCode: 'FNB', branch: secondBranch },
  ];

  for (const a of agentsData) {
    const provider = providers[a.providerCode];
    let agent = await prisma.agent.findFirst({ where: { phoneNumber: a.phoneNumber } });
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: a.name,
          phoneNumber: a.phoneNumber,
          location: a.location,
          agentType: a.agentType,
          commissionRate: a.commissionRate,
          providerId: provider.id,
          branchId: a.branch.id,
        },
      });
    }
    await prisma.floatAccount.upsert({
      where: { providerId_agentId_branchId: { providerId: provider.id, agentId: agent.id, branchId: a.branch.id } },
      update: {},
      create: { providerId: provider.id, agentId: agent.id, branchId: a.branch.id, balance: 3000 },
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
  console.log(`Branches: ${branchNames.length} (10 Mazabuka + 1 Pemba)`);
  console.log('Login with: admin@shamsia.co.zm / Admin@123 (ADMIN, all branches)');
  console.log('            manager@shamsia.co.zm / Manager@123 (MANAGER, Mazabuka Branch 1)');
  console.log('            teller@shamsia.co.zm / Teller@123 (TELLER, Mazabuka Branch 1)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
