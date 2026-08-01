import { addProtocol, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { invoke } from '@tauri-apps/api/core';

export const THEMES = [
    'dark-matter',
    'positron',
    'osm-bright',
    'toner',
    'fiord-color',
    'klokantech-3d',
    'klokantech-basic',
    'osm-liberty',
    'maptiler-basic',
    'maptiler-3d'
];

export function setupMapLibre() {
    setWorkerUrl(workerUrl);

    addProtocol('mbtiles', async (params) => {
        const url = new URL(params.url);
        const parts = url.pathname.split('/').filter(Boolean);
        const z = parseInt(parts[0]);
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);

        try {
            const data = await invoke<number[]>('get_map_tile', { z, x, y });
            if (!data || data.length === 0) {
                return { data: new ArrayBuffer(0) };
            }

            let tileData = new Uint8Array(data);
            if (tileData.length >= 2 && tileData[0] === 0x1F && tileData[1] === 0x8B) {
                const stream = new Response(tileData).body?.pipeThrough(new DecompressionStream("gzip"));
                tileData = new Uint8Array(await new Response(stream).arrayBuffer());
            }

            return { data: tileData.buffer };
        } catch (err) {
            console.warn("Tile fetch error:", err);
            return { data: new ArrayBuffer(0) };
        }
    });
}
