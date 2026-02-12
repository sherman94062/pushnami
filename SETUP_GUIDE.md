# Setup Guide - Production-Ready Updates

## What Changed?

I've implemented comprehensive production-ready improvements to your Pushnami project:

- ✅ **Rate Limiting** - 3-tier protection against API abuse
- ✅ **Structured Logging** - Winston logger with timestamps and context
- ✅ **Request Validation** - Schema-based validation for all endpoints
- ✅ **Enhanced Security** - Better Helmet config, CORS, and error handling
- ✅ **Health Monitoring** - Detailed health check with DB metrics
- ✅ **Timeouts** - Request and query timeouts to prevent hanging
- ✅ **API Versioning** - v1 prefix for future-proofing
- ✅ **Better Error Messages** - PostgreSQL errors mapped to HTTP codes

## Quick Start

### 1. Install New Dependencies

```bash
cd /Users/arthursherman/pushnami/services/api-service
npm install
cd ../..
```

This installs:
- `express-rate-limit` - Rate limiting middleware
- `express-validator` - Request validation
- `winston` - Structured logging

### 2. Rebuild and Start

```bash
docker compose down
docker compose up --build
```

### 3. Verify Everything Works

**Check Health Endpoint:**
```bash
curl http://localhost:4000/health
```

You should see detailed health information including database metrics, uptime, and memory usage.

**Test Rate Limiting:**
```bash
# This should work fine (under rate limit)
for i in {1..10}; do curl http://localhost:4000/api/experiments; done

# This might hit rate limit (100 requests per 15 min)
for i in {1..101}; do curl http://localhost:4000/api/experiments; done
```

**Check Validation:**
```bash
# This should return validation error
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "", "event_type": ""}'
```

**View Logs:**
```bash
docker logs pushnami-api-service-1
```

You should see structured JSON logs with timestamps and context.

## What Files Changed?

### New Files Created:
```
services/api-service/src/
├── middleware/
│   ├── rateLimiter.js      ← Rate limiting configuration
│   └── validation.js       ← Request validation middleware
└── utils/
    └── logger.js           ← Winston logger setup
```

### Files Updated:
```
services/api-service/
├── package.json            ← Added 3 new dependencies
├── src/
│   ├── app.js             ← Enhanced security, rate limiting, logging
│   ├── index.js           ← Better shutdown handling
│   ├── db.js              ← Query timeouts, connection logging
│   ├── middleware/
│   │   └── errorHandler.js ← Enhanced error mapping
│   └── routes/
│       ├── experiments.js  ← Validation, rate limiting, logging
│       ├── metrics.js      ← Validation, pagination, logging
│       └── toggles.js      ← Validation, logging
```

### Documentation:
```
├── README.md               ← Updated with production-ready features
└── CHANGELOG.md            ← Detailed list of all changes
```

## Key Features to Note

### 1. Rate Limiting Tiers
- **General API:** 100 requests/15 min
- **Write ops:** 20 requests/15 min  
- **Events:** 300 requests/min

Rate limit info is returned in headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645123456
```

### 2. Structured Logs

Logs now look like this:
```json
{
  "level": "info",
  "message": "HTTP Request",
  "timestamp": "2024-02-12 10:30:45",
  "service": "api-service",
  "method": "GET",
  "path": "/api/experiments",
  "status": 200,
  "duration": 45,
  "ip": "172.18.0.1"
}
```

### 3. Enhanced Validation

Validation errors return detailed feedback:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "visitor_id",
      "message": "visitor_id is required",
      "value": ""
    }
  ]
}
```

### 4. Health Check

`GET /health` now returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T18:30:45.123Z",
  "database": {
    "connected": true,
    "latency": 5,
    "totalCount": 5,
    "idleCount": 4,
    "waitingCount": 0
  },
  "uptime": 3600.5,
  "memory": { ... }
}
```

### 5. API Versioning

All endpoints now work with both:
- `/api/v1/experiments` (new, recommended)
- `/api/experiments` (legacy, still works)

## Testing Checklist

- [ ] Health check returns detailed metrics
- [ ] Logs show structured format with timestamps
- [ ] Rate limiting returns 429 after threshold
- [ ] Validation errors show field details
- [ ] Invalid UUIDs return 400 with clear message
- [ ] Missing required fields return 400
- [ ] Landing page still loads (http://localhost:3000)
- [ ] Admin dashboard still works (http://localhost:3001)
- [ ] E2E tests still pass

## Production Deployment Notes

### 1. Environment Variables
Current env vars work as-is. For production, consider:
```env
NODE_ENV=production  # Enables production logging, error handling
```

### 2. CORS Configuration
Update `services/api-service/src/app.js` line 22-25 with your production domains:
```javascript
origin: process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com', 'https://admin.yourdomain.com']
  : true,
```

### 3. Log Aggregation
In production, send logs to a logging service:
- Datadog
- New Relic
- ELK Stack
- CloudWatch

Winston can be configured to send logs to these services.

### 4. Health Check Monitoring
Set up monitoring/alerting on the `/health` endpoint:
- Alert if returns 503 (unhealthy)
- Alert if response time > 1s
- Alert if database latency > 500ms

### 5. Rate Limit Tuning
Monitor rate limit hits in logs. Adjust thresholds in `services/api-service/src/middleware/rateLimiter.js` based on actual usage patterns.

## Rollback (If Needed)

If you need to rollback these changes:

```bash
git log --oneline  # Find commit before changes
git revert <commit-hash>
```

Or restore from your backup.

## Questions?

Review the CHANGELOG.md for detailed explanations of each change.

All changes are backward compatible - existing clients will continue to work without modification.

---

**Ready to deploy!** 🚀
