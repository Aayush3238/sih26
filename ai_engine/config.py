ATTACK_STAGES = [
    "Reconnaissance", "Resource Development", "Initial Access", "Execution",
    "Persistence", "Privilege Escalation", "Defense Evasion", "Credential Access",
    "Discovery", "Lateral Movement", "Collection", "Command and Control",
    "Exfiltration", "Impact",
]

NUM_STAGES = len(ATTACK_STAGES)
FEATURE_DIM = 12
WINDOW_SIZE = 30
