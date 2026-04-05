#!/usr/bin/env python3
"""
Automated Redis Route Fixer
This script fixes all API routes that use direct Redis client calls
"""

import os
import re
from pathlib import Path

# Files to fix (relative to real-estate-apis/)
FILES_TO_FIX = [
    "app/api/(Xsite)/materialActivity/route.ts",
    "app/api/(Xsite)/mini-section/route.ts",
    "app/api/(Xsite)/material/add-stock/route.ts",
    "app/api/material-usage-batch/route.ts",
    "app/api/activity/route.ts",
    "app/api/property/route.ts",
    "app/api/labor/route.ts",
    "app/api/building/route.ts",
    "app/api/rowHouse/route.ts",
    "app/api/equipment/route.ts",
    "app/api/equipment/bulk/route.ts",
    "app/api/equipment/categories/route.ts",
    "app/api/section/route.ts",
    "app/api/otherSection/route.ts",
    "app/api/completion/route.ts",
    "app/api/users/staff/route.ts",
    "app/api/users/admin/route.ts",
    "app/api/clients/route.ts",
    "app/api/clients/staff/route.ts",
    "app/api/clients/clear-cache/route.ts",
    "app/api/project/route.ts",
]

def fix_import(content):
    """Fix the import statement"""
    # Pattern 1: Simple import
    pattern1 = r'import\s*{\s*client\s*}\s*from\s*"@/lib/redis";?'
    replacement1 = '''import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";'''
    
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: Import with other items
    pattern2 = r'import\s*{\s*client,\s*([^}]+)\s*}\s*from\s*"@/lib/redis";?'
    replacement2 = r'''import { \1 } from "@/lib/redis";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";'''
    
    content = re.sub(pattern2, replacement2, content)
    
    return content

def fix_get_operations(content):
    """Fix client.get() operations"""
    # Pattern: let/const cacheValue = await client.get(key)
    pattern = r'(let|const)\s+cacheValue\s*=\s*await\s+client\.get\(([^)]+)\);?\s*\n\s*if\s*\(\s*cacheValue\s*\)\s*{\s*\n\s*cacheValue\s*=\s*JSON\.parse\(cacheValue\);'
    
    replacement = r'const cachedData = await safeRedisGetCache(\2);\n    if (cachedData) {\n      const cacheValue = JSON.parse(cachedData);'
    
    content = re.sub(pattern, replacement, content)
    
    return content

def fix_set_operations(content):
    """Fix client.set() operations"""
    # Pattern: await client.set(key, value, 'EX', time)
    pattern = r'await\s+client\.set\(([^,]+),\s*([^,]+),\s*[\'"]EX[\'"]\s*,\s*(\d+)\);?'
    replacement = r'await safeRedisSetCache(\1, \2, \'EX\', \3);'
    
    content = re.sub(pattern, replacement, content)
    
    # Pattern: await client.set(key, value)
    pattern2 = r'await\s+client\.set\(([^,]+),\s*([^)]+)\);?'
    replacement2 = r'await safeRedisSetCache(\1, \2);'
    
    content = re.sub(pattern2, replacement2, content)
    
    return content

def fix_keys_del_pattern(content):
    """Fix client.keys() + client.del() pattern"""
    # Pattern: const keys = await client.keys(pattern); if (keys.length > 0) { await Promise.all(keys.map(key => client.del(key))); }
    pattern = r'const\s+(\w+)\s*=\s*await\s+client\.keys\(([^)]+)\);?\s*\n\s*if\s*\(\s*\1\.length\s*>\s*0\s*\)\s*{\s*\n\s*await\s+Promise\.all\(\1\.map\(key\s*=>\s*client\.del\(key\)\)\);?\s*\n\s*}'
    
    replacement = r'await invalidateCachePattern(\2);'
    
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    return content

def fix_single_del(content):
    """Fix single client.del() operations"""
    # Pattern: await client.del(key)
    pattern = r'await\s+client\.del\(([^)]+)\);?'
    replacement = r'await safeRedisDelCache(\1);'
    
    content = re.sub(pattern, replacement, content)
    
    return content

def fix_file(filepath):
    """Fix a single file"""
    print(f"📝 Processing: {filepath}")
    
    if not os.path.exists(filepath):
        print(f"   ⚠️  File not found, skipping")
        return False
    
    # Read file
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already fixed
    if 'from "@/lib/utils/redis-helpers"' in content:
        print(f"   ✅ Already fixed, skipping")
        return True
    
    # Check if it uses Redis
    if 'from "@/lib/redis"' not in content:
        print(f"   ℹ️  Doesn't use Redis, skipping")
        return True
    
    # Create backup
    backup_path = filepath + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Apply fixes
    original_content = content
    content = fix_import(content)
    content = fix_get_operations(content)
    content = fix_set_operations(content)
    content = fix_keys_del_pattern(content)
    content = fix_single_del(content)
    
    # Write fixed content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    if content != original_content:
        print(f"   ✅ Fixed successfully")
        return True
    else:
        print(f"   ⚠️  No changes made")
        return False

def main():
    print("🔧 Automated Redis Route Fixer")
    print("=" * 50)
    print()
    
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    for file_path in FILES_TO_FIX:
        try:
            if fix_file(file_path):
                fixed_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            error_count += 1
        print()
    
    print("=" * 50)
    print(f"✅ Fixed: {fixed_count}")
    print(f"⚠️  Skipped: {skipped_count}")
    print(f"❌ Errors: {error_count}")
    print()
    print("📚 Note: Backup files created with .backup extension")
    print("🔍 Please review changes and test thoroughly")
    print()
    print("To restore a file from backup:")
    print("  mv file.ts.backup file.ts")

if __name__ == "__main__":
    main()
