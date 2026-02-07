# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Deployments](#cloud-deployments)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

### Required Software
- Docker 24+ and Docker Compose 2.20+
- Node.js 20+ (for local development)
- PostgreSQL 15+ (or managed database)
- Domain name with DNS access

### Recommended
- Kubernetes cluster (GKE, EKS, AKS, or self-managed)
- Managed PostgreSQL (Cloud SQL, RDS, Azure Database)
- CDN (CloudFront, Cloudflare)
- Monitoring (Datadog, New Relic, or Prometheus/Grafana)

---

## Environment Variables

### Backend API (.env)

```bash
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgres://user:password@host:5432/uplift
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Authentication
JWT_SECRET=<generate-64-char-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_DOMAIN=.yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_GROWTH=price_xxx
STRIPE_PRICE_SCALE=price_xxx

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@yourdomain.com

# Optional
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

### Customer Portal (.env)

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Uplift
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Mobile App (app.config.js)

```javascript
export default {
  extra: {
    apiUrl: 'https://api.yourdomain.com/api',
    environment: 'production',
  }
};
```

### Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 48

# Generate strong password
openssl rand -base64 32
```

---

## Database Setup

### 1. Create Database

```sql
-- Connect as postgres superuser
CREATE DATABASE uplift;
CREATE USER uplift_app WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE uplift TO uplift_app;

-- Connect to uplift database
\c uplift

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Run Migrations

```bash
# Using migration script
DATABASE_URL=postgres://... node scripts/migrate.js

# Or manually
psql $DATABASE_URL < database/migrations/20240101000000_initial_schema.sql
psql $DATABASE_URL < database/migrations/20240115000000_billing_schema.sql
psql $DATABASE_URL < database/migrations/20250111000000_commercial_layer.sql
```

### 3. Create Initial Admin

```sql
-- Insert organization
INSERT INTO organizations (id, name, slug)
VALUES ('org-uuid', 'Your Company', 'your-company');

-- Insert admin user (password: changeme123!)
INSERT INTO users (id, organization_id, email, password_hash, role, email_verified)
VALUES (
  'user-uuid',
  'org-uuid',
  'admin@yourcompany.com',
  '$2b$12$...', -- bcrypt hash of 'changeme123!'
  'admin',
  true
);
```

### 4. Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

---

## Docker Deployment

### 1. Build Images

```bash
# Backend API
docker build -t uplift/api:latest .

# Portal
cd portal && docker build -t uplift/portal:latest .

# Ops Portal
cd apps/ops && docker build -t uplift/ops:latest .
```

### 2. Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: uplift/api:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  portal:
    image: uplift/portal:latest
    restart: always
    ports:
      - "80:80"
    depends_on:
      - api

  postgres:
    image: postgres:15
    restart: always
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: uplift
      POSTGRES_USER: uplift_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uplift_app -d uplift"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 3. Run Production

```bash
# Load environment
export $(cat .env.production | xargs)

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f api

# Scale API
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace uplift
```

### 2. Create Secrets

```bash
kubectl create secret generic uplift-secrets \
  --namespace=uplift \
  --from-literal=database-url='postgres://...' \
  --from-literal=jwt-secret='...' \
  --from-literal=stripe-secret='...'
```

### 3. Apply Manifests

```bash
# Apply all manifests
kubectl apply -f k8s/ -n uplift

# Check status
kubectl get pods -n uplift
kubectl get services -n uplift
kubectl get ingress -n uplift
```

### 4. Kubernetes Manifest (k8s/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uplift-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: uplift-api
  template:
    metadata:
      labels:
        app: uplift-api
    spec:
      containers:
        - name: api
          image: uplift/api:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: uplift-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: uplift-api
spec:
  selector:
    app: uplift-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: uplift-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: uplift-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: uplift-api
                port:
                  number: 80
```

---

## Cloud Deployments

### Google Cloud Platform (GCP)

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/uplift-api

# Deploy to Cloud Run
gcloud run deploy uplift-api \
  --image gcr.io/PROJECT_ID/uplift-api \
  --platform managed \
  --region europe-west2 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=..." \
  --set-secrets "JWT_SECRET=jwt-secret:latest"

# Create Cloud SQL instance
gcloud sql instances create uplift-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=europe-west2
```

### AWS

```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin xxx.dkr.ecr.eu-west-2.amazonaws.com
docker tag uplift/api:latest xxx.dkr.ecr.eu-west-2.amazonaws.com/uplift-api:latest
docker push xxx.dkr.ecr.eu-west-2.amazonaws.com/uplift-api:latest

# Deploy to ECS (using Copilot)
copilot init
copilot env init --name production
copilot deploy --env production

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier uplift-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --master-username uplift_app \
  --master-user-password xxx
```

### Azure

```bash
# Push to ACR
az acr login --name upliftacr
docker tag uplift/api:latest upliftacr.azurecr.io/uplift-api:latest
docker push upliftacr.azurecr.io/uplift-api:latest

# Deploy to Container Apps
az containerapp create \
  --name uplift-api \
  --resource-group uplift-rg \
  --environment uplift-env \
  --image upliftacr.azurecr.io/uplift-api:latest \
  --target-port 3000 \
  --ingress external

# Create Azure Database for PostgreSQL
az postgres flexible-server create \
  --name uplift-db \
  --resource-group uplift-rg \
  --location uksouth \
  --admin-user uplift_app \
  --admin-password xxx
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# Install cert-manager (Kubernetes)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### Option 2: Cloudflare (Free SSL)

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Enable "Full (Strict)" SSL mode
4. Use Cloudflare origin certificates for your servers

---

## Post-Deployment Checklist

### Security
- [ ] JWT_SECRET is unique and secure (64+ characters)
- [ ] Database password is strong and unique
- [ ] HTTPS enabled on all endpoints
- [ ] CORS origins restricted to known domains
- [ ] Rate limiting configured
- [ ] Stripe webhook signature verification enabled
- [ ] Admin password changed from default
- [ ] MFA enabled for admin accounts

### Monitoring
- [ ] Health check endpoints responding
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation set up
- [ ] Alerts configured for errors/downtime
- [ ] Database connection pool monitored

### Backup & Recovery
- [ ] Database backups scheduled (daily minimum)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Secrets backed up securely

### Performance
- [ ] Database indexes verified
- [ ] CDN configured for static assets
- [ ] Gzip compression enabled
- [ ] Connection pooling configured

### Compliance
- [ ] Privacy policy published
- [ ] Cookie consent implemented
- [ ] GDPR data export capability verified
- [ ] Data retention policies configured

---

## Troubleshooting

### Common Issues

**Database Connection Refused**
```bash
# Check database is running
docker-compose ps postgres

# Check connection string
psql $DATABASE_URL

# Check firewall rules (cloud)
```

**JWT Errors**
```bash
# Verify JWT_SECRET matches across all instances
echo $JWT_SECRET | wc -c  # Should be 64+

# Check cookie domain setting
# COOKIE_DOMAIN should be .yourdomain.com (with dot prefix)
```

**Stripe Webhooks Failing**
```bash
# Verify webhook signature
curl https://api.yourdomain.com/api/billing/webhooks/stripe \
  -H "Stripe-Signature: ..." \
  -d @webhook-payload.json

# Check webhook URL in Stripe dashboard matches
# Verify STRIPE_WEBHOOK_SECRET is correct
```

### Logs

```bash
# Docker
docker logs uplift-api -f --tail 100

# Kubernetes
kubectl logs -f deployment/uplift-api -n uplift

# Cloud Run
gcloud logging read "resource.type=cloud_run_revision"
```

---

## Support

- **Documentation:** https://docs.uplift.hr
- **Status Page:** https://status.uplift.hr
- **Email:** devops@uplift.hr
