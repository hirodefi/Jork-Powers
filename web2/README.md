# Web2 Power

Server setup, deployment, infrastructure. Everything off-chain.

## Commands

```bash
# System info
node index.js info

# Nginx
node index.js nginx-site mydomain.com 3000 --ssl --ws
node index.js nginx-spa mydomain.com /var/www/myapp
node index.js nginx-api-frontend mydomain.com 3001 3000
node index.js nginx-status
node index.js nginx-remove mydomain.com

# SSL
node index.js ssl mydomain.com
node index.js ssl-renew

# SSH
node index.js ssh-keygen
node index.js ssh-test user@server.com

# Deploy
node index.js deploy-ssh ./build user@server.com:/var/www/myapp [--clean]
node index.js deploy-vercel ./my-project
node index.js deploy-checklist mydomain.com

# PM2
node index.js pm2-start index.js myapp /path/to/project
node index.js pm2-list
node index.js pm2-stop myapp
node index.js pm2-logs myapp

# Scaffold
node index.js npm-init my-app next
node index.js npm-init my-api express
node index.js api-scaffold my-api

# Database
node index.js mongo-status
node index.js mongo-install

# Firewall
node index.js firewall-setup
node index.js firewall-status
node index.js firewall-allow 8080
```
