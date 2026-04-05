#!/usr/bin/env python3
"""
Fix remaining client.keys() calls that weren't caught by the first pass
"""

import os
import re

FILES_TO_FIX = [
    "app/api/(Xsite)/material/add-stock/route.ts",
    "app/api/material-usage-batch/route.ts",
    "app/api/building/route.ts",
    "app/api/rowHouse/route.ts",
    "app/api/equipment/route.ts",
    "app/api/equipment/bulk/route.ts",
    "app/api/users/staff/route.ts",
    "app/api/project/route.ts",
    "app/api/property/route.ts",
    "app/api/otherSection/route.ts",
    "app/api/activity/route.ts",
    "app/api/section/route.ts",
]

def fix_remaining_keys_calls(content):
    """Fix remaining client.keys() calls"""
    # Pattern: const varName = await client.keys(pattern);
    content = re.sub(
        r'const\s+(\w+)\s*=\s*await\s+client\.keys\(([^)]+)\);',
        r'const \1 = await safeRedisKeysCache(\2);',
        content
    )
    
    # Pattern: await client.get(key) in safeRedisOperation
    content = re.sub(
        r'await\s+client\.get\(([^)]+)\)',
        r'await safeRedisGetCache(\1)',
        content
    )
    
    # Pattern: await client.del(key) standalone
    content = re.sub(
        r'await\s+client\.del\(([^)]+)\);',
        r'await safeRedisDelCache(\1);',
        content
    )
    
    # Pattern: Promise.all(keys.map(key => client.del(key)))
    content = re.sub(
        r'await\s+Promise\.all\((\w+)\.map\(key\s*=>\s*client\.del\(key\)\)\);',
        r'if (\1.length > 0) await safeRedisDelCache(...\1);',
        content
    )
    
    return content

def add_missing_imports(content):
    """Add safeRedisKeysCache to imports if needed"""
    if 'safeRedisKeysCache' in content and 'safeRedisKeysCache' not in content.split('from "@/lib/utils/redis-helpers"')[0]:
        # Find the import line and add safeRedisKeysCache
        content = re.sub(
            r'(import\s*{\s*\n\s*safeRedisGetCache,\s*\n\s*safeRedisSetCache,\s*\n\s*invalidateCachePattern,\s*\n\s*safeRedisDelCache)',
            r'\1,\n  safeRedisKeysCache',
            content
        )
    return content

def fix_file(filepath):
    """Fix a single file"""
    print(f"📝 Processing: {filepath}")
    
    if not os.path.exists(filepath):
        print(f"   ⚠️  File not found")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    content = fix_remaining_keys_calls(content)
    content = add_missing_imports(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"   ✅ Fixed")
        return True
    else:
        print(f"   ℹ️  No changes needed")
        return False

def main():
    print("🔧 Fixing Remaining Redis Calls")
    print("=" * 50)
    print()
    
    fixed = 0
    for file_path in FILES_TO_FIX:
        if fix_file(file_path):
            fixed += 1
        print()
    
    print("=" * 50)
    print(f"✅ Fixed: {fixed} files")

if __name__ == "__main__":
    main()
