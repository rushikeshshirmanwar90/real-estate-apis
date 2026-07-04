#!/bin/bash

# Script to add NextResponse import to files that use it but don't import it

for file in $(find ./app/api -name "*.ts" -type f); do
  if grep -q "NextResponse" "$file" && ! grep -q "import.*NextResponse" "$file"; then
    echo "Fixing: $file"
    
    # Check if file has NextRequest import
    if grep -q 'import { NextRequest } from "next/server"' "$file"; then
      # Replace NextRequest import to include NextResponse
      sed -i '' 's/import { NextRequest } from "next\/server";/import { NextRequest, NextResponse } from "next\/server";/g' "$file"
    elif grep -q 'from "next/server"' "$file"; then
      # File already imports from next/server, add NextResponse to existing import
      sed -i '' 's/from "next\/server";/, NextResponse } from "next\/server";/g' "$file"
      sed -i '' 's/import {/import { NextResponse,/g' "$file"
    else
      # Add new import at the top after other imports
      sed -i '' '1i\
import { NextResponse } from "next/server";\
' "$file"
    fi
  fi
done

echo "Done fixing all imports!"
