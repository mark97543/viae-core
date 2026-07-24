# Iter Viae 
> The Way of The Road

## Table of Contents
- [Executive Summary](#executive-summary)
- [Core Objectives & Principles](#core-objectives--principles)
- [Features/Goals](#featuresgoals)
  - [Mobile](#mobile)
  - [Desktop](#desktop)
  - [Tools](#tools)
- [User Requirements](#user-requirements)
- [Developer Requirements](#developer-requirements)
- [Phases and Milestones](#phases-and-milestones)

---

## Executive Summary 

**Iter Viae** is an open-source, self-funded, off-grid navigation ecosystem built by a motorcyclist, specifically for adventure riders. Commercial navigation apps fall short deep in the backcountry due to their rigid dependency on active cellular coverage, cloud infrastructure, monthly subscription paywalls, and telemetry tracking.

To achieve absolute off-grid sovereignty, Iter Viae implements a **100% Air-Gapped, Cell-Phone-Centric Master Architecture**:

- **The Master Mobile Device (The Standalone Workstation & Head Unit):** Built around rugged, budget-friendly Android hardware (such as the Moto G Play 2024 featuring a 5,000 mAh battery) equipped with high-capacity MicroSD expansion (supporting up to 256GB/512GB). The phone acts as the complete master filesystem holding a massive 100 GB multi-state map vault (vector tiles and Valhalla routing graphs).
- **Total Air-Gapped Isolation:** The device operates permanently in Airplane Mode with cellular radios deactivated. It relies exclusively on standalone GPS/GNSS hardware for live tracking, eliminating any risk of carrier pings or telemetry leaks.
- **Cross-Platform Planning & Mirroring Workspace (Windows & Linux):** To bypass the ergonomic limits of planning complex routes on a 6.5-inch mobile screen, the mobile device interfaces locally with a cross-platform desktop wrapper (built on Tauri + React + Vite, supporting both Windows and Linux). Using embedded tools like `scrcpy` (Screen Copy) bundled via sidecar binaries, riders can comfortably manage their map vaults, plot waypoints, and execute layouts using a full keyboard and mouse workspace while all processing and storage remain 100% local to the phone.

---

## Core Objectives & Principles

- **Sovereignty & Privacy:** Zero cloud servers, zero API keys, and zero persistent server handshakes. The rider owns their entire mapping and routing stack.
- **Cost Efficiency:** Zero recurring infrastructure costs and zero proprietary app store fees, keeping the project entirely free and open-source.
- **Deep Backcountry Resilience:** Built to navigate extreme terrain where cell service and cloud infrastructure do not exist.

---

## Features/Goals

### Mobile
- **Ruggedized Off-Grid Hardware Target:** Designed for budget-friendly, durable Android devices (such as the Motorola Moto G Play) equipped with high-capacity MicroSD card expansion.
- **100% Air-Gapped Operation:** Operates permanently in Airplane Mode with cellular radios disabled. Navigation relies exclusively on standalone GPS/GNSS hardware.
- **Massive Regional Storage:** Utilizes local MicroSD storage paths to read a multi-gigabyte map library (vector tiles and Valhalla routing graphs) without cloud streaming dependencies.
- **Tactical High-Contrast Display:** Features optimized map themes and low-latency rendering designed for optimal daylight visibility and high-speed legibility on motorcycle handlebars.

### Desktop
- **Cross-Platform Planning Suite:** Built on Tauri, React, Vite, and Rust, allowing riders on both Windows and Linux to manage their local map vaults and plan routes.
- **The "Desktop Mode" Mirroring Workflow:** Integrates ultra-low latency screen-copying (`scrcpy`) via native Tauri sidecar binaries. This allows the master mobile device to be plugged into a PC workstation, giving the rider a full keyboard-and-mouse workspace to layout routes while file management stays 100% local.
- **Offline Gazetteer Search:** Local SQLite full-text search index (FTS5) allowing instant address and coordinate lookups without cloud telemetry or external API dependencies.

### Tools
- **Custom Map Compilation Scripts (Bash / Python Pipeline):** 
  - **Phase 1 (Current Tooling):** Robust local shell scripts that automate parsing raw OpenStreetMap (`.osm.pbf`) data, executing tile generators (like Planetiler), and building custom `.mbtiles` and routing graph tarballs.
  - **Phase 2 (Tauri Integration):** Migrating these compilation wrappers into native Rust backend tasks so the desktop app can manage map-building directly through a clean graphical interface.
- **The Mission Manifest (Print Mode):** A zero-overhead CSS-driven print layout that converts complex multi-stop route trees into a clean, paper-ready physical roadbook format for analog cockpit backup.

---

## User Requirements

The core user requirements define what the rider experiences in the field and at the desk, focusing entirely on offline sovereignty, low friction, and resilience in remote terrain:

- **100% Off-Grid Independence:** The system must operate completely independent of cellular networks, cloud servers, or active internet handshakes. All map rendering, routing logic, and search functions must resolve locally on the hardware.
- **Massive Regional Map Capacity:** The platform must support multi-gigabyte map vaults (up to 100 GB of vector tiles and routing graphs) to handle multi-state adventure riding across remote areas.
- **Ergonomic Dual-Mode Workflow:** 
  - **At the Desk (Windows & Linux):** Riders must be able to plan complex routes, sequence waypoints, and manage map files using a full keyboard and mouse interface.
  - **On the Road (Android Head Unit):** The mobile client must run smoothly on budget-hardened hardware (e.g., Moto G Play with a 5,000 mAh battery) mounted to motorcycle handlebars, operating permanently in Airplane Mode.
- **Direct Desktop-to-Device Mirroring:** The user must be able to link their mobile device locally via USB to a Windows or Linux desktop using low-latency screen mirroring (`scrcpy`) to manage layouts seamlessly without touching cloud sync tools.
- **Analog Backup Integration ("Mission Manifest"):** A zero-overhead print mode capability that outputs structured, text-based roadbook summaries and QR code handshakes for physical paper backup in the cockpit.

---

## Developer Requirements

- **Cross-Platform Desktop Framework:** The desktop master workspace must be built using Tauri, React, Vite, and Tailwind CSS, ensuring native compilation and compatibility across both Windows and Linux environments.
- **Native Rust Backend Integration:** Low-level file system tasks, database queries, and route calculations must be encapsulated inside clean, decoupled Rust modules to bypass web sandbox limitations.
- **Local Spatial & Search Engines:** 
  - Map rendering must utilize local vector tile formats (`.mbtiles`) processed via MapLibre GL.
  - Address and coordinate lookup must rely on local SQLite databases featuring Full-Text Search (FTS5) extensions.
- **Android Development & Testing Environment:** 
  - Leveraging Android Studio Virtual Devices (AVD) and device emulators to pre-verify app installations, file directory structures on MicroSD card paths, and test navigation logic via simulated GPS route playback (`.gpx`/`.kml`).
  - Unlocking Android Developer Options with USB Debugging enabled to facilitate the local `scrcpy` control bridge.
- **Zero-Cost Deployment Pipeline:** The project must avoid recurring cloud hosting expenses and proprietary app store licensing fees by targeting direct Android `.apk` sideloading.

---

## Phases and Milestones

### Version 0.1 — Fundamentum (The Foundation)

#### Version 0.1.1 — Workspace Initialization
- **Features:** Initialize the core Tauri + React + Vite + Rust repository structure. Configure TypeScript, Tailwind CSS, and basic project routing.
- **Notes:** Verify that `npm run tauri dev` fires up the desktop window cleanly on both Windows and Linux test machines.
- **Items Completed:** 
  - [x] Set Up Git for website 
  

#### Version 0.1.2 — Local File System Bridge
- **Features:** Implement baseline Rust backend modules to read, write, and verify local directories. Use Tauri's native path API (`app.path()`) to prevent hardcoded slash errors.
- **Notes:** Ensure the backend can safely scan a designated folder for upcoming `.mbtiles` files without crashing.

#### Version 0.1.3 — MapLibre Integration
- **Features:** Embed the MapLibre GL canvas into the React frontend. Test rendering a small, sample local vector tile file inside the Tauri window.
- **Notes:** Keep styling minimal; focus entirely on ensuring the map canvas loads locally without making any external tile server requests.

#### Version 0.1.4 — Offline SQLite Gazetteer
- **Features:** Integrate a local SQLite database engine within the Rust backend. Set up an FTS5 full-text search table for instant, offline coordinate and location lookups.
- **Notes:** Test query execution speeds with a small test dataset of regional waypoints.

### Version 0.2 — Conexus (The Connection)

#### Version 0.2.1 — Binary Sidecar Setup
- **Features:** Package pre-compiled platform-specific `scrcpy` and `adb` binaries into Tauri's `src-tauri/binaries/` directory. Configure `tauri.conf.json` external targets.
- **Notes:** Verify that Tauri correctly bundles the binaries for both Windows (`.exe`) and Linux environments during local builds.

#### Version 0.2.2 — USB Bridge & Device Detection
- **Features:** Write the Rust process command (`std::process::Command`) to execute `adb devices` and confirm that a connected Android device is detected by the desktop app.
- **Notes:** Double-check that USB Debugging is toggled on in the target phone's Android Developer Options.

#### Version 0.2.3 — Screen Mirroring Launch Button
- **Features:** Build a high-contrast UI control button in the React frontend ("Launch Master Device Link") that fires the Rust sidecar command to spawn the low-latency `scrcpy` window.
- **Notes:** Test window stability, scaling, and keyboard/mouse input forwarding from the PC workstation to the physical phone.

#### Version 0.2.4 — MicroSD Vault Transfer Utility
- **Features:** Create a desktop file-management panel that allows users to select regional map folders on their PC and copy them directly via ADB/USB to the target Android device's MicroSD storage path.
- **Notes:** Test transfer speeds and verify file integrity on large-scale SQLite files.

### Version 0.3 — Itinerarium (The Journey / Mobile Head Unit)

#### Version 0.3.1 — Mobile App Shell Initialization
- **Features:** Initialize the lightweight React Native or native Android (Kotlin) mobile project workspace targeted at budget hardware (Moto G Play 2024).
- **Notes:** Set minimum Android API level to support modern storage and file-system read permissions.

#### Version 0.3.2 — External Storage Read Pipeline
- **Features:** Configure the mobile client file-system permissions to read `.mbtiles` vector packages and Valhalla routing graphs directly from the external MicroSD card mount path (`/storage/...`).
- **Notes:** Ensure the app does not attempt to dump massive map files into limited internal phone storage (`/data/data/`).

#### Version 0.3.3 — Offline GPS / GNSS Listener
- **Features:** Implement local location services using standalone GPS hardware. Configure distance and time filters to optimize battery drain and prevent continuous background CPU polling.
- **Notes:** Lock the device permanently in Airplane Mode to confirm absolute off-grid tracking functionality without cell towers.

#### Version 0.3.4 — Tactical Map Styling & Rendering
- **Features:** Integrate MapLibre GL Native into the mobile application. Apply a high-contrast, dark-mode tactical theme optimized for daylight legibility on motorcycle handlebars.
- **Notes:** Test performance inside the Android Studio emulator using mock GPX route playback (`.gpx`/`.kml`).

### Version 0.4 — Tabula Rasa (The Clean Slate / Final Polish)

#### Version 0.4.1 — Air-Gapped Telemetry Audit
- **Features:** Perform a full codebase sweep to verify that zero external tracking scripts, cloud crash-reporting SDKs, or third-party API keys exist in either the desktop or mobile code.
- **Notes:** Confirm the entire system operates with network adapters physically disabled.

#### Version 0.4.2 — Mission Manifest Print Mode
- **Features:** Build a clean, zero-overhead CSS-driven print layout in the desktop workspace that exports structured, text-based roadbook summaries and offline recovery coordinates for physical paper backup.
- **Notes:** Test formatting compatibility for standard cockpit printouts.

#### Version 0.4.3 — Hardware Mounting & Power Stress-Test
- **Features:** Execute real-world hardware validation on the motorcycle handlebar mount. Check vibration tolerance, screen brightness legibility under direct sunlight, and USB buck-converter power stability during long runs.
- **Notes:** Monitor thermal performance of the Moto G Play under sustained map-rendering loads.
