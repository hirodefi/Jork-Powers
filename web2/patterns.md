# Web2 Development Patterns

Reference for building and deploying web projects. Read this when working on a build task.

## Nginx Configs

### SPA (React/Vue/Svelte)
```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### API + Frontend (same domain)
```nginx
server {
    listen 80;
    server_name example.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### WebSocket
```nginx
location /ws {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

### Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3001;
}
```

## Project Structures

### Next.js
```
app/
  layout.tsx          # Root layout
  page.tsx            # Home page
  providers.tsx       # Wallet/theme providers
  globals.css
components/
  ui/                 # Reusable UI components
lib/
  utils.ts            # Utility functions
  constants.ts        # Config constants
public/
  favicon.ico
```

### React + Vite
```
src/
  App.jsx             # Main component
  main.jsx            # Entry point
  components/         # Components
  hooks/              # Custom hooks
  utils/              # Utilities
  assets/             # Static assets
index.html
vite.config.js
```

### Express API
```
routes/
  index.js            # Route definitions
  users.js
middleware/
  auth.js             # Auth middleware
  errorHandler.js     # Global error handler
models/
  User.js             # Database models
index.js              # Server entry
.env
```

## Deployment Checklist

Before going live:
1. SSL certificate installed (certbot --nginx -d domain.com)
2. Firewall enabled (ufw allow 22,80,443)
3. Nginx config tested (nginx -t)
4. PM2 process running (pm2 start ecosystem.config.js)
5. PM2 startup hook (pm2 save && pm2 startup)
6. Environment variables set (.env not in git)
7. DNS A record pointing to server IP
8. CORS configured for production domain
9. Error handling/logging in place
10. Secrets rotated from development values

## Database Patterns

### MongoDB (Mongoose)
```js
const mongoose = require('mongoose');

async function connect() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydb', {
        serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
}

// Reconnect on disconnect
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Reconnecting...');
    setTimeout(connect, 5000);
});

// Schema example
const userSchema = new mongoose.Schema({
    wallet: { type: String, unique: true, required: true },
    createdAt: { type: Date, default: Date.now }
});
```

### PostgreSQL (pg)
```js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('DB pool error:', err));

// Query example
const { rows } = await pool.query('SELECT * FROM users WHERE wallet = $1', [walletAddress]);
```

## Quality Standards

### Responsive Design
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```
```css
/* Mobile first, then scale up */
@media (min-width: 768px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
```

### Error Boundary (React)
```jsx
class ErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError(error) { return { hasError: true }; }
    render() {
        if (this.state.hasError) return <h2>Something went wrong.</h2>;
        return this.props.children;
    }
}
```

### Express Error Handler
```js
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
    });
});
```

### CORS
```js
const cors = require('cors');
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
```

### Request Logging
```js
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} ${res.statusCode}`);
    next();
});
```
