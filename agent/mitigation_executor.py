import sys
import os
import subprocess
import platform
from typing import Optional

IS_WINDOWS = platform.system() == "Windows"


def execute_mitigation(
    attacker_ip: str,
    action: str = "DROP",
    reason: str = "",
    dry_run: bool = False,
) -> dict:
    """
    Execute a firewall rule to block the attacker IP.
    On Linux: uses iptables.
    On Windows/macOS: logs the rule (simulated mitigation).
    """
    rule = f"-A INPUT -s {attacker_ip} -j {action}"

    if IS_WINDOWS or dry_run:
        return {
            "success": True,
            "rule": f"iptables {rule}",
            "message": f"[SIMULATED] Would enforce: iptables {rule} (Reason: {reason})",
            "simulated": True,
        }

    try:
        cmd = ["sudo", "iptables", "-A", "INPUT", "-s", attacker_ip, "-j", action]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return {
                "success": True,
                "rule": f"iptables {rule}",
                "message": f"Rule enforced: {rule} (Reason: {reason})",
                "simulated": False,
            }
        else:
            return {
                "success": False,
                "rule": f"iptables {rule}",
                "message": f"iptables error: {result.stderr.strip()}",
                "simulated": False,
            }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "rule": f"iptables {rule}",
            "message": "iptables command timed out",
            "simulated": False,
        }
    except FileNotFoundError:
        return {
            "success": False,
            "rule": f"iptables {rule}",
            "message": "iptables not found. Is this a Linux system?",
            "simulated": False,
        }
    except Exception as e:
        return {
            "success": False,
            "rule": f"iptables {rule}",
            "message": f"Error: {str(e)}",
            "simulated": False,
        }


def remove_mitigation(attacker_ip: str, action: str = "DROP") -> dict:
    """Remove a previously added iptables rule."""
    if IS_WINDOWS:
        return {
            "success": True,
            "message": f"[SIMULATED] Would remove: iptables -D INPUT -s {attacker_ip} -j {action}",
            "simulated": True,
        }

    try:
        cmd = ["sudo", "iptables", "-D", "INPUT", "-s", attacker_ip, "-j", action]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return {"success": True, "message": f"Rule removed for {attacker_ip}"}
        else:
            return {"success": False, "message": f"Error: {result.stderr.strip()}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


if __name__ == "__main__":
    ip = sys.argv[1] if len(sys.argv) > 1 else "10.0.0.99"
    print(f"Testing mitigation for {ip}...")
    result = execute_mitigation(ip, reason="Test mitigation")
    print(f"Result: {result}")
