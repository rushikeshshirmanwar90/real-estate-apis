const { MongoClient } = require('mongodb');

async function debugActualCostStructure() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('\n========================================');
        console.log('🔍 DEBUGGING ACTUAL COST STRUCTURE');
        console.log('========================================');

        const db = client.db('real-estate');
        const materialActivityCollection = db.collection('materialactivities');

        // Get the most recent activity that matches the image
        const recentActivity = await materialActivityCollection.findOne(
            { 
                clientId: '6941b27c7fdcea3d37e02ada',
                activity: 'used',
                'materials.name': { $in: ['Cement', 'Brick'] }
            },
            { sort: { date: -1 } }
        );

        if (recentActivity) {
            console.log('📋 FOUND MATCHING ACTIVITY:');
            console.log('========================================');
            console.log(`Activity ID: ${recentActivity._id}`);
            console.log(`Activity Type: ${recentActivity.activity}`);
            console.log(`Date: ${recentActivity.date}`);
            console.log(`Message: ${recentActivity.message}`);
            console.log(`User: ${recentActivity.user?.fullName}`);
            
            console.log('\n📦 MATERIALS ANALYSIS:');
            console.log('========================================');
            
            let totalFromMessage = 0;
            
            // Extract cost from message if possible
            const messageMatch = recentActivity.message?.match(/₹([\d,]+)/);
            if (messageMatch) {
                totalFromMessage = parseFloat(messageMatch[1].replace(/,/g, ''));
                console.log(`💰 Cost from message: ₹${totalFromMessage.toLocaleString('en-IN')}`);
            }
            
            let calculatedTotal = 0;
            
            recentActivity.materials.forEach((material, index) => {
                console.log(`\n${index + 1}. ${material.name}:`);
                console.log(`   - Stored cost field: ${material.cost} (type: ${typeof material.cost})`);
                console.log(`   - Quantity: ${material.qnt}`);
                console.log(`   - Unit: ${material.unit}`);
                
                const storedCost = Number(material.cost) || 0;
                const quantity = Number(material.qnt) || 0;
                
                // Test different interpretations
                const interpretation1 = storedCost; // cost = total cost
                const interpretation2 = storedCost * quantity; // cost = per-unit cost
                
                console.log(`   - If cost = total cost: ₹${interpretation1.toLocaleString('en-IN')}`);
                console.log(`   - If cost = per-unit cost: ₹${interpretation2.toLocaleString('en-IN')}`);
                
                calculatedTotal += interpretation1; // Using interpretation 1 for now
            });
            
            console.log('\n🧮 CALCULATION COMPARISON:');
            console.log('========================================');
            console.log(`Message total: ₹${totalFromMessage.toLocaleString('en-IN')}`);
            console.log(`Sum of cost fields: ₹${calculatedTotal.toLocaleString('en-IN')}`);
            
            // Check which interpretation matches the message
            let correctInterpretationTotal = 0;
            console.log('\n🎯 FINDING CORRECT INTERPRETATION:');
            console.log('========================================');
            
            recentActivity.materials.forEach((material) => {
                const storedCost = Number(material.cost) || 0;
                const quantity = Number(material.qnt) || 0;
                
                // If message total matches sum of cost fields, then cost = total cost
                // If message total matches sum of (cost * quantity), then cost = per-unit cost
                correctInterpretationTotal += storedCost;
            });
            
            if (Math.abs(correctInterpretationTotal - totalFromMessage) < 1) {
                console.log('✅ CORRECT: cost field contains TOTAL COST');
                console.log('   - No need to multiply by quantity');
                console.log('   - Frontend should show cost as total cost');
            } else {
                // Try per-unit interpretation
                let perUnitInterpretationTotal = 0;
                recentActivity.materials.forEach((material) => {
                    const storedCost = Number(material.cost) || 0;
                    const quantity = Number(material.qnt) || 0;
                    perUnitInterpretationTotal += (storedCost * quantity);
                });
                
                if (Math.abs(perUnitInterpretationTotal - totalFromMessage) < 1) {
                    console.log('✅ CORRECT: cost field contains PER-UNIT COST');
                    console.log('   - Need to multiply by quantity for total');
                    console.log('   - Frontend should calculate total = cost × quantity');
                } else {
                    console.log('❌ NEITHER interpretation matches message total');
                    console.log(`   - Message: ₹${totalFromMessage}`);
                    console.log(`   - Sum of costs: ₹${correctInterpretationTotal}`);
                    console.log(`   - Sum of (cost × qty): ₹${perUnitInterpretationTotal}`);
                }
            }
            
        } else {
            console.log('❌ No matching activity found');
        }

        console.log('\n========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the debug
debugActualCostStructure().catch(console.error);