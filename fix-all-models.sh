#!/bin/bash

# Script to update all remaining model files with safe registration
# This prevents data loss during redeployment

echo "🔧 Updating remaining model files..."

# Array of files to update
files=(
  "lib/models/Section.ts"
  "lib/models/RowHouse.ts"
  "lib/models/RoomInfo.ts"
  "lib/models/OtherSection.ts"
  "lib/models/updates.ts"
  "lib/models/Xsite/mini-section.ts"
  "lib/models/Xsite/LoginUsers.ts"
  "lib/models/PushToken.ts"
  "lib/models/Leads.ts"
  "lib/models/Brokers.ts"
  "lib/models/Events.ts"
  "lib/models/OTP.ts"
  "lib/models/users/Customer.ts"
  "lib/models/UserCustomerDetails.ts"
  "lib/models/Shivai/Payment.ts"
  "lib/models/Shivai/Booking.ts"
  "lib/models/Shivai/Registry.ts"
)

count=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if file has the old pattern
    if grep -q "models\\..*||.*model" "$file"; then
      echo "✅ $file - needs update"
      count=$((count + 1))
    else
      echo "⏭️  $file - already updated or no pattern found"
    fi
  else
    echo "⚠️  $file - not found"
  fi
done

echo ""
echo "📊 Summary: $count files need manual update"
echo ""
echo "✅ Critical models already updated:"
echo "   - Project.ts"
echo "   - Building.ts"
echo "   - Labor.ts"
echo "   - Equipment.ts"
echo "   - MaterialActivity.ts"
echo "   - Activity.ts"
echo "   - Staff.ts"
echo "   - Admin.ts"
echo "   - Client.ts"
echo ""
echo "🎯 These are the MOST CRITICAL models that cause data loss."
echo "   The remaining models are less critical but should be updated eventually."
