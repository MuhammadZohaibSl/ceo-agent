"use client";

/**
 * Outcome Recorder Component
 * Records the outcome of implementing a recommendation
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, TrendingUp, TrendingDown, Minus, XCircle } from "lucide-react";
import { recordOutcome } from "@/lib/api";
import type { OutcomeStatus } from "@/types/api";

interface OutcomeRecorderProps {
  contextId: string;
  onOutcomeSubmitted?: (status: OutcomeStatus) => void;
}

const outcomeOptions: { 
  value: OutcomeStatus; 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  description: string;
}[] = [
  { 
    value: "success", 
    label: "Success", 
    icon: TrendingUp, 
    color: "bg-green-600/20 text-green-400 border-green-600/50",
    description: "Fully achieved expected outcomes"
  },
  { 
    value: "partial_success", 
    label: "Partial", 
    icon: Minus, 
    color: "bg-amber-600/20 text-amber-400 border-amber-600/50",
    description: "Achieved some but not all goals"
  },
  { 
    value: "failure", 
    label: "Failure", 
    icon: TrendingDown, 
    color: "bg-red-600/20 text-red-400 border-red-600/50",
    description: "Did not achieve expected outcomes"
  },
  { 
    value: "abandoned", 
    label: "Abandoned", 
    icon: XCircle, 
    color: "bg-slate-600/20 text-slate-400 border-slate-600/50",
    description: "Implementation was stopped"
  },
];

export function OutcomeRecorder({ contextId, onOutcomeSubmitted }: OutcomeRecorderProps) {
  const [status, setStatus] = useState<OutcomeStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMetric = () => {
    setMetrics([...metrics, { key: "", value: "" }]);
  };

  const updateMetric = (index: number, field: "key" | "value", val: string) => {
    const updated = [...metrics];
    updated[index][field] = val;
    setMetrics(updated);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!status) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert metrics array to object
      const metricsObj: Record<string, string | number> = {};
      for (const m of metrics) {
        if (m.key.trim()) {
          const numVal = parseFloat(m.value);
          metricsObj[m.key.trim()] = isNaN(numVal) ? m.value : numVal;
        }
      }

      await recordOutcome({
        contextId,
        status,
        metrics: Object.keys(metricsObj).length > 0 ? metricsObj : undefined,
        notes: notes.trim() || undefined,
      });

      setIsSubmitted(true);
      onOutcomeSubmitted?.(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record outcome");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-green-900/20 border-green-700/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">Outcome recorded successfully!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Record Outcome</CardTitle>
        <CardDescription className="text-slate-400">
          How did implementing this recommendation turn out?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outcome Status Selection */}
        <div className="grid grid-cols-2 gap-2">
          {outcomeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  isSelected
                    ? option.color
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
                disabled={isSubmitting}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <p className="text-xs text-slate-500">{option.description}</p>
              </button>
            );
          })}
        </div>

        {/* Metrics */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">Metrics (optional)</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addMetric}
              className="text-xs text-slate-500"
              disabled={isSubmitting}
            >
              + Add Metric
            </Button>
          </div>
          <div className="space-y-2">
            {metrics.map((metric, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={metric.key}
                  onChange={(e) => updateMetric(index, "key", e.target.value)}
                  placeholder="Metric name"
                  className="bg-slate-800/50 border-slate-700 text-white text-sm flex-1"
                  disabled={isSubmitting}
                />
                <Input
                  value={metric.value}
                  onChange={(e) => updateMetric(index, "value", e.target.value)}
                  placeholder="Value"
                  className="bg-slate-800/50 border-slate-700 text-white text-sm w-24"
                  disabled={isSubmitting}
                />
                {metrics.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMetric(index)}
                    className="text-slate-500 hover:text-red-400 px-2"
                    disabled={isSubmitting}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? Any lessons learned?"
            className="bg-slate-800/50 border-slate-700 text-white min-h-[80px] text-sm"
            disabled={isSubmitting}
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!status || isSubmitting}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            "Record Outcome"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
