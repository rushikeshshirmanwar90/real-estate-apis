# Redis Caching Strategy for Real Estate APIs

## Cache Key Patterns

### 1. Projects
- `projects:all` - All projects
- `projects:client:{clientId}` - Projects by client
- `project:{projectId}` - Individual project details

### 2. Customers
- `customers:all` - All customers
- `customer:{customerId}` - Individual customer
- `customer:mobile:{mobile}` - Customer by mobile number

### 3. Bookings
- `bookings:customer:{customerId}` - Customer bookings
- `booking:{bookingId}` - Individual booking
- `bookings:project:{projectId}` - Project bookings

### 4. Payment Schedules
- `payment-schedule:booking:{bookingId}` - Payment schedule by booking
- `payment-schedule:customer:{mobile}` - Payment schedule by customer mobile

### 5. Registry
- `registry:customer:{customerId}` - Customer registry data
- `registry:{registryId}` - Individual registry

## TTL (Time To Live) Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Projects | 30 minutes | Relatively static data |
| Customers | 15 minutes | Updated occasionally |
| Bookings | 10 minutes | More dynamic |
| Payment Schedules | 5 minutes | Financial data, needs freshness |
| Registry | 10 minutes | Status changes frequently |
| Analytics | 1 hour | Heavy computation, can be stale |
| Notifications | 2 minutes | Real-time nature |

## Cache Invalidation Strategies

### 1. Time-based (TTL)
- Automatic expiration after set time
- Good for data that changes predictably

### 2. Event-based
- Invalidate when related data changes
- Example: Clear customer cache when customer is updated

### 3. Pattern-based
- Clear multiple related keys at once
- Example: `projects:*` when any project changes

## Implementation Examples

### High-Traffic Read APIs (Good for Caching)
- GET `/api/project` - List projects
- GET `/api/customer` - List customers  
- GET `/api/analytics` - Dashboard data
- GET `/api/building` - Building information

### Real-time APIs (Short TTL or No Cache)
- GET `/api/notifications` - User notifications
- GET `/api/payment` - Payment status
- POST `/api/otp` - OTP generation

### Write APIs (Cache Invalidation)
- POST `/api/project` - Invalidate `projects:*`
- PUT `/api/customer` - Invalidate `customer:{id}` and `customers:*`
- POST `/api/booking` - Invalidate booking and customer caches

## Monitoring and Debugging

### Cache Hit Rate
- Monitor cache hit/miss ratios
- Aim for >70% hit rate on read-heavy endpoints

### Cache Size
- Monitor Redis memory usage
- Set up alerts for high memory usage

### Performance Metrics
- Response time with/without cache
- Database query reduction

## Error Handling

### Cache Failures
- Always fallback to database if cache fails
- Log cache errors but don't break API functionality
- Consider circuit breaker pattern for Redis failures

### Data Consistency
- Use cache invalidation for critical data
- Consider eventual consistency for non-critical data
- Implement cache warming for important data