"""
BGS SHOP - Auto Diagnostic Web Tool
Toko Servis Komputer BGS SHOP
"""

import platform
import psutil
import subprocess
import json
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, render_template, jsonify, request
import tempfile
import webbrowser

app = Flask(__name__)

# Pre-warm CPU percent (non-blocking, mulai background sampling)
psutil.cpu_percent(interval=None)

# ─────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────

def get_ram_info():
    try:
        ram = psutil.virtual_memory()
        total_gb = round(ram.total / (1024 ** 3), 1)
        used_gb  = round(ram.used  / (1024 ** 3), 1)
        percent  = ram.percent
        return {
            "total_gb": total_gb,
            "used_gb":  used_gb,
            "percent":  percent,
            "status":   "merah"  if total_gb < 4  else ("kuning" if total_gb < 8  else "hijau"),
            "label":    "Kritis" if total_gb < 4  else ("Perlu Perhatian" if total_gb < 8 else "Aman"),
        }
    except Exception as e:
        return {"error": str(e)}


def get_storage_info():
    drives = []
    try:
        for part in psutil.disk_partitions(all=False):
            try:
                usage    = psutil.disk_usage(part.mountpoint)
                total_gb = round(usage.total / (1024 ** 3), 1)
                used_gb  = round(usage.used  / (1024 ** 3), 1)
                free_gb  = round(usage.free  / (1024 ** 3), 1)
                percent  = usage.percent
                status   = "merah"  if total_gb < 128 else ("kuning" if total_gb < 256 else "hijau")
                label    = "Kritis" if total_gb < 128 else ("Perlu Perhatian" if total_gb < 256 else "Aman")
                drives.append({
                    "device":     part.device,
                    "mountpoint": part.mountpoint,
                    "fstype":     part.fstype,
                    "total_gb":   total_gb,
                    "used_gb":    used_gb,
                    "free_gb":    free_gb,
                    "percent":    percent,
                    "status":     status,
                    "label":      label,
                })
            except (PermissionError, OSError):
                continue
    except Exception as e:
        drives.append({"error": str(e)})
    return drives


def get_storage_type():
    """Deteksi SSD/HDD via PowerShell — timeout pendek, non-blocking"""
    storage_types = {}
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command",
                 "Get-PhysicalDisk | Select-Object DeviceId,MediaType,FriendlyName | ConvertTo-Json"],
                capture_output=True, text=True, timeout=3
            )
            if result.returncode == 0 and result.stdout.strip():
                disks = json.loads(result.stdout)
                if isinstance(disks, dict):
                    disks = [disks]
                for disk in disks:
                    name  = disk.get("FriendlyName", f"Disk {disk.get('DeviceId','?')}")
                    media = disk.get("MediaType", "Unknown")
                    storage_types[name] = media
        except Exception:
            pass
    return storage_types


def get_cpu_info():
    try:
        cpu_name           = platform.processor() or "Unknown CPU"
        cpu_cores_physical = psutil.cpu_count(logical=False) or 0
        cpu_cores_logical  = psutil.cpu_count(logical=True)  or 0
        cpu_freq           = psutil.cpu_freq()
        freq_ghz           = round(cpu_freq.max / 1000, 2) if cpu_freq and cpu_freq.max else 0
        # interval=None → non-blocking, pakai nilai dari pre-warm
        cpu_percent        = psutil.cpu_percent(interval=None)

        if platform.system() == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                     r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                cpu_name = cpu_name.strip()
            except Exception:
                pass

        status = "hijau" if cpu_percent < 70 else ("kuning" if cpu_percent < 90 else "merah")
        label  = "Aman"  if cpu_percent < 70 else ("Perlu Perhatian" if cpu_percent < 90 else "Kritis")
        return {
            "name":           cpu_name,
            "cores_physical": cpu_cores_physical,
            "cores_logical":  cpu_cores_logical,
            "freq_ghz":       freq_ghz,
            "usage_percent":  cpu_percent,
            "status":         status,
            "label":          label,
        }
    except Exception as e:
        return {"error": str(e)}


def get_os_info():
    try:
        system   = platform.system()
        release  = platform.release()
        version  = platform.version()
        machine  = platform.machine()
        hostname = platform.node()

        if system == "Windows":
            try:
                import winreg
                key     = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                         r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
                product, _ = winreg.QueryValueEx(key, "ProductName")
                build,   _ = winreg.QueryValueEx(key, "CurrentBuildNumber")
                os_name = f"{product} (Build {build})"
            except Exception:
                os_name = f"Windows {release}"
        else:
            os_name = f"{system} {release}"

        return {
            "name":     os_name,
            "version":  version,
            "machine":  machine,
            "hostname": hostname,
            "status":   "hijau",
            "label":    "Terdeteksi",
        }
    except Exception as e:
        return {"error": str(e)}


def get_battery_info():
    try:
        battery = psutil.sensors_battery()
        if battery is None:
            return {"available": False, "note": "Desktop / No Battery"}

        percent   = battery.percent
        plugged   = battery.power_plugged
        secs_left = battery.secsleft
        status    = "hijau"  if percent >= 70 else ("kuning" if percent >= 40 else "merah")
        label     = "Baik"   if percent >= 70 else ("Perlu Perhatian" if percent >= 40 else "Disarankan Ganti")
        time_left = "Mengisi Daya" if plugged else (
            f"{secs_left // 3600}j {(secs_left % 3600) // 60}m" if secs_left > 0 else "Menghitung..."
        )
        return {
            "available": True,
            "percent":   round(percent, 1),
            "plugged":   plugged,
            "time_left": time_left,
            "status":    status,
            "label":     label,
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


def generate_recommendations(data):
    recs = []

    ram = data.get("ram", {})
    if isinstance(ram, dict) and not ram.get("error"):
        total = ram.get("total_gb", 0)
        if total < 4:
            recs.append({"icon":"💾","level":"merah","title":"Upgrade RAM Segera",
                "desc":f"RAM {total} GB sangat kecil, performa sangat lambat.",
                "action":"Upgrade ke RAM 8 GB DDR4"})
        elif total < 8:
            recs.append({"icon":"💾","level":"kuning","title":"Pertimbangkan Upgrade RAM",
                "desc":f"RAM {total} GB cukup tapi terbatas untuk multitasking.",
                "action":"Upgrade ke RAM 16 GB DDR4"})

    for drive in data.get("storage", []):
        if drive.get("error"): continue
        total = drive.get("total_gb", 0)
        if total < 128:
            recs.append({"icon":"💿","level":"merah","title":f"Upgrade Storage {drive['device']}",
                "desc":f"Storage {total} GB sangat kecil, risiko penuh.",
                "action":"Upgrade ke SSD 512 GB / 1 TB"})
        elif total < 256:
            recs.append({"icon":"💿","level":"kuning","title":f"Storage {drive['device']} Terbatas",
                "desc":f"Storage {total} GB mungkin tidak cukup jangka panjang.",
                "action":"Pertimbangkan upgrade ke SSD 512 GB"})

    bat = data.get("battery", {})
    if bat.get("available"):
        pct = bat.get("percent", 100)
        if pct < 40:
            recs.append({"icon":"🔋","level":"merah","title":"Ganti Baterai Segera",
                "desc":f"Kapasitas baterai hanya {pct}%. Sudah aus dan berisiko.",
                "action":"Ganti baterai original / compatible"})
        elif pct < 70:
            recs.append({"icon":"🔋","level":"kuning","title":"Baterai Perlu Diperhatikan",
                "desc":f"Kapasitas baterai {pct}%. Mulai menurun.",
                "action":"Monitor kondisi baterai secara berkala"})

    if not recs:
        recs.append({"icon":"✅","level":"hijau","title":"Sistem dalam Kondisi Baik",
            "desc":"Semua komponen dalam kondisi normal.",
            "action":"Lakukan perawatan rutin setiap 6 bulan"})
    return recs


# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/scan", methods=["POST"])
def scan():
    try:
        data_req = request.json or {}
        customer = data_req.get("customer", "Unknown").strip() or "Unknown"
        print(f"[SCAN] Mulai scan untuk: {customer}")

        tasks = {
            "ram":          get_ram_info,
            "storage":      get_storage_info,
            "storage_type": get_storage_type,
            "cpu":          get_cpu_info,
            "os":           get_os_info,
            "battery":      get_battery_info,
        }

        results = {}
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {executor.submit(fn): key for key, fn in tasks.items()}
            for future in as_completed(futures, timeout=18):
                key = futures[future]
                try:
                    results[key] = future.result(timeout=15)
                    print(f"[SCAN] ✓ {key}")
                except Exception as e:
                    print(f"[SCAN] ✗ {key}: {e}")
                    results[key] = {"error": str(e)}

        result = {
            "customer":     customer,
            "scan_time":    datetime.now().strftime("%d %B %Y, %H:%M:%S"),
            "ram":          results.get("ram", {}),
            "storage":      results.get("storage", []),
            "storage_type": results.get("storage_type", {}),
            "cpu":          results.get("cpu", {}),
            "os":           results.get("os", {}),
            "battery":      results.get("battery", {}),
        }
        result["recommendations"] = generate_recommendations(result)
        print(f"[SCAN] ✅ Selesai: {customer}")
        return jsonify({"success": True, "data": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/generate-report", methods=["POST"])
def generate_report():
    try:
        data      = request.json or {}
        scan_data = data.get("scan_data", {})
        report_html = render_template("report.html", data=scan_data)
        tmp = tempfile.NamedTemporaryFile(
            delete=False, suffix=".html",
            prefix=f"BGS_Report_{scan_data.get('customer','').replace(' ','_')}_",
            mode="w", encoding="utf-8",
        )
        tmp.write(report_html)
        tmp.close()
        webbrowser.open(f"file://{tmp.name}")
        return jsonify({"success": True, "file": tmp.name})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 55)
    print("  BGS SHOP - Auto Diagnostic Web Tool")
    print("  Buka browser: http://localhost:5000")
    print("=" * 55)
    webbrowser.open("http://localhost:5000")
    app.run(debug=False, host="0.0.0.0", port=5000)
