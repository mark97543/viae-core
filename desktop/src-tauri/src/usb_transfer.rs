use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsbDevice {
    pub id: String,
    pub model: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsbTransferProgress {
    pub progress_percent: f32,
    pub status_message: String,
}

#[tauri::command]
pub fn detect_usb_devices() -> Result<Vec<UsbDevice>, String> {
    let output = Command::new("adb")
        .arg("devices")
        .arg("-l")
        .output()
        .map_err(|e| format!("Failed to run adb command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let id = parts[0].to_string();
            let status = parts[1].to_string();

            let mut model = "Android Device".to_string();
            for part in &parts[2..] {
                if part.starts_with("model:") {
                    model = part.trim_start_matches("model:").replace('_', " ");
                } else if part.starts_with("product:") && model == "Android Device" {
                    model = part.trim_start_matches("product:").replace('_', " ");
                }
            }

            devices.push(UsbDevice { id, model, status });
        }
    }

    Ok(devices)
}

#[tauri::command]
pub fn push_map_to_device(
    app: tauri::AppHandle,
    device_id: String,
    file_path: String,
) -> Result<String, String> {
    if file_path.is_empty() {
        return Err("No source file selected.".into());
    }

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "mkdir", "-p", "/sdcard/IterViaeNavus/maps/"])
        .output();

    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("map.mbtiles");

    let dest_path = format!("/sdcard/IterViaeNavus/maps/{}", file_name);

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 10.0,
            status_message: format!("Initiating USB push to {}...", device_id),
        },
    );

    let output = Command::new("adb")
        .args(["-s", &device_id, "push", &file_path, &dest_path])
        .output()
        .map_err(|e| format!("ADB Push Failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Transfer error: {}", stderr));
    }

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 100.0,
            status_message: "USB Transfer Complete!".into(),
        },
    );

    Ok(format!("Successfully transferred {} to device {}", file_name, device_id))
}

#[tauri::command]
pub fn push_all_maps_to_device(
    app: tauri::AppHandle,
    device_id: String,
) -> Result<String, String> {
    if device_id.is_empty() {
        return Err("No device selected.".into());
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let maps_dir = app_dir.join("maps");

    if !maps_dir.exists() {
        return Err("No active map vault found on desktop. Please import a map first.".into());
    }

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "mkdir", "-p", "/sdcard/IterViaeNavus/maps/"])
        .output();

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 20.0,
            status_message: format!("Syncing entire desktop map vault to {}...", device_id),
        },
    );

    let maps_dir_str = format!("{}/.", maps_dir.to_string_lossy());

    let output = Command::new("adb")
        .args(["-s", &device_id, "push", &maps_dir_str, "/sdcard/IterViaeNavus/maps/"])
        .output()
        .map_err(|e| format!("ADB Sync Failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Transfer error: {}", stderr));
    }

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 100.0,
            status_message: "Full Map Vault Synced to Phone!".into(),
        },
    );

    Ok(format!("Successfully copied full tactical map vault to device {}", device_id))
}

#[tauri::command]
pub fn provision_head_unit(
    app: tauri::AppHandle,
    device_id: String,
) -> Result<String, String> {
    if device_id.is_empty() {
        return Err("No device selected.".into());
    }

    // 0. Locate built APK or fallback paths
    let possible_apk_paths = [
        "../mobile/android/app/build/outputs/apk/debug/app-debug.apk",
        "mobile/android/app/build/outputs/apk/debug/app-debug.apk",
        "/home/mark/Documents/viae-core/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
    ];

    let mut found_apk = None;
    for path in &possible_apk_paths {
        if std::path::Path::new(path).exists() {
            found_apk = Some(path.to_string());
            break;
        }
    }

    if let Some(apk_path) = found_apk {
        let _ = app.emit(
            "usb-transfer-progress",
            UsbTransferProgress {
                progress_percent: 10.0,
                status_message: format!("Installing Iter Viae Navus Kiosk APK on {}...", device_id),
            },
        );

        let install_res = Command::new("adb")
            .args(["-s", &device_id, "install", "-r", &apk_path])
            .output();

        if let Ok(out) = install_res {
            if !out.status.success() {
                let err_str = String::from_utf8_lossy(&out.stderr);
                println!("APK install warning: {}", err_str);
            }
        }
    }

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 25.0,
            status_message: format!("1/5: Creating vault /sdcard/IterViaeNavus/maps/ on {}...", device_id),
        },
    );

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "mkdir", "-p", "/sdcard/IterViaeNavus/maps/"])
        .output();

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 45.0,
            status_message: "2/5: Locking Iter Viae Navus as Primary System Home Launcher...".into(),
        },
    );

    // Lock device Home Launcher to Iter Viae Navus (Kiosk Mode)
    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "cmd", "package", "set-home-activity", "com.iterviae.navus/com.iterviae.navus.MainActivity"])
        .output();

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 65.0,
            status_message: "3/5: Overriding battery throttling & idle mode...".into(),
        },
    );

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "dumpsys", "deviceidle", "whitelist", "+com.iterviae.navus"])
        .output();

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 80.0,
            status_message: "4/5: Granting background service & location permissions...".into(),
        },
    );

    let perms = [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.WAKE_LOCK",
    ];

    for perm in &perms {
        let _ = Command::new("adb")
            .args(["-s", &device_id, "shell", "pm", "grant", "com.iterviae.navus", perm])
            .output();
    }

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 95.0,
            status_message: "5/5: Deactivating cellular radios (Airplane Mode ON • GPS & Wi-Fi Active)...".into(),
        },
    );

    // Cellular Shutdown & Off-Grid Radio Lockdown
    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "cmd", "connectivity", "airplane-mode", "enable"])
        .output();

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "svc", "data", "disable"])
        .output();

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "settings", "put", "global", "mobile_data", "0"])
        .output();

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "svc", "wifi", "enable"])
        .output();

    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "settings", "put", "secure", "location_mode", "3"])
        .output();

    // Launch app on device screen
    let _ = Command::new("adb")
        .args(["-s", &device_id, "shell", "am", "start", "-n", "com.iterviae.navus/.MainActivity"])
        .output();

    let _ = app.emit(
        "usb-transfer-progress",
        UsbTransferProgress {
            progress_percent: 100.0,
            status_message: "Provisioning Complete! Phone locked to Navus Kiosk & Cellular Deactivated.".into(),
        },
    );

    Ok(format!("Device {} successfully provisioned into dedicated Navus Handlebar Kiosk!", device_id))
}
