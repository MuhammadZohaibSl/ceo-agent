import { DecisionTimeline } from "@/components/timeline/decision-timeline";

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Decision Timeline
          </h1>
          <p className="text-slate-400">
            Track and review all strategic decisions and their outcomes
          </p>
        </div>
        
        <DecisionTimeline />
      </div>
    </div>
  );
}
