#!/bin/bash

# Script to fix the syntax errors by removing the erroneous }); patterns

# Find all route.ts files and fix the pattern
find ./app/api -name "route.ts" -type f | while read file; do
  echo "Processing: $file"
  # Use sed to replace }); followed by newline and export with }; followed by newline and export
  sed -i '' 's/^});$/};/g' "$file"
done

echo "Done fixing syntax errors!"
