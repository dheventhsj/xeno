/**
 * Lookalike Engine — find statistically similar customers to a seed audience
 */
import { prisma } from "@xenopilot/database";

export type LookalikeResult = {
  seedSize: number;
  expandedSize: number;
  expansionFactor: number;
  similarity: number;
  customers: {
    id: string;
    name: string;
    score: number;
  }[];
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

function normalize(val: number, min: number, max: number): number {
  return max === min ? 0.5 : (val - min) / (max - min);
}

export async function findLookalikes(
  seedCustomerIds: string[],
  expansionFactor = 2.0,
  limit = 500
): Promise<LookalikeResult> {
  // Get seed customer features
  const seedCustomers = await prisma.customer.findMany({
    where: { id: { in: seedCustomerIds } },
    select: {
      id: true, totalSpend: true, orderCount: true, churnScore: true,
      ltvScore: true, engagementScore: true, purchaseProb: true
    }
  });

  if (seedCustomers.length === 0) {
    return { seedSize: 0, expandedSize: 0, expansionFactor, similarity: 0, customers: [] };
  }

  // Compute centroid of seed audience
  const centroid = [0, 0, 0, 0, 0, 0];
  for (const c of seedCustomers) {
    centroid[0] += c.totalSpend;
    centroid[1] += c.orderCount;
    centroid[2] += c.churnScore;
    centroid[3] += c.ltvScore;
    centroid[4] += c.engagementScore;
    centroid[5] += c.purchaseProb;
  }
  for (let i = 0; i < centroid.length; i++) centroid[i] /= seedCustomers.length;

  // Get candidate pool (exclude seed)
  const targetSize = Math.round(seedCustomers.length * expansionFactor);
  const candidates = await prisma.customer.findMany({
    where: { id: { notIn: seedCustomerIds } },
    take: Math.min(limit * 3, 5000),
    select: {
      id: true, name: true, totalSpend: true, orderCount: true,
      churnScore: true, ltvScore: true, engagementScore: true, purchaseProb: true
    }
  });

  // Find range for normalization
  const all = [...seedCustomers, ...candidates];
  const ranges = [
    { min: Math.min(...all.map(c => c.totalSpend)), max: Math.max(...all.map(c => c.totalSpend)) },
    { min: Math.min(...all.map(c => c.orderCount)), max: Math.max(...all.map(c => c.orderCount)) },
    { min: Math.min(...all.map(c => c.churnScore)), max: Math.max(...all.map(c => c.churnScore)) },
    { min: Math.min(...all.map(c => c.ltvScore)), max: Math.max(...all.map(c => c.ltvScore)) },
    { min: Math.min(...all.map(c => c.engagementScore)), max: Math.max(...all.map(c => c.engagementScore)) },
    { min: Math.min(...all.map(c => c.purchaseProb)), max: Math.max(...all.map(c => c.purchaseProb)) },
  ];

  const normCentroid = centroid.map((v, i) => normalize(v, ranges[i].min, ranges[i].max));

  // Score all candidates
  const scored = candidates.map(c => {
    const vec = [
      normalize(c.totalSpend, ranges[0].min, ranges[0].max),
      normalize(c.orderCount, ranges[1].min, ranges[1].max),
      normalize(c.churnScore, ranges[2].min, ranges[2].max),
      normalize(c.ltvScore, ranges[3].min, ranges[3].max),
      normalize(c.engagementScore, ranges[4].min, ranges[4].max),
      normalize(c.purchaseProb, ranges[5].min, ranges[5].max),
    ];
    return { id: c.id, name: c.name, score: Math.round(cosineSimilarity(normCentroid, vec) * 100) / 100 };
  });

  scored.sort((a, b) => b.score - a.score);
  const result = scored.slice(0, Math.min(targetSize, limit));
  const avgSimilarity = result.length > 0
    ? Math.round(result.reduce((s, c) => s + c.score, 0) / result.length * 100) / 100
    : 0;

  return {
    seedSize: seedCustomers.length,
    expandedSize: result.length,
    expansionFactor,
    similarity: avgSimilarity,
    customers: result
  };
}
