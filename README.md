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


## Version v0.1 Fundamentum (The foundation)

This version will focus on templating the file structure and basic functionality of the app.

### Android
- [ ] Set up a emulater and test the configurations

### Desktop
- [X] Templated Tauri App 
- [X] Set Up Splash Screen for starting up the app
- [X] Set up window title bar 
- [X] Set up window manager icon
- [X] Set up Menu Bar and make a file menu with a exit feature
- [X] Make the map tools and test with a small state
- [X] Set up Maptool to load tool
- [X] Maptool warning to delete old maps
- [X] Process maps and save new ones to folder. 
- [X] Move file temp basis to work with it
- [X] Build mbtile File
- [X] Build routing.tar
- [X] Build gazetteer.db
- [X] Set up delete function when starting process 
- [X] Set up statuser for this whole thing to let the uiser know we are working. 
 
### General
- [X] Set up git and file structure 

## Version v0.2 Tabula (The Map)
This will place the map on the screen and allow some manipulation. Routing will come at a different time. We will also be starting our mobile app loading here where when a user plugs in the phone to be converted we could make it our own. 

### Desktop App
- [X] Display Map
  - Resolved `maplibregl` namespace TypeScript errors.
  - Integrated multiple map themes.
  - Set default map theme to `klokantech-basic` (with `osm-bright` as a secondary option).
- [X] Theme Switeher 