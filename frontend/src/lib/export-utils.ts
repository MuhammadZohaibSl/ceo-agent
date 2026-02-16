import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { PipelineState } from "@/types/api"

/**
 * Format pipeline data into a structured markdown string
 */
const generateMarkdownContent = (pipeline: PipelineState): string => {
    let md = `# CEO Agent Strategic Analysis: ${pipeline.id.substring(0, 8)}\n\n`
    md += `**Query:** ${pipeline.query}\n`
    md += `**Status:** ${pipeline.status.toUpperCase()}\n`
    md += `**Date:** ${new Date(pipeline.createdAt).toLocaleDateString()} ${new Date(pipeline.createdAt).toLocaleTimeString()}\n\n`

    md += `## Executive Summary\n\n`
    const avgScore = (pipeline.steps.reduce((acc, s) => acc + (s.result?.score || 0), 0) / pipeline.steps.length).toFixed(1)
    md += `All ${pipeline.steps.length} critical domains have been validated with an average confidence score of **${avgScore}/10**.\n\n`

    pipeline.steps.forEach((step, index) => {
        md += `--- \n\n`
        md += `### ${index + 1}. ${step.icon} ${step.name}\n\n`
        md += `**Status:** ${step.status}\n`
        if (step.result) {
            md += `**Confidence Score:** ${step.result.score}/10\n\n`

            md += `#### Key Findings\n`
            step.result.keyFindings.forEach(kf => md += `- ${kf}\n`)
            md += `\n`

            md += `#### Strategic Recommendations\n`
            step.result.recommendations.forEach(rec => md += `- ${rec}\n`)
            md += `\n`

            md += `#### Critical Risks\n`
            step.result.risks.forEach(risk => md += `- ${risk}\n`)
            md += `\n`
        }
    })

    return md
}

/**
 * Download text content as a file
 */
const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Export as .md
 */
export const downloadAsMarkdown = (pipeline: PipelineState) => {
    const content = generateMarkdownContent(pipeline)
    downloadFile(content, `ceo-analysis-${pipeline.id.substring(0, 8)}.md`, "text/markdown")
}

/**
 * Export as .pdf
 */
export const downloadAsPDF = (pipeline: PipelineState) => {
    const doc = new jsPDF() as any
    const title = `Strategic Analysis: ${pipeline.id.substring(0, 8)}`

    // Header
    doc.setFontSize(20)
    doc.setTextColor(16, 185, 129) // emerald-500
    doc.text("CEO AGENT", 14, 22)

    doc.setFontSize(14)
    doc.setTextColor(31, 41, 55) // gray-800
    doc.text(title, 14, 32)

    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128) // gray-500
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38)
    doc.text(`Query: ${pipeline.query}`, 14, 44, { maxWidth: 180 })

    let yPos = 55

    pipeline.steps.forEach((step) => {
        if (yPos > 260) {
            doc.addPage()
            yPos = 20
        }

        doc.setFontSize(12)
        doc.setTextColor(6, 95, 70) // emerald-900
        doc.setFont("helvetica", "bold")
        doc.text(`${step.name} (${step.result?.score || 0}/10)`, 14, yPos)
        yPos += 7

        if (step.result) {
            doc.setFontSize(9)
            doc.setTextColor(55, 65, 81) // gray-700
            doc.setFont("helvetica", "normal")

            const findings = step.result.keyFindings.map(f => [f])
            autoTable(doc, {
                startY: yPos,
                head: [['Key Findings']],
                body: findings,
                theme: 'striped',
                headStyles: { fillColor: [249, 250, 251], textColor: [31, 41, 55], fontStyle: 'bold' },
                margin: { left: 14 },
                styles: { fontSize: 8, cellPadding: 2 }
            })

            yPos = doc.lastAutoTable.finalY + 10
        }
    })

    doc.save(`ceo-brief-${pipeline.id.substring(0, 8)}.pdf`)
}

/**
 * Export as .xlsx
 */
export const downloadAsExcel = (pipeline: PipelineState) => {
    const rows = pipeline.steps.map(step => ({
        "Domain": step.name,
        "Score": step.result?.score || 0,
        "Findings": step.result?.keyFindings.join(" | ") || "",
        "Recommendations": step.result?.recommendations.join(" | ") || "",
        "Risks": step.result?.risks.join(" | ") || "",
        "Status": step.status,
        "Provider": step.result?.provider || "CEO Engine"
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Strategic Analysis")

    // Auto-width
    const maxWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, ...rows.map(row => String((row as any)[key]).length))
    }))
    ws['!cols'] = maxWidths

    XLSX.writeFile(wb, `ceo-analysis-${pipeline.id.substring(0, 8)}.xlsx`)
}

/**
 * Export as raw .nd (text/json format)
 */
export const downloadAsND = (pipeline: PipelineState) => {
    const content = JSON.stringify(pipeline, null, 2)
    downloadFile(content, `ceo-analysis-${pipeline.id.substring(0, 8)}.nd`, "application/json")
}
