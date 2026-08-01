import React, { useState, useMemo } from 'react';
import './HelpWikiModal.css';

interface HelpWikiModalProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    initialTab?: 'guide' | 'hotkeys' | 'about';
}

interface ArticleCategory {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    keywords: string[];
    content: React.ReactNode;
}

export default function HelpWikiModal({ display, setDisplay, initialTab = 'guide' }: HelpWikiModalProps) {
    const [activeTab, setActiveTab] = useState<'guide' | 'hotkeys' | 'about'>(initialTab);
    const [activeCategory, setActiveCategory] = useState<string>('getting-started');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const wikiCategories: ArticleCategory[] = useMemo(() => [
        {
            id: 'getting-started',
            icon: '🚀',
            title: 'Getting Started & Offline Principles',
            subtitle: '100% Air-Gapped Master Architecture for Backcountry Navigation',
            keywords: ['offline', 'airgap', 'motog', 'scrcpy', 'architecture', 'privacy', 'gps'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        <strong>Iter Viae</strong> (<em>The Way of The Road</em>) is an open-source, air-gapped navigation ecosystem built for extreme backcountry adventure riding where cloud infrastructure and cell service do not exist.
                    </p>

                    <div className="help-wiki-callout info">
                        <span>ℹ️</span>
                        <div>
                            <strong>Core Air-Gapped Principle:</strong> Zero cloud reliance, zero API keys, zero persistent server handshakes. The app relies 100% on local vector tiles, local SQLite routing graphs, and offline search indexes.
                        </div>
                    </div>

                    <h3 className="help-wiki-section-h3">Dual-Mode Workflow</h3>
                    <ul className="help-wiki-list">
                        <li>
                            <strong>Desk Workstation (Desktop App):</strong> Layout routes, manage waypoint lists, inspect POIs, filter route budgets, and compile print roadbooks using a full keyboard and mouse.
                        </li>
                        <li>
                            <strong>Cockpit Head Unit (Mobile Client):</strong> Plugs into the PC workstation to mirror controls via USB screen-copying (<code className="help-wiki-code">scrcpy</code>). On the trail, the head unit runs permanently in Airplane Mode using hardware GNSS/GPS.
                        </li>
                    </ul>

                    <div className="help-wiki-callout tip">
                        <span>💡</span>
                        <div>
                            <strong>Quick Tip:</strong> Press <kbd className="help-wiki-kbd">F1</kbd> anywhere on the main map to bring up this User Guide instantly.
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'map-tools',
            icon: '🗺️',
            title: 'Map Tools & Tile Management',
            subtitle: 'Loading vector tile vaults, styling basemaps, and theme selection',
            keywords: ['mbtiles', 'vector', 'theme', 'klokantech', 'maptiler', 'osm', 'import'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        Iter Viae renders high-density regional vector map tiles directly from offline <code className="help-wiki-code">.mbtiles</code> container files via MapLibre GL.
                    </p>

                    <h3 className="help-wiki-section-h3">Importing New Maps</h3>
                    <ol className="help-wiki-list">
                        <li>Open <strong>Map Tools</strong> from the top native application menu bar.</li>
                        <li>Select <strong>Import</strong> to open the local Map Processing Tool workspace.</li>
                        <li>Select your raw compiled <code className="help-wiki-code">.mbtiles</code> or OpenStreetMap extracts to process local vector layers and gazetteer database entries.</li>
                    </ol>

                    <h3 className="help-wiki-section-h3">Switching Basemap Themes</h3>
                    <p className="help-wiki-text">
                        Use the theme drop-down menu in the top-left of the tactical map or the native <strong>Map Tools &gt; Themes</strong> menu bar to switch between 10+ custom tactical styles:
                    </p>
                    <ul className="help-wiki-list">
                        <li><strong>Klokantech Basic / 3D:</strong> Optimized daylight contrast for outdoor motorcycle cockpits.</li>
                        <li><strong>Dark Matter:</strong> Low-light night tactical mode.</li>
                        <li><strong>OSM Bright / Liberty:</strong> Crisp topographic style for complex road junctions.</li>
                        <li><strong>Toner / Positron:</strong> Minimalist high-contrast monochrome styles.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'trip-waypoints',
            icon: '📍',
            title: 'Trip & Waypoint Management',
            subtitle: 'Adding stops, editing durations, stop categories, and budget tracking',
            keywords: ['stop', 'poi', 'waypoint', 'edit', 'budget', 'fuel', 'lodging', 'food', 'shaping'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        Plan multi-stop journeys using the interactive Left Organizer Sidebar.
                    </p>

                    <h3 className="help-wiki-section-h3">Adding Waypoints to a Trip</h3>
                    <ul className="help-wiki-list">
                        <li><strong>From POIs or Search:</strong> Click any Point of Interest or search for raw coordinates (<code className="help-wiki-code">39.7392, -104.9903</code>) in the top search bar, then click <strong>Add to Trip</strong>.</li>
                        <li><strong>From Map Clicks:</strong> Click directly on roads or terrain to drop custom stops.</li>
                    </ul>

                    <h3 className="help-wiki-section-h3">Waypoint Stop Types & Custom Details</h3>
                    <p className="help-wiki-text">
                        Click the edit button (✏️) on any waypoint card to open the <strong>Edit Details</strong> popup:
                    </p>
                    <ul className="help-wiki-list">
                        <li><strong>Stop Classification:</strong> Choose between <em>Fuel ⛽</em>, <em>Food 🍔</em>, <em>Lodging 🏨</em>, <em>Attraction 🏕️</em>, or <em>Shaping Point 📍</em>.</li>
                        <li><strong>Break Duration:</strong> Specify layover time in minutes (e.g., 30 min fuel stop, 60 min lunch). The app automatically calculates departure times and cumulative trip duration!</li>
                        <li><strong>Individual Budgeting:</strong> Record estimated costs (<code className="help-wiki-code">$25.00</code>). Total trip cost is aggregated in real-time in the sidebar summary.</li>
                    </ul>

                    <h3 className="help-wiki-section-h3">Drag-and-Drop Reordering</h3>
                    <p className="help-wiki-text">
                        In the Left Sidebar, click and drag the grip handles (⋮⋮) on any stop card to reorder your itinerary sequence. The route line and timeline recalculate smoothly in real-time.
                    </p>
                </div>
            )
        },
        {
            id: 'routing-dragging',
            icon: '🛣️',
            title: 'Routing & Polyline Dragging',
            subtitle: 'Native 3-Tier spatial routing engine and dynamic route shaping',
            keywords: ['route', 'dijkstra', 'graph', 'reroute', 'drag', 'shaping', 'polyline', 'eta'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        Iter Viae calculates fast, offline pathfinding using a Native Rust 3-Tier Spatial Chunking Routing Engine.
                    </p>

                    <h3 className="help-wiki-section-h3">Rerouting & Intermediate Shaping</h3>
                    <ol className="help-wiki-list">
                        <li>Click on any generated route polyline on the map to activate a route shaping node.</li>
                        <li>Drag the node to force the route onto scenic backroads, dirt passes, or specific trail segments.</li>
                        <li>Upon releasing the drag handle, the Rust routing engine dynamically recalculates optimal path connectors between your waypoints.</li>
                    </ol>

                    <div className="help-wiki-callout warning">
                        <span>⚠️</span>
                        <div>
                            <strong>Off-Grid Path Safety:</strong> Routing calculations resolve against local spatial SQLite chunk databases without cloud telemetry. Always double-check fuel range between wilderness stops!
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'range-finder',
            icon: '📏',
            title: 'Range Finder Tool',
            subtitle: 'Measuring radial distance rings and fuel perimeter boundaries',
            keywords: ['range', 'radius', 'distance', 'fuel range', 'circle', 'measurement', 'miles', 'km'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        The <strong>Range Finder</strong> allows riders to visualize radial range limits (such as motorcycle fuel tank range, daylight boundaries, or contingency search perimeters) directly on the map.
                    </p>

                    <h3 className="help-wiki-section-h3">Using the Range Finder</h3>
                    <ol className="help-wiki-list">
                        <li>Launch Range Finder via <strong>Map Tools &gt; Range Finder</strong> in the top menu or the quick toggle button.</li>
                        <li>Click any origin point on the map (such as your last known fuel stop).</li>
                        <li>Adjust radius sliders (e.g. 150 miles / 240 km) to render concentric tactical range rings over terrain.</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'mission-manifest',
            icon: '🖨️',
            title: 'Mission Manifest (PDF Export)',
            subtitle: 'Generating analog paper roadbooks for physical cockpit backup',
            keywords: ['print', 'pdf', 'manifest', 'roadbook', 'journal', 'letter', 'field notes', 'export'],
            content: (
                <div className="help-wiki-article">
                    <p className="help-wiki-text">
                        The <strong>Mission Manifest</strong> creates a clean, high-contrast B&amp;W paper roadbook for physical backup in field notebooks—guaranteeing navigation survival even if hardware breaks down in remote terrain.
                    </p>

                    <h3 className="help-wiki-section-h3">Paper Size Options</h3>
                    <ul className="help-wiki-list">
                        <li><strong>Field Notes (3.0" x 5.0"):</strong> Fits compact pocket notebooks and handlebar memo holders.</li>
                        <li><strong>Custom Journal (5.0" x 7.75"):</strong> Ideal for tactical binders and tank bag maps.</li>
                        <li><strong>Letter (8.5" x 11.0"):</strong> Standard full-size document printout.</li>
                    </ul>

                    <h3 className="help-wiki-section-h3">Exporting to PDF</h3>
                    <ol className="help-wiki-list">
                        <li>Click <strong>Print Roadbook</strong> in the Left Sidebar summary footer.</li>
                        <li>Choose your target physical notebook paper size.</li>
                        <li>Click <strong>Export PDF</strong>. The desktop app saves <code className="help-wiki-code">Itinerary_[size].pdf</code> to your Desktop and opens it in your default viewer.</li>
                    </ol>
                </div>
            )
        }
    ], []);

    const hotkeyItems = [
        { key: 'F1', action: 'Open User Guide & Tactical Wiki' },
        { key: 'Ctrl + N', action: 'Create New Trip (Clear active plan with prompt)' },
        { key: 'Ctrl + O', action: 'Load Saved Trip File' },
        { key: 'Ctrl + S', action: 'Save Current Trip File' },
        { key: 'Ctrl + Shift + S', action: 'Save Trip File As...' },
        { key: 'Ctrl + /', action: 'Open Keyboard Shortcuts Quick Reference' },
        { key: 'Ctrl + Q', action: 'Exit Application' },
        { key: 'Esc', action: 'Close Active Popup or Help Overlay' },
    ];

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return wikiCategories;
        const q = searchQuery.toLowerCase();
        return wikiCategories.filter(cat => 
            cat.title.toLowerCase().includes(q) ||
            cat.subtitle.toLowerCase().includes(q) ||
            cat.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [searchQuery, wikiCategories]);

    const filteredHotkeys = useMemo(() => {
        if (!searchQuery.trim()) return hotkeyItems;
        const q = searchQuery.toLowerCase();
        return hotkeyItems.filter(h => 
            h.key.toLowerCase().includes(q) || 
            h.action.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    if (!display) return null;

    const currentArticle = wikiCategories.find(c => c.id === activeCategory) || wikiCategories[0];

    return (
        <div className="help-wiki-overlay" onClick={() => setDisplay(false)}>
            <div className="help-wiki-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
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

                {/* Body */}
                <div className="help-wiki-body">
                    {activeTab === 'guide' && (
                        <>
                            {/* Left Navigation */}
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

                            {/* Right Content */}
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
