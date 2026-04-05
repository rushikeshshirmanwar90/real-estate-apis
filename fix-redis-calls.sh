#!/bin/bash

# Script to automatically fix Redis calls in API routes
# This replaces direct client calls with safe helper functions

echo "🔧 Fixing Redis calls in API routes..."
echo ""

# Find all files that import from @/lib/redis
FILES=$(grep -rl 'from "@/lib/redis"' app/api/)

for file in $FILES; do
    echo "📝 Processing: $file"
    
    # Skip if already using redis-helpers
    if grep -q 'from "@/lib/utils/redis-helpers"' "$file"; then
        echo "   ✅ Already fixed, skipping"
        continue
    fi
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Replace import statement
    sed -i.tmp 's/import { client } from "@\/lib\/redis";/import { safeRedisGetCache, safeRedisSetCache, invalidateCachePattern, safeRedisDelCache } from "@\/lib\/utils\/redis-helpers";/g' "$file"
    
    # Note: The actual replacements of client.get(), client.set(), etc. are complex
    # and require manual review to ensure correctness
    
    echo "   ⚠️  Import updated - manual review needed for method calls"
    
    rm -f "$file.tmp"
done

echo ""
echo "✅ Import statements updated!"
echo "⚠️  IMPORTANT: You must manually replace:"
echo "   - client.get(key) → await safeRedisGetCache(key)"
echo "   - client.set(key, val, 'EX', time) → await safeRedisSetCache(key, val, 'EX', time)"
echo "   - client.keys(pattern) + client.del() → await invalidateCachePattern(pattern)"
echo "   - client.del(key) → await safeRedisDelCache(key)"
echo ""
echo "📚 See CRITICAL_REDIS_ROUTES_TO_FIX.md for detailed patterns"
