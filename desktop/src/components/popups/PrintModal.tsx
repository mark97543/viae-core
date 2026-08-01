import { useState } from 'react';
import './PrintPage.css';
import PrintLayout from './PrintLayout.tsx';

import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { desktopDir, join } from '@tauri-apps/api/path';
import { writeFile } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';

interface PrintModalProps {
    display: boolean;
    setDisplay: (val: boolean) => void;
    onPrint?: (size: string) => void;
}

export default function PrintModal({ display, setDisplay }: PrintModalProps) {
    const [size, setSize] = useState('letter');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!display) return null;

    const handlePrint = async () => {
        const pageElements = document.querySelectorAll('.print-day-page');
        if (!pageElements || pageElements.length === 0) return;
        
        setIsGenerating(true);
        
        try {
            let format: string | [number, number] = 'letter';
            if (size === 'field-notes') format = [3.0, 5.0];
            if (size === 'custom-journal') format = [5.0, 7.75];

            const pdf = new jsPDF({
                unit: 'in',
                format: format,
                orientation: 'portrait'
            });

            const pdfWidth = typeof format === 'string' ? 8.5 : format[0];
            const pdfHeight = typeof format === 'string' ? 11.0 : format[1];
            const margin = size === 'letter' ? 0.25 : 0.15;
            const printWidth = pdfWidth - (margin * 2);
            const printHeight = pdfHeight - (margin * 2);

            for (let i = 0; i < pageElements.length; i++) {
                const el = pageElements[i] as HTMLElement;

                const imgData = await toJpeg(el, {
                    quality: 0.98,
                    pixelRatio: 2,
                    backgroundColor: '#ffffff'
                });

                if (i > 0) {
                    pdf.addPage(format, 'portrait');
                }

                pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight);
            }

            const pdfBuffer = pdf.output('arraybuffer');
            const dir = await desktopDir();
            const filePath = await join(dir, `Itinerary_${size}.pdf`);
            
            await writeFile(filePath, new Uint8Array(pdfBuffer));
            await openPath(filePath);
        } catch (err) {
            console.error("Failed to generate PDF:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="print-page-overlay">
            <div className="print-page-sidebar">
                <h2>Print Settings</h2>
                
                <div className="print-setting-group">
                    <label>Paper Size</label>
                    <select 
                        value={size} 
                        onChange={(e) => setSize(e.target.value)}
                        className="bg-neutral-800 text-white p-2 rounded outline-none border border-neutral-700 w-full mt-2"
                    >
                        <option value="letter">Letter (8.5" x 11")</option>
                        <option value="field-notes">Field Notes Insert (3.0" x 5.0")</option>
                        <option value="custom-journal">Custom Journal Insert (5.0" x 7.75")</option>
                    </select>
                </div>

                <div className="print-page-actions">
                    <button className="btn-cancel" onClick={() => setDisplay(false)}>Cancel</button>
                    <button className="btn-print" onClick={handlePrint} disabled={isGenerating}>
                        {isGenerating ? 'Generating PDF...' : 'Generate PDF'}
                    </button>
                </div>
            </div>
            
            <div className="print-page-preview-area">
                <div className="preview-instructions">
                    <h3>Preview</h3>
                    <p>The itinerary will be formatted in high-contrast black and white for optimal legibility.</p>
                </div>
                <div className={`preview-document preview-${size}`}>
                    <PrintLayout paperSize={size} />
                </div>
            </div>
        </div>
    );
}
