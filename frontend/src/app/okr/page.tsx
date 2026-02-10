import { OKRDashboard } from "@/components/okr/okr-dashboard";

export default function OKRPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Objectives & Key Results
          </h1>
          <p className="text-slate-400">
            Define, track, and achieve your strategic objectives
          </p>
        </div>
        
        <OKRDashboard />
      </div>
    </div>
  );
}
