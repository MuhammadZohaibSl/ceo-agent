'use client';

import { useState, useEffect } from 'react';
import { Settings, Loader2, Check, ChevronDown } from 'lucide-react';

interface LLMSettings {
    defaultProvider: string;
    availableProviders: string[];
    providers: Record<string, { available: boolean; model?: string }>;
}

interface SettingsPanelProps {
    onProviderChange?: (provider: string) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function SettingsPanel({ onProviderChange }: SettingsPanelProps) {
    const [settings, setSettings] = useState<LLMSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/settings/llm`);
            const data = await response.json();
            if (data.success) {
                setSettings(data.data);
            } else {
                setError(data.error || 'Failed to load settings');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const updateProvider = async (provider: string) => {
        if (!settings || provider === settings.defaultProvider) return;
        
        try {
            setSaving(true);
            const response = await fetch(`${API_BASE_URL}/api/settings/llm`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultProvider: provider }),
            });
            const data = await response.json();
            if (data.success) {
                setSettings(prev => prev ? { ...prev, defaultProvider: provider } : null);
                onProviderChange?.(provider);
            } else {
                setError(data.error || 'Failed to update settings');
            }
        } catch (err) {
            setError('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const providerDisplayNames: Record<string, string> = {
        auto: 'Auto (Recommended)',
        groq: 'Groq (Llama 3.3 70B)',
        openrouter: 'OpenRouter',
    };

    if (loading) {
        return (
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground border border-border/50">
                <Loader2 className="w-4 h-4 animate-spin" />
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
            >
                <Settings className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">
                    {settings?.defaultProvider ? providerDisplayNames[settings.defaultProvider] || settings.defaultProvider : 'Settings'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden text-popover-foreground">
                    <div className="p-3 border-b border-border/50">
                        <h3 className="text-sm font-medium">LLM Provider</h3>
                        <p className="text-xs text-muted-foreground mt-1">Select the AI model to use</p>
                    </div>
                    
                    <div className="p-2">
                        {settings?.availableProviders.map((provider) => {
                            const isActive = provider === settings.defaultProvider;
                            const providerInfo = settings.providers[provider];
                            
                            return (
                                <button
                                    key={provider}
                                    onClick={() => updateProvider(provider)}
                                    disabled={saving || !providerInfo?.available}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                                        isActive 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    } ${!providerInfo?.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div>
                                        <div className="text-sm font-medium">
                                            {providerDisplayNames[provider] || provider}
                                        </div>
                                        {providerInfo?.model && (
                                            <div className="text-xs text-gray-500 truncate max-w-[180px]">
                                                {providerInfo.model}
                                            </div>
                                        )}
                                    </div>
                                    {isActive && <Check className="w-4 h-4" />}
                                    {saving && provider === settings.defaultProvider && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="p-2 border-t border-white/10">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Backdrop to close dropdown */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default SettingsPanel;
