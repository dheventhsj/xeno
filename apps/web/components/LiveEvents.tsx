"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "../lib/socket";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Counter } from "./Motion";

type EventItem = {
  campaignId: string;
  customerId: string;
  messageId?: string;
  eventType: string;
  timestamp: string;
};

const EVENT_STYLE: Record<string, { bg: string; dot: string }> = {
  sent: { bg: "from-sky-500/20 to-cyan-500/10 border-sky-400/30", dot: "bg-sky-400" },
  delivered: { bg: "from-violet-500/20 to-purple-500/10 border-violet-400/30", dot: "bg-violet-400" },
  failed: { bg: "from-red-500/20 to-rose-500/10 border-red-400/30", dot: "bg-red-400" },
  opened: { bg: "from-fuchsia-500/20 to-pink-500/10 border-fuchsia-400/30", dot: "bg-fuchsia-400" },
  clicked: { bg: "from-amber-500/20 to-orange-500/10 border-amber-400/30", dot: "bg-amber-400" },
  purchased: { bg: "from-emerald-500/20 to-lime-500/10 border-emerald-400/30", dot: "bg-emerald-400" }
};

const TOTAL_KEYS = ["sent", "delivered", "failed", "opened", "clicked", "purchased"] as const;

export function LiveEvents({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of events) t[e.eventType] = (t[e.eventType] ?? 0) + 1;
    return t;
  }, [events]);

  useEffect(() => {
    setEvents([]);
    const s = getSocket();
    s.emit("join:campaign", campaignId);
    const onEvt = (evt: EventItem) => {
      if (evt.campaignId !== campaignId) return;
      setEvents((prev) => [evt, ...prev].slice(0, 200));
    };
    s.on("campaign:event", onEvt);
    return () => {
      s.off("campaign:event", onEvt);
    };
  }, [campaignId]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="grad-violet">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-80 flex items-center gap-2">
            <span className="live-dot" /> Event stream
          </div>
          <Button onClick={() => setEvents([])} className="from-white/10 to-white/5 border-white/20 text-sm py-1">
            Clear
          </Button>
        </div>
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((e, i) => {
              const style = EVENT_STYLE[e.eventType] ?? EVENT_STYLE.sent;
              return (
                <motion.div
                  key={`${e.timestamp}-${e.customerId}-${i}`}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`p-3 rounded-xl bg-gradient-to-r ${style.bg} border`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <div className="font-semibold capitalize">{e.eventType}</div>
                    <div className="text-xs opacity-60 ml-auto">{new Date(e.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-xs opacity-70 mt-1 truncate">customer {e.customerId.slice(-8)}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {events.length === 0 && (
            <div className="opacity-60 text-sm py-8 text-center">Waiting for live events… launch a campaign or pick a running one.</div>
          )}
        </div>
      </Card>

      <Card className="grad-sky">
        <div className="text-sm opacity-80 mb-3">Live totals</div>
        <div className="grid grid-cols-3 gap-3">
          {TOTAL_KEYS.map((k) => {
            const style = EVENT_STYLE[k];
            return (
              <motion.div
                key={k}
                layout
                className={`p-3 rounded-xl bg-gradient-to-br ${style.bg} border text-center`}
              >
                <div className="text-xs opacity-70 capitalize">{k}</div>
                <div className="text-2xl font-bold">
                  <Counter value={totals[k] ?? 0} duration={400} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
