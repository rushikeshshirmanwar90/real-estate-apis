# API Update Checklist

Track your progress as you update each API endpoint.

## ✅ Completed APIs (9/30+)

- [x] `/api/login` - ✅ Fully updated with rate limiting, account lockout
- [x] `/api/leads` - ✅ Pagination, validation, optimized
- [x] `/api/clients` - ✅ Transactions, pagination, security
- [x] `/api/password` - ✅ Strong validation, transactions
- [x] `/api/otp` - ✅ Secure OTP with hashing, expiration
- [x] `/api/otp/verify` - ✅ New verification endpoint
- [x] `/api/events` - ✅ Pagination, validation
- [x] `/api/project` - ✅ Pagination, validation
- [x] Core utilities created - ✅ All utility files

## 🔄 In Progress APIs (0)

_None currently in progress_

## ⏳ Pending APIs - High Priority (5)

- [ ] `/api/contacts/route.ts`
  - [ ] Add pagination to GET
  - [ ] Add transaction support to POST
  - [ ] Validate email format
  - [ ] Use `.lean()` for queries
  - [ ] Update error handling

- [ ] `/api/property/route.ts`
  - [ ] Add pagination to GET
  - [ ] Validate ObjectId formats
  - [ ] Use `.lean()` for queries
  - [ ] Fix PATCH method (should be POST)
  - [ ] Update error handling

- [ ] `/api/building/route.ts`
  - [ ] Add pagination to GET
  - [ ] Remove commented code
  - [ ] Add proper validation
  - [ ] Use transactions for POST
  - [ ] Update error handling

- [ ] `/api/payment/route.ts`
  - [ ] Validate all inputs
  - [ ] Use proper error responses
  - [ ] Add `.lean()` to queries
  - [ ] Simplify DELETE parameter handling
  - [ ] Update error handling

- [ ] `/api/reference-leads/route.ts`
  - [ ] Add pagination to GET
  - [ ] Validate inputs
  - [ ] Use proper error responses
  - [ ] Add `.lean()` to queries
  - [ ] Update error handling

## ⏳ Pending APIs - Medium Priority (8)

- [ ] `/api/send-mail/route.tsx`
  - [ ] Add rate limiting
  - [ ] Validate email format
  - [ ] Add proper error handling
  - [ ] Add logging

- [ ] `/api/(users)/admin/route.ts`
  - [ ] Update to use centralized utilities
  - [ ] Add pagination
  - [ ] Add `.lean()` to queries
  - [ ] Update error handling

- [ ] `/api/(users)/staff/route.ts`
  - [ ] Update to use centralized utilities
  - [ ] Add pagination
  - [ ] Add `.lean()` to queries
  - [ ] Update error handling

- [ ] `/api/(users)/user/route.ts`
  - [ ] Add pagination
  - [ ] Simplify complex logic
  - [ ] Use centralized utilities
  - [ ] Add `.lean()` to queries

- [ ] `/api/broker/route.ts`
  - [ ] Review and update
  - [ ] Add validation
  - [ ] Update error handling

- [ ] `/api/findUser/route.ts`
  - [ ] Review and update
  - [ ] Add validation
  - [ ] Update error handling

- [ ] `/api/forget-password/route.ts`
  - [ ] Security review
  - [ ] Add rate limiting
  - [ ] Update error handling

- [ ] `/api/send-otp/route.tsx`
  - [ ] Consolidate with /api/otp
  - [ ] Or update to use same pattern

## ⏳ Pending APIs - Lower Priority (15+)

### Home Page APIs

- [ ] `/api/(home-page)/about-us/route.ts`
- [ ] `/api/(home-page)/contact-us/route.ts`
- [ ] `/api/(home-page)/FAQs/route.ts`
- [ ] `/api/(home-page)/hero-section/route.ts`
- [ ] `/api/(home-page)/our-services/route.ts`
- [ ] `/api/(home-page)/our-team/route.ts`

### Super Admin APIs

- [ ] `/api/(super-admin)/client/route.ts`

### Xsite APIs

- [ ] `/api/(Xsite)/import/route.ts`
- [ ] `/api/(Xsite)/material/route.ts`
- [ ] `/api/(Xsite)/material-usage/route.ts`
- [ ] `/api/(Xsite)/materialActivity/route.ts`
- [ ] `/api/(Xsite)/mini-section/route.ts`
- [ ] `/api/(Xsite)/sanction/route.ts`

### Other APIs

- [ ] `/api/activity/route.ts`
- [ ] `/api/broker/login/route.ts`
- [ ] `/api/building/flat/route.ts`
- [ ] `/api/clients/(auth)/route.ts`
- [ ] `/api/clients/find/route.ts`
- [ ] `/api/otherSection/route.ts`
- [ ] `/api/project/client/route.ts`
- [ ] `/api/review-and-update/review/route.ts`
- [ ] `/api/review-and-update/update/route.ts`
- [ ] `/api/room-changes/route.ts`
- [ ] `/api/room-info/route.ts`
- [ ] `/api/rowHouse/route.ts`
- [ ] `/api/section/route.ts`
- [ ] `/api/updates/route.ts`

## 🎯 Additional Tasks

### Critical

- [ ] Implement JWT authentication
  - [ ] Create JWT utility functions
  - [ ] Update login to return JWT
  - [ ] Update auth middleware to verify JWT
  - [ ] Add JWT_SECRET to .env

- [ ] Add authentication to protected routes
  - [ ] Identify which routes need auth
  - [ ] Add auth middleware to each route
  - [ ] Test authentication flow

- [ ] Add database indexes
  - [ ] Review query patterns
  - [ ] Add indexes to schemas
  - [ ] Test query performance

### Important

- [ ] Add request validation schemas (Zod)
  - [ ] Create validation schemas
  - [ ] Add validation middleware
  - [ ] Update all endpoints

- [ ] Add API documentation
  - [ ] Install Swagger/OpenAPI
  - [ ] Document all endpoints
  - [ ] Add examples

- [ ] Add CORS configuration
  - [ ] Configure allowed origins
  - [ ] Add CORS middleware
  - [ ] Test cross-origin requests

- [ ] Add compression middleware
  - [ ] Install compression package
  - [ ] Configure middleware
  - [ ] Test response sizes

### Nice to Have

- [ ] Add Redis for caching
  - [ ] Install Redis client
  - [ ] Configure connection
  - [ ] Add caching layer

- [ ] Add API versioning
  - [ ] Plan versioning strategy
  - [ ] Add /v1/ prefix
  - [ ] Update all routes

- [ ] Add monitoring
  - [ ] Set up error tracking
  - [ ] Add performance monitoring
  - [ ] Configure alerts

- [ ] Add tests
  - [ ] Set up testing framework
  - [ ] Write unit tests
  - [ ] Write integration tests

## 📊 Progress Tracking

### Overall Progress

- **Completed**: 9 APIs
- **In Progress**: 0 APIs
- **Pending**: 30+ APIs
- **Completion**: ~23%

### By Priority

- **High Priority**: 0/5 (0%)
- **Medium Priority**: 0/8 (0%)
- **Low Priority**: 0/15+ (0%)

### Time Estimates

- **High Priority APIs**: ~2-3 hours
- **Medium Priority APIs**: ~2-3 hours
- **Low Priority APIs**: ~3-4 hours
- **Additional Tasks**: ~4-6 hours
- **Total Estimated Time**: ~12-16 hours

## 🎯 Daily Goals

### Day 1 (Completed ✅)

- [x] Create all utility files
- [x] Update 9 critical APIs
- [x] Create documentation

### Day 2 (Suggested)

- [ ] Update 5 high priority APIs
- [ ] Implement JWT authentication
- [ ] Add authentication to updated routes

### Day 3 (Suggested)

- [ ] Update 8 medium priority APIs
- [ ] Add database indexes
- [ ] Add request validation

### Day 4 (Suggested)

- [ ] Update remaining low priority APIs
- [ ] Add API documentation
- [ ] Add comprehensive tests

## 📝 Notes

### When Updating Each API

1. ✅ Update imports
2. ✅ Add pagination to GET
3. ✅ Add validation
4. ✅ Use `.lean()` for queries
5. ✅ Update error handling
6. ✅ Add logging
7. ✅ Test thoroughly

### Testing Checklist for Each API

- [ ] GET single item
- [ ] GET list with pagination
- [ ] GET with invalid ID
- [ ] POST with valid data
- [ ] POST with invalid data
- [ ] PUT with valid data
- [ ] PUT with invalid ID
- [ ] DELETE with valid ID
- [ ] DELETE with invalid ID
- [ ] Rate limiting (if applicable)

### Common Issues to Watch For

- ⚠️ Forgetting to validate ObjectIds
- ⚠️ Not using `.lean()` for queries
- ⚠️ Exposing passwords in responses
- ⚠️ Not handling validation errors
- ⚠️ Using wrong HTTP status codes

## 🏆 Milestones

- [x] **Milestone 1**: Core utilities created
- [x] **Milestone 2**: First 5 APIs updated
- [ ] **Milestone 3**: All high priority APIs updated
- [ ] **Milestone 4**: JWT authentication implemented
- [ ] **Milestone 5**: All medium priority APIs updated
- [ ] **Milestone 6**: All APIs updated
- [ ] **Milestone 7**: Tests added
- [ ] **Milestone 8**: Documentation complete
- [ ] **Milestone 9**: Production ready

## 🎉 Celebration Points

- [x] 🎊 First API updated!
- [x] 🎊 5 APIs updated!
- [ ] 🎊 10 APIs updated!
- [ ] 🎊 20 APIs updated!
- [ ] 🎊 All APIs updated!
- [ ] 🎊 JWT implemented!
- [ ] 🎊 Tests passing!
- [ ] 🎊 Production deployment!

---

**Last Updated**: [Current Date]
**Next Review**: [Tomorrow's Date]

Keep this checklist updated as you make progress! 🚀
