"use client"

import * as React from "react"
import { Download, FileText, FileCode, Table, FileJson, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PipelineState } from "@/types/api"
import { 
    downloadAsMarkdown, 
    downloadAsPDF, 
    downloadAsExcel, 
    downloadAsND 
} from "@/lib/export-utils"

interface ExportButtonProps {
  pipeline: PipelineState
}

export function ExportButton({ pipeline }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-widest h-12 px-8 rounded-md shadow-lg shadow-emerald-500/20 transition-all gap-2"
        >
            <Download className="w-4 h-4" />
            Export Brief
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-popover/80 backdrop-blur-xl border-border/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
            Select Format
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40 mx-2" />
        
        

        <DropdownMenuItem 
            onClick={() => downloadAsPDF(pipeline)}
            className="rounded-xl px-3 py-2.5 gap-3 focus:bg-primary/10 group cursor-pointer transition-colors"
        >
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">PDF Document</span>
                <span className="text-[9px] text-muted-foreground uppercase font-medium">Professional Brief</span>
            </div>
        </DropdownMenuItem>

        

        <DropdownMenuItem 
            onClick={() => downloadAsMarkdown(pipeline)}
            className="rounded-xl px-3 py-2.5 gap-3 focus:bg-primary/10 group cursor-pointer transition-colors"
        >
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                <FileCode className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Markdown File</span>
                <span className="text-[9px] text-muted-foreground uppercase font-medium">Knowledge Base</span>
            </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
