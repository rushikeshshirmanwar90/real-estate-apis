#!/usr/bin/env python3
"""Fix escaped quotes in TypeScript files"""

import os
import glob

def fix_file(filepath):
    """Fix escaped quotes and syntax issues in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix escaped quotes
        content = content.replace("\\'EX\\'", "'EX'")
        content = content.replace("\\'PX\\'", "'PX'")
        
        # Fix semicolon before comma in arrow functions (e.g., );, -> ),)
        content = content.replace(");,", "),")
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error in {filepath}: {e}")
        return False

def main():
    print("🔧 Fixing Escaped Quotes in TypeScript Files")
    print("=" * 50)
    
    # Find all .ts files in app/api
    files = glob.glob("app/api/**/*.ts", recursive=True)
    
    fixed_count = 0
    for filepath in files:
        if '.backup' not in filepath:
            if fix_file(filepath):
                fixed_count += 1
    
    print("=" * 50)
    print(f"✅ Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
