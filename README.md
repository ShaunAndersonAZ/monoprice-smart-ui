
# Monoprice Smart Control (Single Amp, 6 Zones)

Mobile-friendly web UI to control a Monoprice 6-Zone amp (Model 10761) over RS-232:
- Zones: **11..16** (single master controller)
- Per-zone **On/Off**, **Volume** slider
- Settings ⚙️ for **Source**, **Bass**, **Treble**, **Balance**, and **Zone Name**
- **Persistent** source names and zone names in SQLite
- Defaults: **Bass=13**, **Treble=8**, **Balance=7**
- No auth (local LAN only)

> References:
> - Monoprice User Manual: https://www.github.com/ShaunAndersonAZ/monoprice-smart-ui/blob/main/10761_Manual_131209.pdf
> - If you ever chain amps, use the **master RS-232 port** only; slaves bridge via ribbon cable. https://www.cinemationinc.com/drivers/elan/pdf/IntegrationNote_Monoprice%2010761_RS232.pdf

## RS-232 command format (this project)
Your amp responds to **no leading `Z`** and requires a leading `<` on set commands:
- Query: `?11`
- Power: `<11PR01` (on), `<11PR00` (off)
- Volume: `<11VO20`
- Source: `<11CH05` (1..6)
- EQ: `<11BS13` (bass), `<11TR08` (treble), `<11BL07` (balance)
Adjust ranges as needed per your manual.

## Install (Ubuntu 24.04)
```bash
sudo apt update
sudo apt install -y nodejs npm
# confirm serial device:
dmesg | grep -i tty
ls -l /dev/ttyUSB*
```

```bash
git clone https://github.com/<your-account>/monoprice-smart-ui.git
cd monoprice-smart-ui
npm install
```

Create `.env`:
```bash
cat > .env <<'EOF'
PORT=8080
SERIAL_PORT=/dev/ttyUSB0
BAUD=9600
AMPS=1
EOF
```

Start:
```bash
npm start
# browse http://<vm-ip>:8080
```

## Add execution user to 'dialout' group
```bash
usermod -a -G dialout <username>
```

## Optional: Systemd service
```bash
sudo tee /etc/systemd/system/monoprice-smart-ui.service >/dev/null <<'UNIT'
[Unit]
Description=Monoprice Smart UI
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/<user>/monoprice-smart-ui
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=8080
Environment=SERIAL_PORT=/dev/ttyUSB0
Environment=BAUD=9600
Environment=AMPS=1

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now monoprice-smart-ui
```

## Optional: Apply EQ defaults once
```bash
npm run init-defaults
```

## Notes
- Volume slider defaults to **0–38**. If your unit differs, adjust the UI (index.html) and validation in server routes.
- If you ever use RS-232–over–TCP (e.g., USR TCP232), you may need a **null modem adapter** (DTE↔DTE).
