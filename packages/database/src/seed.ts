import { prisma, Channel } from "./index";

const FIRST = ["Aarav", "Diya", "Ananya", "Kabir", "Myra", "Vihaan", "Kiara", "Arjun", "Sara", "Neel", "Priya", "Rohan", "Ishaan", "Aisha", "Advait", "Zara", "Reyansh", "Tara", "Vivaan", "Meera"];
const LAST = ["Sharma", "Verma", "Iyer", "Reddy", "Gupta", "Patel", "Khan", "Bose", "Joshi", "Nair", "Mehta", "Rao", "Singh", "Das", "Malik"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Lucknow"];
const CATEGORIES = ["Skincare", "Beauty", "Fashion", "Coffee", "Electronics", "Fitness"];
const CHANNELS: Channel[] = ["WHATSAPP", "SMS", "EMAIL", "RCS"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type Archetype = "vip" | "loyal" | "regular" | "dormant" | "at_risk" | "new" | "seasonal";

function getArchetype(): Archetype {
  const r = Math.random();
  if (r < 0.08) return "vip";
  if (r < 0.20) return "loyal";
  if (r < 0.38) return "regular";
  if (r < 0.55) return "dormant";
  if (r < 0.70) return "at_risk";
  if (r < 0.85) return "new";
  return "seasonal";
}

function archetypeParams(arch: Archetype) {
  switch (arch) {
    case "vip":
      return { spend: [25000, 120000], orders: [12, 40], days: [1, 10], engagement: [0.8, 1.0] };
    case "loyal":
      return { spend: [10000, 35000], orders: [6, 18], days: [3, 25], engagement: [0.6, 0.85] };
    case "regular":
      return { spend: [3000, 12000], orders: [3, 10], days: [10, 50], engagement: [0.35, 0.6] };
    case "dormant":
      return { spend: [1000, 8000], orders: [2, 6], days: [60, 200], engagement: [0.05, 0.25] };
    case "at_risk":
      return { spend: [5000, 20000], orders: [4, 12], days: [30, 90], engagement: [0.15, 0.4] };
    case "new":
      return { spend: [200, 3000], orders: [1, 3], days: [1, 15], engagement: [0.3, 0.7] };
    case "seasonal":
      return { spend: [2000, 15000], orders: [2, 8], days: [20, 120], engagement: [0.2, 0.55] };
  }
}

function calcScores(totalSpend: number, orderCount: number, daysSince: number, engagement: number) {
  const ltv = totalSpend * (1 + orderCount * 0.05);
  const churn = Math.min(0.95, Math.max(0.05, (daysSince / 180) * 0.7 + (1 - engagement) * 0.3));
  const purchaseProb = Math.min(0.95, Math.max(0.05, engagement * 0.6 + (orderCount > 3 ? 0.2 : 0) + (daysSince < 15 ? 0.15 : 0)));
  return { ltv: Math.round(ltv), churn: Math.round(churn * 100) / 100, purchaseProb: Math.round(purchaseProb * 100) / 100 };
}

export async function seedDatabase(customerCount = 5000) {
  const count = Math.min(customerCount, 100000);

  // Clear in correct order
  await prisma.auditLog.deleteMany();
  await prisma.customerTimeline.deleteMany();
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaignAnalytics.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.agentSession.deleteMany();
  await prisma.customer.deleteMany();

  const now = Date.now();
  const DAY = 86400000;
  const batchSize = 500;

  // Create customers in batches
  for (let b = 0; b < count; b += batchSize) {
    const batch = [];
    for (let i = b; i < Math.min(b + batchSize, count); i++) {
      const arch = getArchetype();
      const p = archetypeParams(arch);
      const totalSpend = rand(p.spend[0], p.spend[1]);
      const orderCount = rand(p.orders[0], p.orders[1]);
      const daysSince = rand(p.days[0], p.days[1]);
      const engagement = p.engagement[0] + Math.random() * (p.engagement[1] - p.engagement[0]);
      const scores = calcScores(totalSpend, orderCount, daysSince, engagement);
      const first = pick(FIRST);
      const last = pick(LAST);
      const avgOrder = orderCount > 0 ? Math.round(totalSpend / orderCount) : 0;
      batch.push({
        name: `${first} ${last}`,
        email: `${first}.${last}.${i}@demo.xenopilot.io`.toLowerCase(),
        phone: `+9198${rand(10000000, 99999999)}`,
        city: pick(CITIES),
        preferredCategory: pick(CATEGORIES),
        preferredChannel: pick(CHANNELS),
        totalSpend,
        orderCount,
        lastOrderDate: new Date(now - daysSince * DAY),
        churnScore: scores.churn,
        ltvScore: scores.ltv,
        engagementScore: Math.round(engagement * 100),
        purchaseProb: scores.purchaseProb,
        avgOrderValue: avgOrder,
        daysSinceOrder: daysSince,
      });
    }
    await prisma.customer.createMany({ data: batch });
    if (b % 2000 === 0 && b > 0) console.log(`  Seeded ${b} customers...`);
  }

  // Create orders
  const customers = await prisma.customer.findMany({
    select: { id: true, orderCount: true, preferredCategory: true, totalSpend: true }
  });
  const orderBatch: { customerId: string; amount: number; category: string; createdAt: Date }[] = [];
  for (const c of customers) {
    const n = Math.max(c.orderCount, rand(1, 5));
    for (let k = 0; k < n; k++) {
      orderBatch.push({
        customerId: c.id,
        amount: rand(200, Math.max(500, Math.round(c.totalSpend / Math.max(1, c.orderCount) * 1.5))),
        category: k === 0 ? c.preferredCategory : pick(CATEGORIES),
        createdAt: new Date(now - rand(1, 365) * DAY)
      });
    }
    if (orderBatch.length >= 5000) {
      await prisma.order.createMany({ data: orderBatch.splice(0, orderBatch.length) });
    }
  }
  if (orderBatch.length) await prisma.order.createMany({ data: orderBatch });

  // Create timeline events from orders
  const timelineBatch: { customerId: string; eventType: string; title: string; detail: string; createdAt: Date }[] = [];
  const recentCustomers = await prisma.customer.findMany({
    take: 1000,
    orderBy: { lastOrderDate: "desc" },
    select: { id: true, name: true, preferredCategory: true, lastOrderDate: true, totalSpend: true }
  });
  for (const c of recentCustomers) {
    timelineBatch.push({
      customerId: c.id,
      eventType: "PURCHASE",
      title: `Purchased ${c.preferredCategory}`,
      detail: `Order worth ₹${Math.round(c.totalSpend / 3).toLocaleString("en-IN")}`,
      createdAt: c.lastOrderDate ?? new Date()
    });
    if (timelineBatch.length >= 5000) {
      await prisma.customerTimeline.createMany({ data: timelineBatch.splice(0, timelineBatch.length) });
    }
  }
  if (timelineBatch.length) await prisma.customerTimeline.createMany({ data: timelineBatch });

  const orderTotal = await prisma.order.count();
  console.log(`Seed complete: ${count} customers, ${orderTotal} orders`);
  return { customers: count, orders: orderTotal };
}
