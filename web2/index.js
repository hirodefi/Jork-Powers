'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts) {
    opts = opts || {};
    try {
        return execSync(cmd, {
            encoding: 'utf8',
            timeout: opts.timeout || 60000,
            cwd: opts.cwd || process.cwd()
        }).trim();
    } catch(e) {
        return 'Error: ' + (e.stderr || e.message || '').trim().slice(0, 500);
    }
}

// ---- System Info ----

function systemInfo() {
    return {
        os: sh('uname -a'),
        ip: sh('curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null') || 'unknown',
        node: sh('node --version 2>/dev/null') || 'not installed',
        npm: sh('npm --version 2>/dev/null') || 'not installed',
        nginx: sh('nginx -v 2>&1') || 'not installed',
        pm2: sh('pm2 --version 2>/dev/null') || 'not installed',
        mongo: sh('mongod --version 2>/dev/null | head -1') || 'not installed',
        disk: sh('df -h / | tail -1'),
        memory: sh('free -h | grep Mem'),
    };
}

// ---- Nginx ----

function nginxSite(domain, port, options) {
    if (!domain || !port) return 'Usage: nginx-site <domain> <port> [--ssl] [--ws]';
    options = options || {};

    let config = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;`;

    if (options.ws) {
        config += `
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;`;
    }

    config += `
    }
}`;

    const sitePath = '/etc/nginx/sites-available/' + domain;
    const enablePath = '/etc/nginx/sites-enabled/' + domain;

    fs.writeFileSync(sitePath, config);
    try { fs.symlinkSync(sitePath, enablePath); } catch(e) {}

    const testResult = sh('nginx -t 2>&1');
    if (testResult.indexOf('successful') !== -1) {
        sh('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null');
        let result = 'Nginx configured for ' + domain + ' -> localhost:' + port + '\n' + testResult;
        if (options.ssl) {
            result += '\n\nRun SSL next: node index.js ssl ' + domain;
        }
        return result;
    }
    return 'Nginx config written but test failed:\n' + testResult;
}

function nginxStatus() {
    const running = sh('systemctl is-active nginx 2>/dev/null') || sh('pgrep nginx >/dev/null && echo active || echo inactive');
    const sites = sh('ls /etc/nginx/sites-enabled/ 2>/dev/null') || 'none';
    return 'Nginx: ' + running + '\nEnabled sites:\n' + sites;
}

function nginxRemove(domain) {
    if (!domain) return 'Usage: nginx-remove <domain>';
    try { fs.unlinkSync('/etc/nginx/sites-enabled/' + domain); } catch(e) {}
    try { fs.unlinkSync('/etc/nginx/sites-available/' + domain); } catch(e) {}
    sh('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null');
    return 'Removed nginx config for ' + domain;
}

// ---- SSL (Certbot) ----

function ssl(domain) {
    if (!domain) return 'Usage: ssl <domain>';

    // Check certbot installed
    const certbot = sh('which certbot 2>/dev/null');
    if (!certbot || certbot.indexOf('Error') !== -1) {
        return 'Certbot not installed. Install with:\n  apt install certbot python3-certbot-nginx';
    }

    return sh('certbot --nginx -d ' + domain + ' --non-interactive --agree-tos --register-unsafely-without-email', { timeout: 120000 });
}

function sslRenew() {
    return sh('certbot renew --dry-run', { timeout: 60000 });
}

// ---- SSH Keys ----

function sshKeygen(name) {
    name = name || 'id_ed25519';
    const keyPath = path.join(process.env.HOME || '/root', '.ssh', name);
    if (fs.existsSync(keyPath)) {
        return 'Key already exists at ' + keyPath + '\nPublic key:\n' + fs.readFileSync(keyPath + '.pub', 'utf8').trim();
    }
    sh('ssh-keygen -t ed25519 -f ' + keyPath + ' -N ""');
    try {
        return 'Key created: ' + keyPath + '\nPublic key (add this to your server):\n' + fs.readFileSync(keyPath + '.pub', 'utf8').trim();
    } catch(e) {
        return 'Error reading key: ' + e.message;
    }
}

function sshTest(host) {
    if (!host) return 'Usage: ssh-test <user@host>';
    return sh('ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ' + host + ' "echo connected && uname -a" 2>&1', { timeout: 15000 });
}

// ---- Deploy (SSH) ----

function deploySsh(localDir, remoteTarget, clean) {
    if (!localDir || !remoteTarget) return 'Usage: deploy-ssh <local-dir> <user@host:/path> [--clean]';
    var flags = '-avz';
    if (clean) flags += ' --delete';
    return sh('rsync ' + flags + ' ' + localDir + '/ ' + remoteTarget + '/', { timeout: 300000 });
}

// ---- Deploy (Vercel) ----

function deployVercel(projectDir) {
    projectDir = projectDir || '.';
    const vercel = sh('which vercel 2>/dev/null');
    if (!vercel || vercel.indexOf('Error') !== -1) {
        return 'Vercel CLI not installed. Install with:\n  npm install -g vercel\n  vercel login';
    }
    return sh('vercel --prod --yes', { cwd: projectDir, timeout: 300000 });
}

// ---- PM2 ----

function pm2Start(script, name, cwd) {
    if (!script) return 'Usage: pm2-start <script> [name] [cwd]';
    let cmd = 'pm2 start ' + script;
    if (name) cmd += ' --name ' + name;
    if (cwd) cmd += ' --cwd ' + cwd;
    const result = sh(cmd);
    sh('pm2 save');
    return result;
}

function pm2List() {
    return sh('pm2 list');
}

function pm2Stop(name) {
    if (!name) return 'Usage: pm2-stop <name>';
    return sh('pm2 stop ' + name);
}

function pm2Logs(name, lines) {
    name = name || 'all';
    lines = lines || '30';
    return sh('pm2 logs ' + name + ' --lines ' + lines + ' --nostream');
}

// ---- MongoDB ----

function mongoStatus() {
    const running = sh('systemctl is-active mongod 2>/dev/null') || sh('pgrep mongod >/dev/null && echo active || echo inactive');
    return 'MongoDB: ' + running;
}

function mongoInstall() {
    return `MongoDB install (Ubuntu/Debian):
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  sudo apt update && sudo apt install -y mongodb-org
  sudo systemctl start mongod && sudo systemctl enable mongod`;
}

// ---- Node/NPM ----

function npmInit(projectDir, template) {
    projectDir = projectDir || '.';
    if (template === 'next' || template === 'nextjs') {
        return sh('npx create-next-app@latest ' + projectDir + ' --yes', { timeout: 180000 });
    }
    if (template === 'react' || template === 'vite') {
        return sh('npm create vite@latest ' + projectDir + ' -- --template react', { timeout: 120000 });
    }
    if (template === 'express') {
        sh('mkdir -p ' + projectDir);
        sh('npm init -y', { cwd: projectDir });
        sh('npm install express', { cwd: projectDir, timeout: 60000 });
        return 'Express project initialized at ' + projectDir;
    }
    return sh('npm init -y', { cwd: projectDir });
}

// ---- Firewall ----

function firewallSetup() {
    sh('ufw allow 22');
    sh('ufw allow 80');
    sh('ufw allow 443');
    const result = sh('ufw --force enable');
    return 'Firewall configured (22, 80, 443 open)\n' + result;
}

function firewallStatus() {
    return sh('ufw status verbose 2>/dev/null') || 'ufw not available';
}

function firewallAllow(port) {
    if (!port) return 'Usage: firewall-allow <port>';
    return sh('ufw allow ' + port);
}

// ---- REST API scaffold ----

function apiScaffold(name) {
    if (!name) return 'Usage: api-scaffold <project-name>';
    sh('mkdir -p ' + name);
    sh('npm init -y', { cwd: name });
    sh('npm install express cors dotenv', { cwd: name, timeout: 60000 });

    const indexJs = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Add your routes here

app.listen(PORT, () => console.log('API running on port ' + PORT));
`;
    fs.writeFileSync(path.join(name, 'index.js'), indexJs);
    fs.writeFileSync(path.join(name, '.env'), 'PORT=3001\n');

    return 'REST API scaffolded at ' + name + '\nRun: cd ' + name + ' && node index.js';
}

// ---- Router ----

// ---- SPA nginx config ----

function nginxSpa(domain, dir) {
    if (!domain || !dir) return 'Usage: nginx-spa <domain> <dir>';

    var config = `server {
    listen 80;
    server_name ${domain};

    root ${dir};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}`;

    var sitePath = '/etc/nginx/sites-available/' + domain;
    var enablePath = '/etc/nginx/sites-enabled/' + domain;
    fs.writeFileSync(sitePath, config);
    try { fs.symlinkSync(sitePath, enablePath); } catch(e) {}
    var testResult = sh('nginx -t 2>&1');
    if (testResult.indexOf('successful') !== -1) {
        sh('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null');
        return 'SPA config written for ' + domain + ' -> ' + dir + '\n' + testResult;
    }
    return 'Config written but nginx test failed:\n' + testResult;
}

// ---- API + Frontend combined nginx ----

function nginxApiFrontend(domain, apiPort, frontendPort) {
    if (!domain || !apiPort || !frontendPort) return 'Usage: nginx-api-frontend <domain> <api-port> <frontend-port>';

    var config = `server {
    listen 80;
    server_name ${domain};

    location /api {
        proxy_pass http://localhost:${apiPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:${frontendPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

    var sitePath = '/etc/nginx/sites-available/' + domain;
    var enablePath = '/etc/nginx/sites-enabled/' + domain;
    fs.writeFileSync(sitePath, config);
    try { fs.symlinkSync(sitePath, enablePath); } catch(e) {}
    var testResult = sh('nginx -t 2>&1');
    if (testResult.indexOf('successful') !== -1) {
        sh('systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null');
        return 'API+Frontend config for ' + domain + ' (API :' + apiPort + ', Frontend :' + frontendPort + ')\n' + testResult;
    }
    return 'Config written but nginx test failed:\n' + testResult;
}

// ---- Deploy checklist ----

function deployChecklist(domain) {
    var checks = [];
    checks.push('=== Pre-Launch Checklist' + (domain ? ' for ' + domain : '') + ' ===\n');

    // SSL
    if (domain) {
        var certExists = sh('ls /etc/letsencrypt/live/' + domain + '/fullchain.pem 2>/dev/null');
        checks.push('[' + (certExists ? 'OK' : '!!') + '] SSL certificate' + (certExists ? '' : ' - run: node index.js ssl ' + domain));
    } else {
        checks.push('[??] SSL certificate - specify domain to check');
    }

    // Firewall
    var ufwStatus = sh('ufw status 2>/dev/null');
    checks.push('[' + (ufwStatus.indexOf('active') !== -1 ? 'OK' : '!!') + '] Firewall (ufw)' + (ufwStatus.indexOf('active') !== -1 ? '' : ' - run: node index.js firewall-setup'));

    // Nginx
    var nginxActive = sh('systemctl is-active nginx 2>/dev/null');
    checks.push('[' + (nginxActive === 'active' ? 'OK' : '!!') + '] Nginx' + (nginxActive === 'active' ? '' : ' - install/start nginx'));

    // PM2
    var pm2Running = sh('pm2 list 2>/dev/null | grep online | wc -l').trim();
    checks.push('[' + (parseInt(pm2Running) > 0 ? 'OK' : '!!') + '] PM2 processes (' + pm2Running + ' online)');

    // Node
    var nodeVer = sh('node --version 2>/dev/null');
    checks.push('[' + (nodeVer ? 'OK' : '!!') + '] Node.js ' + (nodeVer || 'not installed'));

    // DNS
    if (domain) {
        var dns = sh('dig +short ' + domain + ' 2>/dev/null');
        var serverIp = sh('curl -s ifconfig.me 2>/dev/null');
        checks.push('[' + (dns.trim() === serverIp.trim() ? 'OK' : '!!') + '] DNS for ' + domain + (dns ? ' -> ' + dns.trim() : ' - not resolving'));
    }

    checks.push('\n[OK] = good | [!!] = needs attention | [??] = check manually');
    return checks.join('\n');
}

function run(args) {
    const cmd = args[0];
    const rest = args.slice(1);

    switch(cmd) {
        // System
        case 'info':            return JSON.stringify(systemInfo(), null, 2);

        // Nginx
        case 'nginx-site':      return nginxSite(rest[0], rest[1], { ssl: rest.includes('--ssl'), ws: rest.includes('--ws') });
        case 'nginx-spa':       return nginxSpa(rest[0], rest[1]);
        case 'nginx-api-frontend': return nginxApiFrontend(rest[0], rest[1], rest[2]);
        case 'nginx-status':    return nginxStatus();
        case 'nginx-remove':    return nginxRemove(rest[0]);

        // SSL
        case 'ssl':             return ssl(rest[0]);
        case 'ssl-renew':       return sslRenew();

        // SSH
        case 'ssh-keygen':      return sshKeygen(rest[0]);
        case 'ssh-test':        return sshTest(rest[0]);

        // Deploy
        case 'deploy-ssh':      return deploySsh(rest[0], rest[1], rest.includes('--clean'));
        case 'deploy-vercel':   return deployVercel(rest[0]);

        // PM2
        case 'pm2-start':       return pm2Start(rest[0], rest[1], rest[2]);
        case 'pm2-list':        return pm2List();
        case 'pm2-stop':        return pm2Stop(rest[0]);
        case 'pm2-logs':        return pm2Logs(rest[0], rest[1]);

        // MongoDB
        case 'mongo-status':    return mongoStatus();
        case 'mongo-install':   return mongoInstall();

        // Scaffold
        case 'npm-init':        return npmInit(rest[0], rest[1]);
        case 'api-scaffold':    return apiScaffold(rest[0]);

        // Checklist
        case 'deploy-checklist': return deployChecklist(rest[0]);

        // Firewall
        case 'firewall-setup':  return firewallSetup();
        case 'firewall-status': return firewallStatus();
        case 'firewall-allow':  return firewallAllow(rest[0]);

        default:                return help();
    }
}

function help() {
    return `Web2 Power - Server, Deployment, Infrastructure

System:
  info                                    Server info (IP, OS, installed tools)

Nginx:
  nginx-site <domain> <port> [--ssl --ws] Configure reverse proxy
  nginx-spa <domain> <dir>                SPA config (try_files, caching, gzip)
  nginx-api-frontend <domain> <api-port> <frontend-port>  Combined API + frontend proxy
  nginx-status                            Show nginx status and sites
  nginx-remove <domain>                   Remove site config

SSL:
  ssl <domain>                            Certbot SSL for domain
  ssl-renew                               Test certificate renewal

SSH:
  ssh-keygen [name]                       Generate Ed25519 keypair
  ssh-test <user@host>                    Test SSH connection

Deploy:
  deploy-ssh <local-dir> <user@host:/path> [--clean]  Deploy via rsync (--clean removes remote extras)
  deploy-vercel [dir]                       Deploy to Vercel

PM2:
  pm2-start <script> [name] [cwd]         Start process
  pm2-list                                List processes
  pm2-stop <name>                         Stop process
  pm2-logs [name] [lines]                 View logs

MongoDB:
  mongo-status                            Check if running
  mongo-install                           Show install instructions

Scaffold:
  npm-init <dir> [next|react|express]     Create project from template
  api-scaffold <name>                     Express REST API boilerplate

Checklist:
  deploy-checklist [domain]               Pre-launch verification (SSL, firewall, nginx, PM2, DNS)

Firewall:
  firewall-setup                          Enable UFW (22, 80, 443)
  firewall-status                         Show firewall rules
  firewall-allow <port>                   Open a port`;
}

module.exports = { run, help, systemInfo, nginxSite, ssl, deploySsh, deployVercel };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) { console.log(help()); process.exit(0); }
    console.log(run(args));
}
