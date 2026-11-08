"""
ZKTeco MB460 Biometric Attendance Sync Service
------------------------------------------------
Connects to ZKTeco MB460 over LAN TCP/IP port 4370,
fetches attendance punch records, and posts them to
the Unique Academy system API or Supabase.

Usage:
  python sync.py --test            # Test device connection
  python sync.py --simulate        # Simulate test punches
  python sync.py --ip 192.168.1.201 # Connect to specific device IP
  python sync.py                   # Run normal sync using .env ZKTECO_IP
"""

import os
import sys
import argparse
import json
import urllib.request
from datetime import datetime, timezone, timedelta

# Standard Pakistan Timezone (Asia/Karachi is UTC+5)
PKT = timezone(timedelta(hours=5))

def format_pkt_iso(dt):
    """Ensure timestamp has explicit +05:00 Asia/Karachi offset"""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=PKT).isoformat()
    return dt.astimezone(PKT).isoformat()
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
except ImportError:
    pass

DEVICE_IP = os.getenv("ZKTECO_IP", "192.168.1.201")
DEVICE_PORT = int(os.getenv("ZKTECO_PORT", 4370))
DEVICE_PASSWORD = int(os.getenv("ZKTECO_PASSWORD", 0) or 0)
DEVICE_TIMEOUT = int(os.getenv("ZKTECO_TIMEOUT", 10))
API_ENDPOINT = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000") + "/api/attendance/punch"


def push_punches_to_app(punches):
    """Post list of punches to Next.js API"""
    if not punches:
        print("[INFO] No new punches to sync.")
        return True

    print(f"[INFO] Sending {len(punches)} punch records to {API_ENDPOINT}...")
    try:
        req = urllib.request.Request(
            API_ENDPOINT,
            data=json.dumps(punches).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            if res_body.get("success"):
                print(f"[SUCCESS] Synced {res_body.get('processed')} punches! Matched students: {res_body.get('matchedStudents')}")
                return True
            else:
                print(f"[ERROR] API returned error: {res_body.get('error')}")
                return False
    except urllib.error.URLError as e:
        print(f"[ERROR] Failed to reach application server: {e}")
        return False


def simulate_punches():
    """Simulate test biometric punches for testing without physical device"""
    now = datetime.now().isoformat()
    test_punches = [
        {"zk_user_id": "1", "punched_at": now, "punch_type": "check_in"},
        {"zk_user_id": "2", "punched_at": now, "punch_type": "check_in"},
        {"zk_user_id": "3", "punched_at": now, "punch_type": "check_in"},
    ]
    print("[SIMULATION] Generating 3 test fingerprint punches for Device User IDs 1, 2, 3...")
    return push_punches_to_app(test_punches)


def sync_from_zk_device(ip, port, password, timeout, test_only=False):
    """Connect to physical ZKTeco MB460 device via pyzk"""
    try:
        from zk import ZK
    except ImportError:
        print("[ERROR] pyzk library not installed. Install with: pip install pyzk")
        print("Falling back to simulated connection check...")
        if test_only:
            print(f"[INFO] Configured IP: {ip}:{port}")
            return False
        return False

    zk = ZK(ip, port=port, timeout=timeout, password=password, force_udp=False, ommit_ping=False)
    conn = None

    try:
        print(f"[INFO] Connecting to ZKTeco MB460 at {ip}:{port}...")
        conn = zk.connect()
        conn.disable_device()

        serial = conn.get_serialnumber()
        firmware = conn.get_firmware_version()
        platform = conn.get_platform()
        print(f"[SUCCESS] Connected! Serial: {serial}, Firmware: {firmware}, Platform: {platform}")

        # Keep device time in sync with PC clock automatically
        try:
            conn.set_time(datetime.now())
        except Exception:
            pass

        if test_only:
            conn.enable_device()
            conn.disconnect()
            return True

        # Fetch attendance logs
        print("[INFO] Reading attendance records from device memory...")
        attendances = conn.get_attendance()
        print(f"[INFO] Fetched {len(attendances)} total records from device.")

        punches = []
        for att in attendances:
            punches.append({
                "zk_user_id": str(att.user_id),
                "punched_at": format_pkt_iso(att.timestamp),
                "punch_type": "check_in" if att.punch == 0 else "check_out",
            })

        # Release and disconnect device socket immediately so it doesn't time out
        try:
            conn.enable_device()
        except Exception:
            pass
        try:
            conn.disconnect()
        except Exception:
            pass
        conn = None

        # Send fetched punches to app API
        return push_punches_to_app(punches)

    except Exception as e:
        print(f"[ERROR] Device communication failed: {e}")
        if conn:
            try:
                conn.enable_device()
                conn.disconnect()
            except Exception:
                pass
        return False


def live_monitor(ip, port, password, timeout, interval=4):
    """Continuously poll device every few seconds and sync new punches in real time"""
    import time
    from zk import ZK

    print("\n" + "=" * 65)
    print("  UNIQUE ACADEMY — REAL-TIME LIVE ATTENDANCE MONITOR")
    print(f"  Connected to MB460 at {ip}:{port}")
    print("  Watching for student scans in real time (Keep window open)...")
    print("=" * 65 + "\n")

    zk = ZK(ip, port=port, timeout=timeout, password=password, force_udp=False, ommit_ping=False)
    last_count = -1

    while True:
        conn = None
        try:
            conn = zk.connect()
            try:
                conn.set_time(datetime.now())
            except Exception:
                pass

            attendances = conn.get_attendance()
            curr_count = len(attendances)

            if last_count == -1:
                last_count = curr_count
                punches = [
                    {
                        "zk_user_id": str(att.user_id),
                        "punched_at": format_pkt_iso(att.timestamp),
                        "punch_type": "check_in" if att.punch == 0 else "check_out",
                    }
                    for att in attendances
                ]
                push_punches_to_app(punches)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Active. Synced initial {curr_count} records. Ready for new scans...\n")
            elif curr_count > last_count:
                new_records = attendances[last_count:]
                last_count = curr_count
                print(f"\n⚡ [{datetime.now().strftime('%H:%M:%S')}] NEW FINGERPRINT SCANNED ON MACHINE:")
                punches = []
                for att in new_records:
                    print(f"   -> Device User ID: {att.user_id} scanned successfully!")
                    punches.append({
                        "zk_user_id": str(att.user_id),
                        "punched_at": format_pkt_iso(att.timestamp),
                        "punch_type": "check_in" if att.punch == 0 else "check_out",
                    })
                push_punches_to_app(punches)
                print(f"   -> Updated Web App Attendance Sheet instantly.\n")

            conn.disconnect()
        except KeyboardInterrupt:
            print("\n[STOPPED] Live monitor stopped.")
            break
        except Exception:
            pass
        finally:
            if conn:
                try:
                    conn.disconnect()
                except Exception:
                    pass

        time.sleep(interval)
def list_device_users(ip, port, password, timeout):
    """List all enrolled user IDs currently registered on the ZKTeco device"""
    try:
        from zk import ZK
    except ImportError:
        print("[ERROR] pyzk library not installed.")
        return

    zk = ZK(ip, port=port, timeout=timeout, password=password, force_udp=False, ommit_ping=False)
    conn = None
    try:
        print(f"[INFO] Connecting to ZKTeco MB460 at {ip}:{port}...")
        conn = zk.connect()
        users = conn.get_users()
        print(f"\n[DEVICE USERS] Total registered on device: {len(users)}")
        print("-" * 50)
        print(f"{'Device User ID':<20} | {'Name on Machine'}")
        print("-" * 50)
        for u in users:
            print(f"ID: {u.user_id:<16} | {u.name or 'No Name'}")
        print("-" * 50)
        print("Tip: Use these exact Device User IDs when enrolling students in the Web App!\n")
        conn.disconnect()
    except Exception as e:
        print(f"[ERROR] Failed to list users: {e}")
        if conn:
            try:
                conn.disconnect()
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="ZKTeco MB460 Attendance Sync")
    parser.add_argument("--test", action="store_true", help="Test connection to device without syncing")
    parser.add_argument("--live", action="store_true", help="Continuously sync attendance in real time as students punch")
    parser.add_argument("--users", action="store_true", help="List all enrolled users on the device")
    parser.add_argument("--simulate", action="store_true", help="Send simulated test punches to the app")
    parser.add_argument("--ip", type=str, default=DEVICE_IP, help="ZKTeco device IP address")
    parser.add_argument("--port", type=int, default=DEVICE_PORT, help="Port (default: 4370)")

    args = parser.parse_args()

    if args.simulate:
        simulate_punches()
        return

    if not args.ip:
        print("[WARNING] No ZKTECO_IP set. Configure ZKTECO_IP in .env.local or pass --ip 192.168.1.xxx")
        print("Tip: Use 'python sync.py --simulate' to test without physical hardware.")
        return

    if args.users:
        list_device_users(
            ip=args.ip,
            port=args.port,
            password=DEVICE_PASSWORD,
            timeout=DEVICE_TIMEOUT,
        )
        return

    if args.live:
        live_monitor(
            ip=args.ip,
            port=args.port,
            password=DEVICE_PASSWORD,
            timeout=DEVICE_TIMEOUT,
        )
        return

    sync_from_zk_device(
        ip=args.ip,
        port=args.port,
        password=DEVICE_PASSWORD,
        timeout=DEVICE_TIMEOUT,
        test_only=args.test,
    )


if __name__ == "__main__":
    main()
