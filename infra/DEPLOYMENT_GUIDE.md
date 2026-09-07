# Claude Certs — Architecture & Deployment Guide

This guide explains how the **Claude Certified Architect — Foundations** portals are structured and how to run them **locally** or expose them **over the public internet with a custom domain and automated Let's Encrypt HTTPS**.

---

## 1. System Architecture

```
                       ┌────────────────────────┐
                       │  User / Web Browser    │
                       └───────────┬────────────┘
                                   │
           ┌───────────────────────┴───────────────────────┐
           │                                               │
      [Local Mode]                                [Public Domain Mode]
   http://localhost:8000                     https://<your-domain>.com
           │                                               │
           │                                               ▼
           │                                  ┌────────────────────────┐
           │                                  │ Caddy Reverse Proxy    │
           │                                  │ (Ports 80 & 443)       │
           │                                  │ Auto Let's Encrypt TLS │
           │                                  └────────────┬───────────┘
           │                                               │ reverse_proxy :8000
           ▼                                               ▼
   ┌───────────────────────────────────────────────────────────┐
   │                  Unified Node.js Server                   │
   │                       (Port 8000)                         │
   ├──────────────────────────────┬────────────────────────────┤
   │     GET /  (Study Hub)       │  GET /exam-center/ (Exam)  │
   │     GET /api/* (Unified API) │  AI Tutor & Question Gen   │
   └──────────────────────────────┴────────────────────────────┘
```

---

## 2. Quick Start: Running the Portals

Simply double-click:
👉 **`Start Claude Certs.bat`**

You will see an interactive menu:
```text
======================================================================
  🧠 CLAUDE CERTIFIED ARCHITECT — FOUNDATIONS PORTAL LAUNCHER
======================================================================

 [1] Local Mode (Offline / Local network at http://localhost:8000)
 [2] Public Internet Mode (Custom Domain + Auto Let's Encrypt HTTPS)
 [3] View Architecture Diagram & Domain Setup Guide
 [4] Exit

 Select option (1-4) [Default: 1]:
```

---

## 3. Mode 1: Local Mode (Default)

- Runs on **`http://localhost:8000`** without needing any domain or cloud configuration.
- **Study Hub**: `http://localhost:8000/`
- **Exam Center**: `http://localhost:8000/exam-center/`
- All progress is saved locally in your browser's LocalStorage and local JSON database.

---

## 4. Mode 2: Public Internet & Custom Domain Setup

To make your portals accessible to yourself and others anywhere on the internet with a clean domain and trusted HTTPS (green padlock):

### Step 1: Get a Domain (Free or Custom)
You can use any domain you already own, or register a free subdomain in 60 seconds:
- **FreeDomain.one**: Register a free domain (e.g. `your-name.linkpc.net`).
- **DuckDNS**: Register a free subdomain (e.g. `your-name.duckdns.org`).
- **Cloudflare / Namecheap / GoDaddy**: Use your own custom domain.

### Step 2: Create a DNS A-Record
Find the **Public IP** of your server/VM (e.g., Azure VM, AWS EC2, DigitalOcean droplet, or home server):
- Add an **A Record**:
  - **Host / Name**: `your-name.linkpc.net` (or `@` / subdomain)
  - **Target / Value**: `<Your Server Public IP>`
  - **TTL**: Auto / 300 seconds

### Step 3: Open Firewall Ports (80 and 443)
Make sure inbound traffic on HTTP (Port 80) and HTTPS (Port 443) is allowed:
- **Azure Portal**: VM &rarr; Networking &rarr; Inbound Port Rules &rarr; Add rule allowing Destination Ports `80, 443` (Protocol: `TCP`, Action: `Allow`).
- **AWS EC2**: Security Groups &rarr; Inbound Rules &rarr; Allow HTTP (`80`) and HTTPS (`443`) from `0.0.0.0/0`.
- **Windows Defender Firewall**: The launcher automatically configures local firewall rules on Windows.

### Step 4: Run the Launcher
1. Run **`Start Claude Certs.bat`** and select **`[2]`**.
2. Enter your domain name (e.g., `your-name.linkpc.net`).
3. The launcher will:
   - Auto-download the official `caddy.exe` binary if not already present.
   - Configure the `Caddyfile` for your domain.
   - Start the Node.js server and Caddy.
   - Caddy will automatically negotiate with Let's Encrypt, issue a valid SSL certificate, and serve:
     - **`https://your-name.linkpc.net`** &rarr; Study Hub
     - **`https://your-name.linkpc.net/exam-center`** &rarr; Exam Center

---

## 5. Security & Privacy Notes

- **Zero API Key Leakage**: User AI provider API keys are stored locally in the user's browser localStorage and never logged by the server.
- **Local-First Profiles**: User login and certification progress can be isolated per user profile.
- **Automatic HTTPS Redirection**: Any unencrypted HTTP traffic (`http://...`) is automatically upgraded via 308 Permanent Redirect to secure HTTPS (`https://...`).
