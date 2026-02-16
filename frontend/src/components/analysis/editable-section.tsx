'use client';

/**
 * EditableSection Component
 * A reusable component to render text as an editable artifact.
 * Used for Rationale, Description, and other long-form text blocks.
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HighlightText } from '../ui/highlight-text';
import type { StepArtifact } from '@/types/api';

interface EditableSectionProps {
    title?: string;
    sectionId: string;
    artifact: StepArtifact | null | undefined;
    content?: string; // Fallback if artifact is null
    onEdit: (lineIndex: number, content: string) => void;
    onComment: (lineIndex: number, text: string) => void;
    className?: string;
}

export function EditableSection({
    title,
    sectionId,
    artifact,
    content,
    onEdit,
    onComment,
    className
}: EditableSectionProps) {
    const [editingLine, setEditingLine] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [commentingLine, setCommentingLine] = useState<number | null>(null);
    const [commentValue, setCommentValue] = useState('');
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);

    // Prepare line data
    const lines = useMemo(() => {
        if (artifact?.lines) return artifact.lines;
        if (content) return content.split('\n');
        return [];
    }, [artifact, content]);

    const editedLineIndexes = useMemo(() => {
        return new Set(artifact?.edits?.map(e => e.lineIndex) || []);
    }, [artifact]);

    const startEdit = (index: number) => {
        setEditingLine(index);
        setEditValue(lines[index] || '');
        setCommentingLine(null);
    };

    const submitEdit = () => {
        if (editingLine !== null) {
            onEdit(editingLine, editValue);
        }
        setEditingLine(null);
    };

    const startComment = (index: number) => {
        setCommentingLine(index);
        setCommentValue('');
        setEditingLine(null);
    };

    const submitComment = () => {
        if (commentingLine !== null && commentValue.trim()) {
            onComment(commentingLine, commentValue.trim());
        }
        setCommentingLine(null);
    };

    if (lines.length === 0) return null;

    return (
        <div className={cn("space-y-2", className)}>
            {title && (
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {title}
                    </h4>
                    <div className="flex gap-2">
                        {artifact?.edits && artifact.edits.length > 0 && (
                            <Badge variant="secondary" className="text-[9px] py-0 border-none bg-amber-500/10 text-amber-500">
                                {artifact.edits.length} edit{artifact.edits.length > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-xl bg-card/40 overflow-hidden shadow-inner border-none">
                {lines.map((line, index) => {
                    const isEditing = editingLine === index;
                    const isCommenting = commentingLine === index;
                    const isEdited = editedLineIndexes.has(index);
                    const isHovered = hoveredLine === index;
                    const lineComments = artifact?.comments?.filter(c => c.lineIndex === index) || [];

                    return (
                        <div key={index} className="group relative">
                            <div
                                className={cn(
                                    "flex items-stretch transition-colors duration-200",
                                    isEditing ? "bg-primary/10" : "hover:bg-muted/30",
                                    isEdited && !isEditing && "bg-amber-500/5"
                                )}
                                onMouseEnter={() => setHoveredLine(index)}
                                onMouseLeave={() => setHoveredLine(null)}
                            >
                                {/* Content Area */}
                                <div className="flex-1 min-h-[1.5rem] relative">
                                    {isEditing ? (
                                        <div className="p-2 flex gap-2 items-center">
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') submitEdit();
                                                    if (e.key === 'Escape') setEditingLine(null);
                                                }}
                                                autoFocus
                                                className="h-8 text-sm border-none bg-background/50 shadow-inner"
                                            />
                                            <Button size="sm" onClick={submitEdit} className="h-8">Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingLine(null)} className="h-8 text-xs">✕</Button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="px-4 py-2 cursor-pointer transition-all active:scale-[0.99]"
                                            onClick={() => startEdit(index)}
                                        >
                                            <HighlightText 
                                                text={line.trim() === '' ? ' ' : line} 
                                                className={cn(
                                                    "text-sm leading-relaxed",
                                                    isEdited ? "text-amber-200/90" : "text-foreground/90"
                                                )}
                                            />
                                            {isEdited && (
                                                <span className="ml-2 text-[9px] italic text-amber-500/40 uppercase">Edited</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Inline Actions */}
                                    {!isEditing && isHovered && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 animate-in fade-in slide-in-from-right-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-6 w-6 p-0 rounded-full bg-background/80 shadow-sm"
                                                onClick={(e) => { e.stopPropagation(); startComment(index); }}
                                                title="Comment"
                                            >
                                                💬
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comment Box */}
                            {isCommenting && (
                                <div className="px-4 py-3 bg-primary/5 space-y-2 border-t border-border/10">
                                    <Input
                                        value={commentValue}
                                        onChange={(e) => setCommentValue(e.target.value)}
                                        placeholder="Add context or instruction…"
                                        autoFocus
                                        className="h-8 text-xs bg-background/50 border-none shadow-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitComment();
                                            if (e.key === 'Escape') setCommentingLine(null);
                                        }}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setCommentingLine(null)} className="h-7 text-xs">Cancel</Button>
                                        <Button size="sm" onClick={submitComment} className="h-7 text-xs">Add Comment</Button>
                                    </div>
                                </div>
                            )}

                            {/* Existing Comments */}
                            {lineComments.length > 0 && (
                                <div className="px-4 py-2 bg-blue-500/5 space-y-2">
                                    {lineComments.map(comment => (
                                        <div key={comment.id} className="flex gap-2 items-start text-xs border-l-2 border-blue-500/30 pl-3">
                                            <span className="text-blue-400 font-bold uppercase text-[9px] mt-0.5">{comment.author}</span>
                                            <p className="text-foreground/70 leading-normal">{comment.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
