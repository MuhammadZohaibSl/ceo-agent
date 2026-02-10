"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Target } from "lucide-react";
import type { OKR, KeyResult } from "./okr-dashboard";

interface OKRFormProps {
  okr?: OKR;
  onSubmit: (data: Partial<OKR>) => void;
  onCancel: () => void;
}

const defaultKeyResult: Omit<KeyResult, "id"> = {
  title: "",
  description: "",
  type: "percentage",
  startValue: 0,
  targetValue: 100,
  currentValue: 0,
  unit: "%",
  weight: 1,
  status: "draft",
};

export function OKRForm({ okr, onSubmit, onCancel }: OKRFormProps) {
  const [title, setTitle] = useState(okr?.title ?? "");
  const [description, setDescription] = useState(okr?.description ?? "");
  const [owner, setOwner] = useState(okr?.owner ?? "");
  const [timeframe, setTimeframe] = useState(okr?.timeframe ?? "");
  const [keyResults, setKeyResults] = useState<Omit<KeyResult, "id">[]>(
    okr?.keyResults.map(kr => ({
      title: kr.title,
      description: kr.description,
      type: kr.type,
      startValue: kr.startValue,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit,
      weight: kr.weight,
      status: kr.status,
    })) ?? [{ ...defaultKeyResult }]
  );

  const addKeyResult = () => {
    setKeyResults([...keyResults, { ...defaultKeyResult }]);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const updateKeyResult = (index: number, field: string, value: any) => {
    setKeyResults(keyResults.map((kr, i) => 
      i === index ? { ...kr, [field]: value } : kr
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      owner,
      timeframe,
      keyResults: keyResults as KeyResult[],
    });
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          {okr ? "Edit OKR" : "Create New OKR"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Objective Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to achieve?"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this objective..."
                className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Owner</label>
                <Input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Who is responsible?"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Timeframe</label>
                <Input
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  placeholder="e.g., Q1 2026"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-white">Key Results</label>
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                {keyResults.length} KR{keyResults.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-4">
              {keyResults.map((kr, index) => (
                <div 
                  key={index} 
                  className="bg-slate-800/50 rounded-lg p-4 relative group"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400"
                    onClick={() => removeKeyResult(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        Key Result {index + 1}
                      </label>
                      <Input
                        value={kr.title}
                        onChange={(e) => updateKeyResult(index, "title", e.target.value)}
                        placeholder="How will you measure success?"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Type</label>
                        <select
                          value={kr.type}
                          onChange={(e) => {
                            updateKeyResult(index, "type", e.target.value);
                            if (e.target.value === "percentage") {
                              updateKeyResult(index, "unit", "%");
                              updateKeyResult(index, "targetValue", 100);
                            } else if (e.target.value === "currency") {
                              updateKeyResult(index, "unit", "$");
                            } else if (e.target.value === "binary") {
                              updateKeyResult(index, "unit", "");
                              updateKeyResult(index, "targetValue", 1);
                            }
                          }}
                          className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="binary">Yes/No</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Start</label>
                        <Input
                          type="number"
                          value={kr.startValue}
                          onChange={(e) => updateKeyResult(index, "startValue", Number(e.target.value))}
                          className="bg-slate-900 border-slate-700 text-white"
                          disabled={kr.type === "binary"}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Target</label>
                        <Input
                          type="number"
                          value={kr.targetValue}
                          onChange={(e) => updateKeyResult(index, "targetValue", Number(e.target.value))}
                          className="bg-slate-900 border-slate-700 text-white"
                          disabled={kr.type === "binary"}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Unit</label>
                        <Input
                          value={kr.unit}
                          onChange={(e) => updateKeyResult(index, "unit", e.target.value)}
                          placeholder="e.g., %, $, users"
                          className="bg-slate-900 border-slate-700 text-white"
                          disabled={kr.type === "binary"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addKeyResult}
                className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Key Result
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-500"
              disabled={!title}
            >
              {okr ? "Save Changes" : "Create OKR"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
