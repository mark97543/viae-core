import { useState, useMemo } from 'react';
import './HelpWikiModal.css';
import { WIKI_CATEGORIES } from '../../data/wikiArticles.tsx';
import { HOTKEY_ITEMS } from '../../data/hotkeysData.ts';

interface HelpWikiModalProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    initialTab?: 'guide' | 'hotkeys' | 'about';
}

export default function HelpWikiModal({ display, setDisplay, initialTab = 'guide' }: HelpWikiModalProps) {
    const [activeTab, setActiveTab] = useState<'guide' | 'hotkeys' | 'about'>(initialTab);
    const [activeCategory, setActiveCategory] = useState<string>('getting-started');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return WIKI_CATEGORIES;
        const q = searchQuery.toLowerCase();
        return WIKI_CATEGORIES.filter(cat => 
            cat.title.toLowerCase().includes(q) ||
            cat.subtitle.toLowerCase().includes(q) ||
            cat.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [searchQuery]);

    const filteredHotkeys = useMemo(() => {
        if (!searchQuery.trim()) return HOTKEY_ITEMS;
        const q = searchQuery.toLowerCase();
        return HOTKEY_ITEMS.filter(h => 
            h.key.toLowerCase().includes(q) || 
            h.action.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    if (!display) return null;

    const currentArticle = WIKI_CATEGORIES.find(c => c.id === activeCategory) || WIKI_CATEGORIES[0];

    return (
        <div className="help-wiki-overlay" onClick={() => setDisplay(false)}>
            <div className="help-wiki-container" onClick={(e) => e.stopPropagation()}>
                <div className="help-wiki-header">
                    <div className="help-wiki-top-row">
                        <div className="help-wiki-title-area">
                            <span className="help-wiki-badge">Read-Only Guide</span>
                            <h2 className="help-wiki-title">📖 Iter Viae Knowledge Base &amp; Wiki</h2>
                        </div>
                        <button className="help-wiki-close-btn" onClick={() => setDisplay(false)} title="Close (Esc)">
                            ✕
                        </button>
                    </div>

                    <div className="help-wiki-controls-row">
                        <div className="help-wiki-tabs">
                            <button
                                className={`help-wiki-tab ${activeTab === 'guide' ? 'active' : ''}`}
                                onClick={() => setActiveTab('guide')}
                            >
                                📚 User Guide
                            </button>
                            <button
                                className={`help-wiki-tab ${activeTab === 'hotkeys' ? 'active' : ''}`}
                                onClick={() => setActiveTab('hotkeys')}
                            >
                                ⌨️ Shortcuts
                            </button>
                            <button
                                className={`help-wiki-tab ${activeTab === 'about' ? 'active' : ''}`}
                                onClick={() => setActiveTab('about')}
                            >
                                ℹ️ About
                            </button>
                        </div>

                        <div className="help-wiki-search-box">
                            <span className="help-wiki-search-icon">🔍</span>
                            <input
                                type="text"
                                className="help-wiki-search-input"
                                placeholder="Search articles, topics, or hotkeys..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="help-wiki-body">
                    {activeTab === 'guide' && (
                        <>
                            <div className="help-wiki-sidebar">
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            className={`help-wiki-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                                            onClick={() => setActiveCategory(cat.id)}
                                        >
                                            <span className="help-wiki-nav-icon">{cat.icon}</span>
                                            <span>{cat.title}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div style={{ padding: '16px 8px', color: '#64748b', fontSize: '13px' }}>
                                        No guide categories matching "{searchQuery}"
                                    </div>
                                )}
                            </div>

                            <div className="help-wiki-content-panel">
                                {currentArticle && (
                                    <>
                                        <h1 className="help-wiki-article-title">
                                            <span>{currentArticle.icon}</span>
                                            <span>{currentArticle.title}</span>
                                        </h1>
                                        <div className="help-wiki-article-subtitle">{currentArticle.subtitle}</div>
                                        {currentArticle.content}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'hotkeys' && (
                        <div className="help-wiki-content-panel" style={{ maxWidth: '100%' }}>
                            <h1 className="help-wiki-article-title">
                                <span>⌨️</span>
                                <span>Keyboard Shortcuts &amp; Hotkeys</span>
                            </h1>
                            <div className="help-wiki-article-subtitle">
                                Desktop master workstation shortcuts for fast route editing and offline navigation.
                            </div>

                            <table className="help-wiki-hotkey-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '220px' }}>Shortcut</th>
                                        <th>Action / Function</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHotkeys.length > 0 ? (
                                        filteredHotkeys.map((h, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <kbd className="help-wiki-kbd">{h.key}</kbd>
                                                </td>
                                                <td>{h.action}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                                                No shortcuts matching "{searchQuery}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="help-wiki-content-panel">
                            <h1 className="help-wiki-article-title">
                                <span>🛡️</span>
                                <span>Iter Viae — The Way of The Road</span>
                            </h1>
                            <div className="help-wiki-article-subtitle">
                                Version v0.3 Cursus | 100% Air-Gapped Offline Adventure Ecosystem
                            </div>

                            <div className="help-wiki-article">
                                <p className="help-wiki-text">
                                    Commercial navigation apps fail deep in remote terrain due to rigid dependencies on active cell towers, cloud sync, and server telemetry.
                                </p>
                                <p className="help-wiki-text">
                                    <strong>Iter Viae</strong> gives adventure riders complete sovereignty over their spatial data. Built with Rust, Tauri 2, React, MapLibre GL, and SQLite.
                                </p>

                                <div className="help-wiki-callout tip" style={{ marginTop: '24px' }}>
                                    <span>🏍️</span>
                                    <div>
                                        <strong>Off-Grid Sovereignty:</strong> Zero monthly subscriptions, zero API keys, zero cloud servers. Your maps and trips remain exclusively on your hardware.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
