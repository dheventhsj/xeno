/**
 * Forecast Engine — Monte Carlo simulation-based campaign performance forecasting
 */
import { CHANNEL_RATES } from "@xenopilot/shared";
import type { Channel } from "@xenopilot/database";

export type ForecastResult = {
  openRate: { low: number; mid: number; high: number };
  clickRate: { low: number; mid: number; high: number };
  conversionRate: { low: number; mid: number; high: number };
  revenue: { low: number; mid: number; high: number };
  confidence: number;
  simulations: number;
};

function jitter(base: number, variance: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
}

export function forecastCampaign(
  audienceSize: number,
  channel: Channel,
  avgOrderValue: number,
  engagementBoost = 1.0,
  simCount = 1000
): ForecastResult {
  const rates = CHANNEL_RATES[channel];
  const opens: number[] = [];
  const clicks: number[] = [];
  const conversions: number[] = [];
  const revenues: number[] = [];

  for (let i = 0; i < simCount; i++) {
    const delivered = Math.round(audienceSize * jitter(rates.delivered, 0.05));
    const opened = Math.round(delivered * jitter(rates.readOrOpen * engagementBoost, 0.15));
    const clicked = Math.round(opened * jitter(rates.click, 0.2));
    const converted = Math.round(clicked * jitter(rates.convert, 0.25));
    const rev = converted * jitter(avgOrderValue, 0.15);

    opens.push(delivered > 0 ? opened / delivered : 0);
    clicks.push(opened > 0 ? clicked / opened : 0);
    conversions.push(delivered > 0 ? converted / delivered : 0);
    revenues.push(rev);
  }

  const percentile = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  };

  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    openRate: { low: round3(percentile(opens, 0.1)), mid: round3(percentile(opens, 0.5)), high: round3(percentile(opens, 0.9)) },
    clickRate: { low: round3(percentile(clicks, 0.1)), mid: round3(percentile(clicks, 0.5)), high: round3(percentile(clicks, 0.9)) },
    conversionRate: { low: round3(percentile(conversions, 0.1)), mid: round3(percentile(conversions, 0.5)), high: round3(percentile(conversions, 0.9)) },
    revenue: { low: Math.round(percentile(revenues, 0.1)), mid: Math.round(percentile(revenues, 0.5)), high: Math.round(percentile(revenues, 0.9)) },
    confidence: 0.85,
    simulations: simCount
  };
}
