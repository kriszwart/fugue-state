# Redis Setup Guide for Fugue State

## Why Redis?

Redis is used in Fugue State for:
- **API Response Caching**: Faster response times for frequently accessed data
- **Rate Limiting**: Protect API endpoints from abuse
- **Session Management**: Temporary session storage
- **Real-time Features**: Pub/sub for future real-time updates

## Installation Options

### Option 1: Local Installation (Recommended for Development)

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Or use WSL2 and follow Linux instructions

#### Verify Installation
```bash
redis-cli ping
# Should return: PONG
```

### Option 2: Docker (Quick Start)

```bash
# Run Redis in a container
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest

# Or with persistence
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:latest redis-server --appendonly yes
```

### Option 3: Redis Cloud (Recommended for Production)

1. Sign up at https://redis.com/try-free/
2. Create a free database (30MB free tier)
3. Copy the connection URL
4. Add to `.env.local`:
   ```env
   REDIS_URL=redis://default:password@host:port
   ```

### Option 4: Upstash (Serverless Redis)

1. Sign up at https://upstash.com/
2. Create a database
3. Copy the REST URL or Redis URL
4. Add to `.env.local`:
   ```env
   REDIS_URL=your_upstash_redis_url
   ```

## Configuration

Add Redis configuration to your `.env.local` file:

### For Local Redis (Default)
```env
# No configuration needed - defaults to localhost:6379
# Or explicitly set:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### For Redis Cloud/Upstash
```env
REDIS_URL=redis://default:password@host:port
```

### For Password-Protected Redis
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Testing the Connection

After starting your Next.js dev server, check the Redis status:

```bash
# Check API endpoint
curl http://localhost:3000/api/redis/status

# Should return:
# {"connected":true,"status":"connected"}
```

Or check the browser console - you should see:
```
[Redis] Connecting...
[Redis] Ready
```

## Troubleshooting

### Redis Connection Failed

1. **Check if Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Check Redis logs:**
   ```bash
   # macOS
   tail -f /usr/local/var/log/redis.log
   
   # Linux
   sudo journalctl -u redis-server -f
   ```

3. **Verify port is not in use:**
   ```bash
   lsof -i :6379
   ```

4. **Check firewall settings:**
   - Ensure port 6379 is open
   - For cloud Redis, check security groups

### Connection Timeout

- Verify Redis is accessible from your application
- Check network connectivity
- For cloud Redis, verify IP whitelist settings

### Authentication Errors

- Verify password is correct
- Check Redis configuration file for `requirepass` setting
- Ensure `REDIS_PASSWORD` matches Redis server password

## Usage in Code

The Redis client is available throughout the application:

```typescript
import { cache, rateLimit, session, isRedisAvailable } from '@/lib/redis'

// Check if Redis is available
const available = await isRedisAvailable()

// Cache operations
await cache.set('key', { data: 'value' }, 3600) // TTL: 1 hour
const value = await cache.get('key')
await cache.delete('key')

// Rate limiting
const limit = await rateLimit.check('user:123', 100, 60) // 100 requests per 60 seconds
if (!limit.allowed) {
  // Rate limit exceeded
}

// Session management
await session.set('session:abc', { userId: '123' }, 3600)
const sessionData = await session.get('session:abc')
```

## Performance Tips

1. **Use appropriate TTLs**: Don't cache data indefinitely
2. **Monitor memory usage**: Redis stores data in memory
3. **Set max memory policy**: Configure `maxmemory-policy` in Redis config
4. **Use connection pooling**: The client handles this automatically
5. **Monitor connection health**: Check `/api/redis/status` regularly

## Security Best Practices

1. **Use passwords in production**: Always set `REDIS_PASSWORD`
2. **Bind to localhost in development**: Don't expose Redis publicly
3. **Use SSL/TLS for cloud Redis**: Most providers offer this
4. **Restrict network access**: Use firewall rules
5. **Rotate passwords regularly**: Especially for production

## Next Steps

Once Redis is set up, you can:
- Enable API response caching
- Implement rate limiting on endpoints
- Add session management
- Set up real-time features with pub/sub

The app will work without Redis, but performance and features will be limited.
























