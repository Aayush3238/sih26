export interface AttackStep {
  label: string;
  description: string;
  features: number[];
}

export interface AttackScenario {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  icon: string;
  steps: AttackStep[];
}

// Features: [Flow Duration, Total Fwd Pkts, Total Bwd Pkts, Fwd Len Total, Bwd Len Total,
//            Fwd Pkt Len Mean, Bwd Pkt Len Mean, Flow Bytes/s, Flow Pkts/s, Fwd IAT Mean, Bwd IAT Mean, Subflow Fwd Bytes]
// All values normalized to [0, 1]

export const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    id: "portscan",
    name: "Port Scan",
    description: "Attacker probes your network to find open ports and running services before launching an exploit.",
    severity: "medium",
    icon: "🔍",
    steps: [
      {
        label: "Reconnaissance",
        description: "Scanner sends SYN packets to common ports (22, 80, 443, 3389) to map live hosts.",
        features: [0.05, 0.1, 0.05, 0.02, 0.01, 0.1, 0.1, 0.05, 0.8, 0.02, 0.02, 0.02],
      },
      {
        label: "Reconnaissance",
        description: "Scanning expands to high ports (8000-9000) and uncommon services to find hidden endpoints.",
        features: [0.08, 0.15, 0.08, 0.03, 0.02, 0.12, 0.1, 0.08, 0.85, 0.03, 0.03, 0.03],
      },
      {
        label: "Reconnaissance",
        description: "SYN flood intensifies — thousands of half-open connections across the entire /24 subnet.",
        features: [0.12, 0.25, 0.05, 0.04, 0.01, 0.08, 0.05, 0.15, 0.92, 0.01, 0.01, 0.04],
      },
      {
        label: "Initial Access",
        description: "Open ports identified: SSH (22), HTTP (80), RDP (3389). Attacker selects target service.",
        features: [0.15, 0.2, 0.15, 0.05, 0.03, 0.15, 0.12, 0.12, 0.7, 0.05, 0.05, 0.05],
      },
      {
        label: "Discovery",
        description: "Service fingerprinting — banner grabbing and version detection on discovered ports.",
        features: [0.2, 0.3, 0.2, 0.08, 0.06, 0.2, 0.18, 0.1, 0.6, 0.08, 0.08, 0.08],
      },
    ],
  },
  {
    id: "ddos",
    name: "DDoS Attack",
    description: "Distributed denial-of-service flood targeting your web server to take it offline.",
    severity: "critical",
    icon: "💥",
    steps: [
      {
        label: "Reconnaissance",
        description: "Low-rate probing of target server to measure baseline response times and identify WAF rules.",
        features: [0.1, 0.08, 0.08, 0.03, 0.03, 0.15, 0.15, 0.06, 0.4, 0.1, 0.1, 0.03],
      },
      {
        label: "Resource Development",
        description: "Attacker coordinates botnet nodes — C2 beacons exchanged with compromised IoT devices.",
        features: [0.15, 0.12, 0.1, 0.05, 0.04, 0.2, 0.18, 0.08, 0.45, 0.08, 0.08, 0.05],
      },
      {
        label: "Initial Access",
        description: "First wave of HTTP flood — small burst from 50 botnet nodes simultaneously.",
        features: [0.25, 0.35, 0.1, 0.15, 0.04, 0.25, 0.12, 0.3, 0.75, 0.05, 0.02, 0.15],
      },
      {
        label: "Execution",
        description: "Full-scale SYN flood — 10,000 packets/sec from 500 distributed sources.",
        features: [0.4, 0.7, 0.05, 0.3, 0.02, 0.2, 0.08, 0.65, 0.95, 0.01, 0.01, 0.3],
      },
      {
        label: "Impact",
        description: "Server overwhelmed — connection table full, legitimate users unable to connect. Service DOWN.",
        features: [0.6, 0.95, 0.02, 0.5, 0.01, 0.15, 0.05, 0.9, 0.98, 0.005, 0.005, 0.5],
      },
    ],
  },
  {
    id: "bruteforce",
    name: "Brute Force SSH",
    description: "Automated password guessing against your SSH service to gain remote access.",
    severity: "high",
    icon: "🔐",
    steps: [
      {
        label: "Reconnaissance",
        description: "Single SSH connection attempt to verify port 22 is open and responding.",
        features: [0.08, 0.05, 0.05, 0.02, 0.02, 0.15, 0.15, 0.04, 0.3, 0.15, 0.15, 0.02],
      },
      {
        label: "Initial Access",
        description: "Slow brute force — 10 login attempts per minute with common passwords.",
        features: [0.15, 0.12, 0.12, 0.05, 0.05, 0.2, 0.2, 0.08, 0.5, 0.1, 0.1, 0.05],
      },
      {
        label: "Credential Access",
        description: "Credential stuffing accelerates — 100 attempts/min from password dictionary.",
        features: [0.25, 0.3, 0.3, 0.1, 0.1, 0.18, 0.18, 0.15, 0.7, 0.06, 0.06, 0.1],
      },
      {
        label: "Execution",
        description: "Successful login achieved — attacker gains shell access as www-data user.",
        features: [0.35, 0.25, 0.35, 0.12, 0.15, 0.22, 0.25, 0.12, 0.55, 0.08, 0.1, 0.12],
      },
      {
        label: "Privilege Escalation",
        description: "Attacker exploits kernel vulnerability to escalate from www-data to root.",
        features: [0.4, 0.4, 0.45, 0.2, 0.25, 0.3, 0.35, 0.18, 0.5, 0.05, 0.08, 0.2],
      },
      {
        label: "Persistence",
        description: "SSH key injected into authorized_keys — attacker ensures permanent backdoor access.",
        features: [0.3, 0.2, 0.3, 0.08, 0.12, 0.2, 0.25, 0.1, 0.4, 0.1, 0.12, 0.08],
      },
    ],
  },
  {
    id: "sqlinjection",
    name: "SQL Injection",
    description: "Attacker exploits vulnerable web form to extract database contents and steal user data.",
    severity: "critical",
    icon: "💉",
    steps: [
      {
        label: "Reconnaissance",
        description: "Normal HTTP requests to map website structure — login page, search form, API endpoints.",
        features: [0.1, 0.1, 0.1, 0.04, 0.04, 0.2, 0.2, 0.06, 0.5, 0.12, 0.12, 0.04],
      },
      {
        label: "Initial Access",
        description: "Testing for SQL injection — sending ' OR 1=1 -- in login form fields.",
        features: [0.15, 0.12, 0.15, 0.06, 0.08, 0.25, 0.3, 0.08, 0.55, 0.1, 0.12, 0.06],
      },
      {
        label: "Execution",
        description: "UNION-based injection extracting table names from information_schema database.",
        features: [0.25, 0.2, 0.4, 0.1, 0.2, 0.3, 0.45, 0.12, 0.45, 0.08, 0.15, 0.1],
      },
      {
        label: "Collection",
        description: "Dumping user_credentials table — usernames, emails, and hashed passwords extracted.",
        features: [0.4, 0.15, 0.8, 0.08, 0.5, 0.25, 0.6, 0.25, 0.3, 0.05, 0.2, 0.08],
      },
      {
        label: "Exfiltration",
        description: "Stolen data exfiltrated via encoded HTTP POST to attacker-controlled server.",
        features: [0.5, 0.3, 0.6, 0.15, 0.45, 0.3, 0.55, 0.35, 0.35, 0.06, 0.15, 0.15],
      },
    ],
  },
  {
    id: "ransomware",
    name: "Ransomware Spread",
    description: "Malware encrypts files and spreads laterally across the network demanding payment.",
    severity: "critical",
    icon: "🔒",
    steps: [
      {
        label: "Initial Access",
        description: "Phishing email opened — malicious macro executes PowerShell dropper on workstation.",
        features: [0.12, 0.08, 0.08, 0.03, 0.03, 0.18, 0.18, 0.05, 0.35, 0.15, 0.15, 0.03],
      },
      {
        label: "Execution",
        description: "PowerShell downloads secondary payload from C2 — base64-encoded binary in memory.",
        features: [0.2, 0.15, 0.2, 0.08, 0.1, 0.25, 0.3, 0.15, 0.45, 0.1, 0.12, 0.08],
      },
      {
        label: "Discovery",
        description: "Network enumeration — scanning for SMB shares, mapping domain controllers and file servers.",
        features: [0.3, 0.25, 0.3, 0.1, 0.12, 0.2, 0.22, 0.12, 0.5, 0.08, 0.1, 0.1],
      },
      {
        label: "Lateral Movement",
        description: "SMB relay attack to 3 workstations using stolen credentials — PsExec deployed.",
        features: [0.45, 0.4, 0.5, 0.2, 0.25, 0.28, 0.3, 0.22, 0.55, 0.06, 0.08, 0.2],
      },
      {
        label: "Collection",
        description: "Sensitive files identified — financial docs, databases, backups staged in temp folder.",
        features: [0.55, 0.5, 0.6, 0.35, 0.4, 0.35, 0.38, 0.3, 0.45, 0.05, 0.06, 0.35],
      },
      {
        label: "Impact",
        description: "Files encrypted with AES-256 — ransom note dropped on every directory. Network halted.",
        features: [0.7, 0.8, 0.3, 0.6, 0.2, 0.4, 0.35, 0.55, 0.6, 0.03, 0.02, 0.6],
      },
    ],
  },
  {
    id: "dataexfil",
    name: "Data Exfiltration",
    description: "Insider or compromised account slowly siphons sensitive data to an external cloud storage.",
    severity: "high",
    icon: "📤",
    steps: [
      {
        label: "Discovery",
        description: "User accesses shared drives and databases they don't normally use — mapping data locations.",
        features: [0.15, 0.1, 0.12, 0.04, 0.05, 0.2, 0.22, 0.06, 0.4, 0.12, 0.12, 0.04],
      },
      {
        label: "Collection",
        description: "Large file downloads from database — query results exported as CSV and JSON files.",
        features: [0.3, 0.2, 0.5, 0.1, 0.35, 0.25, 0.45, 0.2, 0.35, 0.08, 0.15, 0.1],
      },
      {
        label: "Command and Control",
        description: "HTTPS tunnel established to cloud storage service — encrypted data stream begins.",
        features: [0.45, 0.3, 0.4, 0.15, 0.3, 0.3, 0.4, 0.25, 0.35, 0.08, 0.1, 0.15],
      },
      {
        label: "Exfiltration",
        description: "Steady data upload — 500KB/s to external Dropbox via encrypted HTTPS tunnel.",
        features: [0.6, 0.35, 0.5, 0.2, 0.4, 0.35, 0.5, 0.4, 0.3, 0.06, 0.08, 0.2],
      },
      {
        label: "Exfiltration",
        description: "Upload accelerates — bulk transfer of entire database dumps. 2GB exfiltrated so far.",
        features: [0.75, 0.4, 0.6, 0.25, 0.5, 0.4, 0.55, 0.55, 0.28, 0.05, 0.06, 0.25],
      },
    ],
  },
];

export function getScenarioById(id: string): AttackScenario | undefined {
  return ATTACK_SCENARIOS.find((s) => s.id === id);
}
