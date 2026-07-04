#!/bin/bash

# Script to fix missing NextResponse imports

# Find all route.ts files that import NextRequest but not NextResponse
find ./app/api -name "route.ts" -type f | while read file; do
  # Check if file imports NextRequest but not NextResponse
  if grep -q 'import { NextRequest } from "next/server"' "$file" && ! grep -q 'NextResponse' "$file" | head -1; then
    echo "Fixing imports in: $file"
    sed -i '' 's/import { NextRequest } from "next\/server";/import { NextRequest, NextResponse } from "next\/server";/g' "$file"
  fi
done

echo "Done fixing imports!"
