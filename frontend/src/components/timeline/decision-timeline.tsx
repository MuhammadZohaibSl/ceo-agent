"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Search, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

interface Decision {
  id: string;
  contextId: string;
  title: string;
  query: string;
  recommendation: {
    title: string;
    description: string;
    confidence: number;
  };
  outcome: "pending" | "approved" | "rejected" | "modified" | "expired";
  rationale: string;
  impactLevel: "low" | "medium" | "high" | "critical";
  createdAt: string;
  resolvedAt: string;
  resolvedBy: string;
  alternatives: any[];
  risks: any[];
  priority: string;
}

interface TimelineData {
  entries: Decision[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

interface TimelineStats {
  period: string;
  periodStart: string;
  total: number;
  byOutcome: Record<string, number>;
  byImpact: Record<string, number>;
  averageDecisionTime: number;
  approvalRate: number;
}

interface DecisionTimelineProps {
  apiUrl?: string;
}

const outcomeConfig = {
  pending: { label: "Pending", color: "bg-amber-600/20 text-amber-400", icon: Clock },
  approved: { label: "Approved", color: "bg-green-600/20 text-green-400", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-600/20 text-red-400", icon: XCircle },
  modified: { label: "Modified", color: "bg-blue-600/20 text-blue-400", icon: TrendingUp },
  expired: { label: "Expired", color: "bg-slate-600/20 text-slate-400", icon: Clock },
};

const impactConfig = {
  low: { label: "Low Impact", color: "text-slate-400" },
  medium: { label: "Medium Impact", color: "text-amber-400" },
  high: { label: "High Impact", color: "text-orange-400" },
  critical: { label: "Critical", color: "text-red-400" },
};

export function DecisionTimeline({ apiUrl = "http://localhost:3001" }: DecisionTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline();
    fetchStats();
  }, [outcomeFilter, searchQuery]);

  const fetchTimeline = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (outcomeFilter) params.append("outcome", outcomeFilter);
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await fetch(`${apiUrl}/api/timeline?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTimeline(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch timeline");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/timeline/stats?period=month`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    return formatDate(dateStr);
  };

  if (isLoading && !timeline) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-slate-400">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.approvalRate}%</p>
                  <p className="text-xs text-slate-400">Approval Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600/20 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.averageDecisionTime}h</p>
                  <p className="text-xs text-slate-400">Avg Decision Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.byOutcome?.pending ?? 0}
                  </p>
                  <p className="text-xs text-slate-400">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by rationale or title..."
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={outcomeFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setOutcomeFilter(null)}
          >
            All
          </Button>
          {Object.entries(outcomeConfig).map(([outcome, config]) => (
            <Button
              key={outcome}
              variant={outcomeFilter === outcome ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter(outcome)}
              className={outcomeFilter === outcome ? config.color.split(" ")[0] : ""}
            >
              <config.icon className="h-3 w-3 mr-1" />
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline Summary */}
      {timeline?.summary && (
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>Total: {timeline.summary.total}</span>
          <span className="text-green-400">✓ {timeline.summary.approved} approved</span>
          <span className="text-red-400">✗ {timeline.summary.rejected} rejected</span>
          <span className="text-amber-400">⏳ {timeline.summary.pending} pending</span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-700" />
        
        <div className="space-y-4">
          {timeline?.entries.map((decision) => {
            const outcome = outcomeConfig[decision.outcome] || outcomeConfig.pending;
            const impact = impactConfig[decision.impactLevel] || impactConfig.low;
            const OutcomeIcon = outcome.icon;
            const isExpanded = expandedId === decision.id;

            return (
              <div key={decision.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-2 top-4 w-6 h-6 rounded-full flex items-center justify-center ${outcome.color.split(" ")[0]}`}>
                  <OutcomeIcon className={`h-4 w-4 ${outcome.color.split(" ")[1]}`} />
                </div>

                <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${outcome.color} border-0 text-xs`}>
                            {outcome.label}
                          </Badge>
                          <span className={`text-xs ${impact.color}`}>
                            {impact.label}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-white">{decision.title}</h4>
                        
                        {decision.recommendation?.description && (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {decision.recommendation.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">
                            {formatRelativeTime(decision.createdAt)}
                          </div>
                          {decision.resolvedBy && (
                            <div className="text-xs text-slate-600">
                              by {decision.resolvedBy}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                        {/* Original Query */}
                        {decision.query && (
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Original Query</label>
                            <p className="text-sm text-slate-300 mt-1">{decision.query}</p>
                          </div>
                        )}

                        {/* Rationale */}
                        {decision.rationale && (
                          <div>
                            <label className="text-xs text-slate-500 font-medium">
                              {decision.outcome === "rejected" ? "Rejection Reason" : "Rationale"}
                            </label>
                            <p className="text-sm text-slate-300 mt-1">{decision.rationale}</p>
                          </div>
                        )}

                        {/* Recommendation Details */}
                        {decision.recommendation && (
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <label className="text-xs text-slate-500 font-medium">Recommendation</label>
                            <p className="text-sm text-white font-medium mt-1">
                              {decision.recommendation.title}
                            </p>
                            {decision.recommendation.confidence && (
                              <p className="text-xs text-slate-400 mt-1">
                                Confidence: {Math.round(decision.recommendation.confidence * 100)}%
                              </p>
                            )}
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {formatDate(decision.createdAt)}
                          </span>
                          {decision.resolvedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Resolved: {formatDate(decision.resolvedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {timeline?.entries.length === 0 && (
        <Card className="bg-slate-900 border-slate-700 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-400">No decisions yet</h3>
            <p className="text-sm text-slate-500">
              Decisions will appear here as they are made
            </p>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {timeline?.pagination.hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => {/* TODO: Load more */}}>
            Load More
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400">
          {error}
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-4"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
