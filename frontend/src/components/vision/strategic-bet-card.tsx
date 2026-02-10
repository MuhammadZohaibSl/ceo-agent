"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Clock, 
  Target,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

interface StrategicBet {
  id: string;
  title: string;
  description: string;
  timeline: string;
  metrics: string[];
  riskLevel: "low" | "medium" | "high";
  status: string;
}

interface StrategicBetCardProps {
  bet: StrategicBet;
  onUpdate: (updates: Partial<StrategicBet>) => void;
  onRemove: () => void;
}

const riskColors = {
  low: "bg-green-600/20 text-green-400 border-green-600/30",
  medium: "bg-amber-600/20 text-amber-400 border-amber-600/30",
  high: "bg-red-600/20 text-red-400 border-red-600/30",
};

const riskIcons = {
  low: <TrendingUp className="h-3 w-3" />,
  medium: <AlertTriangle className="h-3 w-3" />,
  high: <AlertTriangle className="h-3 w-3" />,
};

export function StrategicBetCard({ bet, onUpdate, onRemove }: StrategicBetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(bet.title);
  const [editedDescription, setEditedDescription] = useState(bet.description);
  const [editedTimeline, setEditedTimeline] = useState(bet.timeline);
  const [editedMetrics, setEditedMetrics] = useState(bet.metrics.join(", "));
  const [editedRisk, setEditedRisk] = useState<"low" | "medium" | "high">(bet.riskLevel);

  const handleSave = () => {
    onUpdate({
      title: editedTitle,
      description: editedDescription,
      timeline: editedTimeline,
      metrics: editedMetrics.split(",").map(m => m.trim()).filter(Boolean),
      riskLevel: editedRisk,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(bet.title);
    setEditedDescription(bet.description);
    setEditedTimeline(bet.timeline);
    setEditedMetrics(bet.metrics.join(", "));
    setEditedRisk(bet.riskLevel);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="bg-slate-900 border-slate-600 border-2 border-dashed">
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Title</label>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Strategic bet title"
            />
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
              placeholder="Describe this strategic bet"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Timeline</label>
              <Input
                value={editedTimeline}
                onChange={(e) => setEditedTimeline(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="e.g., 12-18 months"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Risk Level</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((risk) => (
                  <Button
                    key={risk}
                    variant="outline"
                    size="sm"
                    onClick={() => setEditedRisk(risk)}
                    className={`flex-1 capitalize ${
                      editedRisk === risk 
                        ? riskColors[risk] 
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    {risk}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Success Metrics (comma-separated)
            </label>
            <Input
              value={editedMetrics}
              onChange={(e) => setEditedMetrics(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Revenue +20%, Customer satisfaction +15%"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-500">
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-white">{bet.title}</h4>
              <Badge 
                variant="outline" 
                className={`text-xs ${riskColors[bet.riskLevel]}`}
              >
                {riskIcons[bet.riskLevel]}
                <span className="ml-1 capitalize">{bet.riskLevel} Risk</span>
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400">{bet.description}</p>

            {/* Info Row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="h-4 w-4" />
                <span>{bet.timeline}</span>
              </div>
            </div>

            {/* Metrics */}
            {bet.metrics && bet.metrics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bet.metrics.map((metric, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="text-xs border-slate-600 text-slate-300"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    {metric}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-400"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
