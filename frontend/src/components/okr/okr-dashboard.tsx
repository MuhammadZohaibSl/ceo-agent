"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Plus, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Filter
} from "lucide-react";
import { OKRCard } from "./okr-card";
import { OKRForm } from "./okr-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export interface KeyResult {
  id: string;
  title: string;
  description: string;
  type: "percentage" | "number" | "currency" | "binary";
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  status: string;
}

export interface OKR {
  id: string;
  title: string;
  description: string;
  owner: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  status: "draft" | "active" | "at_risk" | "on_track" | "completed" | "cancelled";
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface OKRStats {
  total: number;
  byStatus: Record<string, number>;
  averageProgress: number;
  totalKeyResults: number;
  completedKeyResults: number;
}

interface OKRDashboardProps {
  apiUrl?: string;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-600", icon: Target },
  active: { label: "Active", color: "bg-blue-600", icon: TrendingUp },
  at_risk: { label: "At Risk", color: "bg-amber-600", icon: AlertTriangle },
  on_track: { label: "On Track", color: "bg-green-600", icon: TrendingUp },
  completed: { label: "Completed", color: "bg-emerald-600", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-600/50", icon: Target },
};

export function OKRDashboard({ apiUrl = "http://localhost:3001" }: OKRDashboardProps) {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [stats, setStats] = useState<OKRStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOkr, setEditingOkr] = useState<OKR | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchOKRs();
  }, [statusFilter]);

  const fetchOKRs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      
      const response = await fetch(`${apiUrl}/api/okrs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOkrs(data.data.okrs);
        setStats(data.data.stats);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch OKRs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (okrData: Partial<OKR>) => {
    try {
      const response = await fetch(`${apiUrl}/api/okrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(okrData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowForm(false);
        fetchOKRs();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create OKR");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<OKR>) => {
    try {
      const response = await fetch(`${apiUrl}/api/okrs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingOkr(null);
        fetchOKRs();
      }
    } catch (err) {
      setError("Failed to update OKR");
    }
  };

  const handleProgressUpdate = async (okrId: string, keyResultId: string, currentValue: number) => {
    try {
      const response = await fetch(`${apiUrl}/api/okrs/${okrId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyResultId, currentValue }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchOKRs();
      }
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${apiUrl}/api/okrs/${deleteId}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDeleteId(null);
        fetchOKRs();
      }
    } catch (err) {
      setError("Failed to delete OKR");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && okrs.length === 0) {
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
                  <Target className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-slate-400">Total OKRs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.averageProgress}%</p>
                  <p className="text-xs text-slate-400">Avg Progress</p>
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
                  <p className="text-2xl font-bold text-white">{stats.byStatus?.at_risk ?? 0}</p>
                  <p className="text-xs text-slate-400">At Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.completedKeyResults}/{stats.totalKeyResults}
                  </p>
                  <p className="text-xs text-slate-400">KRs Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            All
          </Button>
          {Object.entries(statusConfig).slice(0, 4).map(([status, config]) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? config.color : ""}
            >
              {config.label}
            </Button>
          ))}
        </div>
        
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" />
          New OKR
        </Button>
      </div>

      {/* OKR Form Modal */}
      {(showForm || editingOkr) && (
        <OKRForm
          okr={editingOkr ?? undefined}
          onSubmit={editingOkr 
            ? (data) => handleUpdate(editingOkr.id, data)
            : handleCreate
          }
          onCancel={() => {
            setShowForm(false);
            setEditingOkr(null);
          }}
        />
      )}

      {/* OKR List */}
      {okrs.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-400">No OKRs yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create your first Objective and Key Results to track progress
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create OKR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {okrs.map((okr) => (
            <OKRCard
              key={okr.id}
              okr={okr}
              onEdit={() => setEditingOkr(okr)}
              onDelete={() => setDeleteId(okr.id)}
              onProgressUpdate={handleProgressUpdate}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete OKR"
        description="Are you sure you want to delete this OKR? All associated Key Results and progress data will be permanently removed."
        confirmText="Delete OKR"
        variant="destructive"
        isLoading={isDeleting}
      />

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
