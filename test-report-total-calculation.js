const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // Replace with a real client ID

async function testReportTotalCalculation() {
  console.log('🧪 TESTING REPORT TOTAL CALCULATION');
  console.log('====================================');
  console.log('Business Logic: Total should ONLY include imported materials, NOT used materials');
  console.log('====================================\n');
  
  try {
    // Test the material activity report API
    console.log('1️⃣ Testing Material Activity Report API...');
    
    const params = new URLSearchParams({
      clientId: TEST_CLIENT_ID,
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      activity: 'all' // Get both imported and used
    });
    
    console.log('📤 API Request:', `${BASE_URL}/api/material-activity-report?${params.toString()}`);
    
    const response = await axios.get(`${BASE_URL}/api/material-activity-report?${params.toString()}`);
    
    if (!response.data.success) {
      throw new Error('API request failed: ' + response.data.error);
    }
    
    const { activities, summary } = response.data.data;
    
    console.log('✅ API Response received');
    console.log(`📊 Total activities: ${activities.length}`);
    console.log(`📊 Imported activities: ${summary.importedCount}`);
    console.log(`📊 Used activities: ${summary.usedCount}`);
    console.log(`💰 API Total Cost: ₹${summary.totalCost.toLocaleString('en-IN')}`);
    
    // Manual calculation to verify
    console.log('\n🔍 MANUAL VERIFICATION:');
    
    let manualImportedTotal = 0;
    let manualUsedTotal = 0;
    let manualAllTotal = 0;
    
    activities.forEach((activity, index) => {
      const activityTotal = activity.materials.reduce((sum, material) => {
        let materialCost = 0;
        
        if (material.totalCost !== undefined) {
          materialCost = Number(material.totalCost) || 0;
        } else if (material.perUnitCost !== undefined) {
          materialCost = (Number(material.perUnitCost) || 0) * (Number(material.qnt) || 0);
        } else if (material.cost !== undefined) {
          const costValue = Number(material.cost) || 0;
          const quantity = Number(material.qnt) || 0;
          
          if (activity.activity === 'imported') {
            materialCost = costValue * quantity; // Per-unit cost × quantity
          } else {
            materialCost = costValue; // Total cost
          }
        }
        
        return sum + materialCost;
      }, 0);
      
      console.log(`  Activity ${index + 1}: ${activity.activity} - ₹${activityTotal.toLocaleString('en-IN')}`);
      
      if (activity.activity === 'imported') {
        manualImportedTotal += activityTotal;
      } else if (activity.activity === 'used') {
        manualUsedTotal += activityTotal;
      }
      
      manualAllTotal += activityTotal;
    });
    
    console.log('\n📊 MANUAL CALCULATION RESULTS:');
    console.log(`  - Imported materials total: ₹${manualImportedTotal.toLocaleString('en-IN')}`);
    console.log(`  - Used materials total: ₹${manualUsedTotal.toLocaleString('en-IN')}`);
    console.log(`  - All materials total: ₹${manualAllTotal.toLocaleString('en-IN')}`);
    
    console.log('\n✅ BUSINESS LOGIC VERIFICATION:');
    
    // Check if API is correctly only counting imported materials
    if (Math.abs(summary.totalCost - manualImportedTotal) < 0.01) {
      console.log('✅ CORRECT: API total matches imported materials only');
      console.log(`   API Total: ₹${summary.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Imported Only: ₹${manualImportedTotal.toLocaleString('en-IN')}`);
    } else {
      console.log('❌ INCORRECT: API total does not match imported materials only');
      console.log(`   API Total: ₹${summary.totalCost.toLocaleString('en-IN')}`);
      console.log(`   Expected (Imported Only): ₹${manualImportedTotal.toLocaleString('en-IN')}`);
      console.log(`   Difference: ₹${(summary.totalCost - manualImportedTotal).toLocaleString('en-IN')}`);
      
      if (Math.abs(summary.totalCost - manualAllTotal) < 0.01) {
        console.log('❌ ERROR: API is incorrectly including used materials in total!');
      }
    }
    
    // Show what the incorrect calculation would be
    if (manualUsedTotal > 0) {
      console.log('\n⚠️ COMPARISON:');
      console.log(`   ✅ Correct total (imported only): ₹${manualImportedTotal.toLocaleString('en-IN')}`);
      console.log(`   ❌ Incorrect total (all materials): ₹${manualAllTotal.toLocaleString('en-IN')}`);
      console.log(`   💡 Difference (used materials): ₹${manualUsedTotal.toLocaleString('en-IN')}`);
      console.log('   📝 Used materials represent inventory value, not additional spending');
    }
    
    console.log('\n========================================');
    console.log('REPORT TOTAL CALCULATION TEST COMPLETE');
    console.log('========================================');
    
    if (Math.abs(summary.totalCost - manualImportedTotal) < 0.01) {
      console.log('✅ SUCCESS: Report total correctly shows only imported material costs');
      console.log('💡 This reflects actual money spent on purchasing materials');
    } else {
      console.log('❌ ISSUE: Report total is incorrect');
      console.log('💡 Please check the API calculation logic');
    }
    
  } catch (error) {
    console.log('\n========================================');
    console.log('❌ REPORT TOTAL CALCULATION TEST FAILED');
    console.log('========================================');
    console.error('Error details:', error.message);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Make sure your Next.js server is running');
    console.log('2. Update TEST_CLIENT_ID with a real client ID from your database');
    console.log('3. Ensure there are material activities in the database');
    console.log('4. Check the API logs for any errors');
  }
}

// Run the test
console.log('⚠️ IMPORTANT: Update TEST_CLIENT_ID with a real client ID before running this test');
console.log('You can find client IDs in your MongoDB database in the projects collection');
console.log('');

testReportTotalCalculation().catch(console.error);