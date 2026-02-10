"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Save, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { StrategicBetCard } from "./strategic-bet-card";

interface StrategicBet {
  id: string;
  title: string;
  description: string;
  timeline: string;
  metrics: string[];
  riskLevel: "low" | "medium" | "high";
  status: string;
}

interface Vision {
  id: string;
  companyName: string;
  industry: string;
  timeHorizon: string;
  vision: string;
  mission: string;
  strategicBets: StrategicBet[];
  status: "draft" | "active" | "archived";
  coherenceScore: number;
  coherenceIssues: string[];
  createdAt: string;
  updatedAt: string;
}

interface VisionEditorProps {
  apiUrl?: string;
  onVisionSaved?: (vision: Vision) => void;
}

export function VisionEditor({ apiUrl = "http://localhost:3001", onVisionSaved }: VisionEditorProps) {
  const [vision, setVision] = useState<Vision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for generation
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("3-5 years");
  const [context, setContext] = useState("");
  const [strengths, setStrengths] = useState("");
  const [challenges, setChallenges] = useState("");

  // Edited vision state
  const [editedVision, setEditedVision] = useState("");
  const [editedMission, setEditedMission] = useState("");
  const [editedBets, setEditedBets] = useState<StrategicBet[]>([]);

  // Fetch current vision on mount
  useEffect(() => {
    fetchCurrentVision();
  }, []);

  const fetchCurrentVision = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/vision`);
      const data = await response.json();
      
      if (data.success && data.data.current) {
        const v = data.data.current;
        setVision(v);
        setEditedVision(v.vision);
        setEditedMission(v.mission);
        setEditedBets(v.strategicBets);
        setCompanyName(v.companyName);
        setIndustry(v.industry);
        setTimeHorizon(v.timeHorizon);
      }
    } catch (err) {
      console.error("Failed to fetch vision:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVision = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/api/vision/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industry,
          timeHorizon,
          context,
          existingStrengths: strengths.split(",").map(s => s.trim()).filter(Boolean),
          challenges: challenges.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const v = data.data;
        setVision(v);
        setEditedVision(v.vision);
        setEditedMission(v.mission);
        setEditedBets(v.strategicBets);
      } else {
        setError(data.error || "Failed to generate vision");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveVision = async () => {
    if (!vision) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/api/vision/${vision.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision: editedVision,
          mission: editedMission,
          strategicBets: editedBets,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVision(data.data);
        onVisionSaved?.(data.data);
      } else {
        setError(data.error || "Failed to save vision");
      }
    } catch (err) {
      setError("Failed to save vision");
    } finally {
      setIsSaving(false);
    }
  };

  const activateVision = async () => {
    if (!vision) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/vision/${vision.id}/activate`, {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVision(data.data);
      }
    } catch (err) {
      setError("Failed to activate vision");
    }
  };

  const updateBet = (index: number, updates: Partial<StrategicBet>) => {
    setEditedBets(bets => 
      bets.map((bet, i) => i === index ? { ...bet, ...updates } : bet)
    );
  };

  const removeBet = (index: number) => {
    setEditedBets(bets => bets.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      {!vision && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Generate Strategic Vision
            </CardTitle>
            <CardDescription className="text-slate-400">
              Provide context about your company to generate a strategic vision with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Industry</label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Technology, Healthcare"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Time Horizon</label>
              <Input
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                placeholder="e.g., 3-5 years"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Additional Context</label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe your market position, goals, etc."
                className="bg-slate-800/50 border-slate-700 text-white min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Strengths (comma-separated)</label>
                <Input
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Strong brand, talented team"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Challenges (comma-separated)</label>
                <Input
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="Market competition, scaling"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>

            <Button 
              onClick={generateVision}
              disabled={isGenerating || !companyName}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Vision...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Vision with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vision Editor */}
      {vision && (
        <>
          {/* Status Banner */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <Badge 
                variant={vision.status === "active" ? "default" : "secondary"}
                className={vision.status === "active" ? "bg-green-600" : ""}
              >
                {vision.status.toUpperCase()}
              </Badge>
              <span className="text-slate-400 text-sm">
                {vision.companyName} • {vision.industry}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                {vision.coherenceScore >= 80 ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-slate-400">
                  Coherence: {vision.coherenceScore}%
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchCurrentVision}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Vision Statement */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Vision Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedVision}
                onChange={(e) => setEditedVision(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white min-h-[100px] text-lg"
                placeholder="Enter your vision statement..."
              />
            </CardContent>
          </Card>

          {/* Mission Statement */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Mission Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedMission}
                onChange={(e) => setEditedMission(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white min-h-[80px]"
                placeholder="Enter your mission statement..."
              />
            </CardContent>
          </Card>

          {/* Strategic Bets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Strategic Bets
                <Badge variant="outline" className="ml-2 border-slate-600 text-slate-400">
                  {editedBets.length}/3 max
                </Badge>
              </h3>
            </div>
            
            <div className="grid gap-4">
              {editedBets.map((bet, index) => (
                <StrategicBetCard
                  key={bet.id}
                  bet={bet}
                  onUpdate={(updates) => updateBet(index, updates)}
                  onRemove={() => removeBet(index)}
                />
              ))}
            </div>
          </div>

          {/* Coherence Issues */}
          {vision.coherenceIssues && vision.coherenceIssues.length > 0 && (
            <Card className="bg-amber-900/20 border-amber-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Coherence Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-amber-300/80 space-y-1">
                  {vision.coherenceIssues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {vision.status !== "active" && (
              <Button variant="outline" onClick={activateVision}>
                Activate Vision
              </Button>
            )}
            <Button 
              onClick={saveVision}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
