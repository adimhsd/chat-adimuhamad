# 🌐 Cloudflare Tunnel Setup Guide

## Overview

Cloudflare Tunnel membuat aplikasi Anda accessible dari internet tanpa perlu expose port langsung ke internet. Traffic dienkripsi dan diproxy melalui Cloudflare.

**Status**: ✅ Tunnel sudah setup
- **Tunnel ID**: `3fe6820f-8c27-490e-bcea-67da52227312`
- **Domain**: `chat.adi-muhamad.my.id`
- **Public URL**: https://chat.adi-muhamad.my.id

---

## 📋 Prerequisites

1. **Cloudflare Account** dengan domain `adi-muhamad.my.id`
2. **cloudflared CLI** installed (Cloudflare Tunnel client)
3. **Docker** running dengan Blog Assistant app di localhost:3000

---

## 🔧 Installation & Setup

### 1. Install cloudflared

**Ubuntu/Debian:**
```bash
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.tgz
tar -xzf cloudflared.tgz
sudo cp cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared
cloudflared --version
```

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared --version
```

**Windows:**
Download dari: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

---

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

Ini akan membuka browser untuk Cloudflare login. Pilih domain `adi-muhamad.my.id`.

Sertifikat disimpan di: `~/.cloudflared/cert.pem`

---

### 3. Create/List Tunnels

**List existing tunnels:**
```bash
cloudflared tunnel list
```

Expected output:
```
ID                                   NAME                 CNAME                 CREATED              CONNECTIONS
3fe6820f-8c27-490e-bcea-67da52227312 chat                 chat.adi-muhamad.my.id 2025-01-15 10:30:00 Connected
```

**Create tunnel (if needed):**
```bash
cloudflared tunnel create chat
# Output akan memberikan Tunnel ID
```

---

### 4. Configure DNS

**In Cloudflare Dashboard:**

1. Go to: https://dash.cloudflare.com/
2. Select domain: `adi-muhamad.my.id`
3. Go to: **DNS** > **Records**
4. Add/Update CNAME record:
   - **Type**: CNAME
   - **Name**: `chat`
   - **Content**: `3fe6820f-8c27-490e-bcea-67da52227312.cfargotunnel.com`
   - **Proxy status**: Proxied ✅
   - **TTL**: Auto

Save changes.

---

### 5. Create Tunnel Configuration

Create file: `~/.cloudflared/config.yml`

```yaml
tunnel: 3fe6820f-8c27-490e-bcea-67da52227312
credentials-file: /home/adi/.cloudflared/3fe6820f-8c27-490e-bcea-67da52227312.json

ingress:
  # Main application
  - hostname: chat.adi-muhamad.my.id
    service: http://localhost:3000
    
  # Health check endpoint
  - service: http_status:404
```

**Note**: Replace `/home/adi/` with your home directory path.

---

### 6. Run Tunnel

**Method 1: Manual (for testing)**
```bash
cloudflared tunnel run chat
```

**Method 2: System Service (for production)**

**Ubuntu/Debian:**
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
```

**Check logs:**
```bash
sudo journalctl -u cloudflared -f
```

---

## ✅ Verification

### Test Tunnel Access

```bash
# From any internet connection, test the tunnel
curl https://chat.adi-muhamad.my.id/api/health

# Expected response:
# {"status":"healthy","timestamp":"2025-05-14T...","service":"Blog Assistant API","database":"connected"}
```

### Check Tunnel Status

```bash
# Check if tunnel is active
cloudflared tunnel list

# Should show: Connected
```

### Monitor in Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Cloudflare Zero Trust** > **Networks** > **Tunnels**
3. Click tunnel `chat` to see:
   - Connection status (Connected ✓)
   - Connected locations
   - Traffic statistics
   - Recent activity

---

## 🔐 Security

### Enable MTLS (optional but recommended)

```bash
# Require mutual TLS authentication
# Edit ~/.cloudflared/config.yml and add:
#
# mtls:
#   cert: /path/to/cert.pem
#   key: /path/to/key.pem
```

### Rate Limiting

In Cloudflare Dashboard:
1. **Firewall** > **Rate Limiting**
2. Create rule:
   - **Threshold**: 100 requests per 10 seconds
   - **Action**: Block for 1 hour

### WAF (Web Application Firewall)

Enable managed rulesets for additional protection:
1. **Firewall** > **Managed Rules**
2. Enable desired rules (OWASP, etc.)

---

## 🐛 Troubleshooting

### Tunnel Not Connecting

```bash
# Check if localhost:3000 is running
curl http://localhost:3000/api/health

# View tunnel logs
cloudflared tunnel logs chat

# Restart tunnel
pkill cloudflared
cloudflared tunnel run chat
```

### DNS Not Resolving

```bash
# Verify DNS record
nslookup chat.adi-muhamad.my.id
dig chat.adi-muhamad.my.id

# Check Cloudflare DNS propagation
# https://www.whatsmydns.net/
```

### Certificate Errors

```bash
# Re-authenticate
cloudflared tunnel login

# Update certificate
rm ~/.cloudflared/cert.pem
cloudflared tunnel login
```

### Connection Refused

1. Verify Docker app is running: `docker-compose ps`
2. Check if port 3000 is listening: `netstat -tlnp | grep 3000`
3. Test local connection: `curl http://localhost:3000`

---

## 📊 Monitoring

### Real-time Traffic

```bash
# Stream tunnel metrics
cloudflared tunnel run chat --loglevel info

# In another terminal, watch traffic
watch -n 1 'curl -s https://chat.adi-muhamad.my.id/api/health | jq'
```

### Analytics Dashboard

In Cloudflare Dashboard:
1. Go to: **Analytics & Logs** > **Overview**
2. View:
   - Requests: Total traffic
   - Bandwidth: Data usage
   - Security: Threats blocked
   - Errors: HTTP error rates

---

## 🚀 Auto-start at Boot

### Option 1: systemd Service (Recommended)

```bash
sudo cloudflared service install
sudo systemctl restart cloudflared
```

### Option 2: Cron Job

```bash
crontab -e

# Add line:
@reboot /usr/local/bin/cloudflared tunnel run --credentials-file /home/adi/.cloudflared/3fe6820f-8c27-490e-bcea-67da52227312.json chat
```

### Option 3: Docker (in docker-compose.yml)

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run --credentials-file /etc/cloudflared/cert.json chat
    volumes:
      - ~/.cloudflared/cert.json:/etc/cloudflared/cert.json:ro
    networks:
      - chatbot-network
```

---

## 📚 Useful Links

- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Tunnel Configuration: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/
- CLI Reference: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/tunnel-guide/

---

**Last Updated**: May 14, 2026  
**Status**: ✅ Active (3fe6820f-8c27-490e-bcea-67da52227312)
