## HARD RULE — Claude UI Chat Safety
**Never paste command output that may contain API keys into this chat.**
All commands that read from `.env` or print env vars must use the redaction filter:
```bash
| sed 's/=.*/=***/'
```
Claude must never ask for output from commands that could expose secrets.
If structure/config info is needed, Claude generates safe commands that grep
only for key NAMES, never values. Violation of this rule = immediate key rotation.

