"use client";

/**
 * Feedback Panel Component
 * Main container for all feedback functionality
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, Target, History, ChevronDown, ChevronUp } from "lucide-react";
import { RatingPanel } from "./rating-panel";
import { OutcomeRecorder } from "./outcome-recorder";

interface FeedbackPanelProps {
  contextId: string;
  compact?: boolean;
}

type FeedbackTab = "rating" | "outcome" | null;

export function FeedbackPanel({ contextId, compact = false }: FeedbackPanelProps) {
  const [activeTab, setActiveTab] = useState<FeedbackTab>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [completedFeedback, setCompletedFeedback] = useState<{
    rating?: boolean;
    outcome?: boolean;
  }>({});

  const toggleTab = (tab: FeedbackTab) => {
    setActiveTab(activeTab === tab ? null : tab);
    if (!isExpanded) setIsExpanded(true);
  };

  const handleRatingSubmitted = () => {
    setCompletedFeedback((prev) => ({ ...prev, rating: true }));
    setActiveTab(null);
  };

  const handleOutcomeSubmitted = () => {
    setCompletedFeedback((prev) => ({ ...prev, outcome: true }));
    setActiveTab(null);
  };

  if (compact && !isExpanded) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Provide Feedback</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-slate-400"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            Feedback
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feedback Type Buttons */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "rating" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTab("rating")}
            className={`flex-1 ${
              completedFeedback.rating
                ? "bg-green-600/20 border-green-600/50 text-green-400"
                : ""
            }`}
            disabled={completedFeedback.rating}
          >
            <Star className="h-4 w-4 mr-1" />
            {completedFeedback.rating ? "Rated" : "Rate"}
          </Button>
          <Button
            variant={activeTab === "outcome" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTab("outcome")}
            className={`flex-1 ${
              completedFeedback.outcome
                ? "bg-green-600/20 border-green-600/50 text-green-400"
                : ""
            }`}
            disabled={completedFeedback.outcome}
          >
            <Target className="h-4 w-4 mr-1" />
            {completedFeedback.outcome ? "Recorded" : "Record Outcome"}
          </Button>
        </div>

        {/* Active Panel */}
        {activeTab === "rating" && (
          <RatingPanel
            contextId={contextId}
            onRatingSubmitted={handleRatingSubmitted}
          />
        )}

        {activeTab === "outcome" && (
          <OutcomeRecorder
            contextId={contextId}
            onOutcomeSubmitted={handleOutcomeSubmitted}
          />
        )}

        {/* Completion Status */}
        {(completedFeedback.rating || completedFeedback.outcome) && !activeTab && (
          <div className="flex flex-wrap gap-2 pt-2">
            {completedFeedback.rating && (
              <Badge variant="outline" className="bg-green-600/10 border-green-600/30 text-green-400">
                ✓ Rating submitted
              </Badge>
            )}
            {completedFeedback.outcome && (
              <Badge variant="outline" className="bg-green-600/10 border-green-600/30 text-green-400">
                ✓ Outcome recorded
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
