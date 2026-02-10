"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2, 
  Clock,
  User,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import type { OKR, KeyResult } from "./okr-dashboard";

interface OKRCardProps {
  okr: OKR;
  onEdit: () => void;
  onDelete: () => void;
  onProgressUpdate: (okrId: string, keyResultId: string, currentValue: number) => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", color: "text-slate-400", bgColor: "bg-slate-600/20", icon: Target },
  active: { label: "Active", color: "text-blue-400", bgColor: "bg-blue-600/20", icon: TrendingUp },
  at_risk: { label: "At Risk", color: "text-amber-400", bgColor: "bg-amber-600/20", icon: AlertTriangle },
  on_track: { label: "On Track", color: "text-green-400", bgColor: "bg-green-600/20", icon: TrendingUp },
  completed: { label: "Completed", color: "text-emerald-400", bgColor: "bg-emerald-600/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-red-400", bgColor: "bg-red-600/20", icon: Target },
};

export function OKRCard({ okr, onEdit, onDelete, onProgressUpdate }: OKRCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingKR, setEditingKR] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const status = statusConfig[okr.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const handleProgressSave = (kr: KeyResult) => {
    onProgressUpdate(okr.id, kr.id, editValue);
    setEditingKR(null);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return "bg-green-500";
    if (progress >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const calculateKRProgress = (kr: KeyResult) => {
    if (kr.type === "binary") {
      return kr.currentValue ? 100 : 0;
    }
    const range = kr.targetValue - kr.startValue;
    if (range === 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((kr.currentValue - kr.startValue) / range) * 100)));
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
      <CardContent className="p-0">
        {/* Header */}
        <div 
          className="p-4 cursor-pointer flex items-start justify-between gap-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={`${status.bgColor} ${status.color} border-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <span className="text-xs text-slate-500">{okr.timeframe}</span>
            </div>
            
            <h3 className="font-semibold text-white text-lg mb-1">{okr.title}</h3>
            
            {okr.description && (
              <p className="text-sm text-slate-400 line-clamp-2">{okr.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {okr.owner}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {okr.keyResults.length} Key Results
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Progress Circle */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-700"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - okr.progress / 100)}`}
                  strokeLinecap="round"
                  className={`${okr.progress >= 70 ? "text-green-500" : okr.progress >= 40 ? "text-amber-500" : "text-blue-500"} transition-all duration-500`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{okr.progress}%</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded Content - Key Results */}
        {isExpanded && (
          <div className="border-t border-slate-700">
            <div className="p-4 space-y-3">
              {okr.keyResults.map((kr) => {
                const krProgress = calculateKRProgress(kr);
                const isEditing = editingKR === kr.id;

                return (
                  <div key={kr.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{kr.title}</p>
                        {kr.description && (
                          <p className="text-xs text-slate-500">{kr.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-20 h-8 text-sm bg-slate-900 border-slate-600"
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleProgressSave(kr)}
                              className="h-8 text-green-400"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingKR(kr.id);
                              setEditValue(kr.currentValue);
                            }}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            {kr.currentValue} / {kr.targetValue} {kr.unit}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={krProgress} 
                        className="flex-1 h-2 bg-slate-700"
                      />
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {krProgress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="text-slate-400 hover:text-white"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
