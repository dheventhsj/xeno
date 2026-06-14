/**
 * Campaign Battle Simulator — compare all channels before launch
 */
import type { Channel } from "@xenopilot/database";
import { CHANNEL_RATES } from "@xenopilot/shared";
import { forecastCampaign } from "./forecast-engine";

export type ChannelBattleResult = {
  channel: Channel;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: { low: number; mid: number; high: number };
  roi: number;
  confidence: number;
  reasoning: string[];
  recommended: boolean;
};

export function simulateChannelBattle(
  audienceSize: number,
  avgOrderValue: number,
  engagementBoost = 1.0,
  preferredChannel?: Channel
): { results: ChannelBattleResult[]; winner: Channel; winnerConfidence: number; rationale: string } {
  const channels: Channel[] = ["WHATSAPP", "SMS", "EMAIL", "RCS"];
  const costPerSend: Record<Channel, number> = { WHATSAPP: 0.8, SMS: 0.3, EMAIL: 0.05, RCS: 0.6 };

  const results: ChannelBattleResult[] = channels.map(ch => {
    const forecast = forecastCampaign(audienceSize, ch, avgOrderValue, engagementBoost, 500);
    const cost = audienceSize * costPerSend[ch];
    const roi = cost > 0 ? Math.round(((forecast.revenue.mid - cost) / cost) * 100) / 100 : 0;
    const rates = CHANNEL_RATES[ch];

    const reasoning = [
      `${Math.round(forecast.openRate.mid * 100)}% expected open/read rate`,
      `${Math.round(forecast.conversionRate.mid * 100)}% conversion rate`,
      `₹${forecast.revenue.mid.toLocaleString("en-IN")} mid-case revenue`,
      roi > 1 ? `${roi.toFixed(1)}× ROI` : `${roi.toFixed(1)}× ROI (marginal)`
    ];

    if (ch === preferredChannel) reasoning.push("Matches audience channel preference");

    return {
      channel: ch,
      openRate: forecast.openRate.mid,
      clickRate: forecast.clickRate.mid,
      conversionRate: forecast.conversionRate.mid,
      revenue: forecast.revenue,
      roi,
      confidence: forecast.confidence * (ch === preferredChannel ? 1.08 : 1),
      reasoning,
      recommended: false
    };
  });

  results.sort((a, b) => b.revenue.mid - a.revenue.mid);
  const winner = results[0]!;
  winner.recommended = true;

  const runnerUp = results[1];
  let rationale = `${winner.channel} wins with ₹${winner.revenue.mid.toLocaleString("en-IN")} expected revenue and ${Math.round(winner.openRate * 100)}% open rate.`;
  if (runnerUp) {
    const lift = runnerUp.revenue.mid > 0
      ? ((winner.revenue.mid - runnerUp.revenue.mid) / runnerUp.revenue.mid * 100).toFixed(0)
      : "0";
    rationale += ` ${lift}% higher revenue than ${runnerUp.channel}.`;
  }

  return {
    results,
    winner: winner.channel,
    winnerConfidence: Math.min(0.98, winner.confidence),
    rationale
  };
}
