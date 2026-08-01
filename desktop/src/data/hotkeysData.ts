export interface HotkeyItem {
    key: string;
    action: string;
}

export const HOTKEY_ITEMS: HotkeyItem[] = [
    { key: 'F1', action: 'Open User Guide & Tactical Wiki' },
    { key: 'Ctrl + N', action: 'Create New Trip (Clear active plan with prompt)' },
    { key: 'Ctrl + O', action: 'Load Saved Trip File' },
    { key: 'Ctrl + S', action: 'Save Current Trip File' },
    { key: 'Ctrl + Shift + S', action: 'Save Trip File As...' },
    { key: 'Ctrl + /', action: 'Open Keyboard Shortcuts Quick Reference' },
    { key: 'Ctrl + Q', action: 'Exit Application' },
    { key: 'Esc', action: 'Close Active Popup or Help Overlay' },
];
