const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read env file
const apiDir = path.resolve(__dirname, '..');
let envPath = path.join(apiDir, '.env.local');
if (!fs.existsSync(envPath)) {
    envPath = path.join(apiDir, '.env');
}

console.log('Loading env from:', envPath);
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        envVars[match[1].trim()] = val;
    }
});

const token = envVars.API_BEARER_TOKEN;
if (!token) {
    console.error('❌ API_BEARER_TOKEN not found in env variables');
    process.exit(1);
}

const testApi = async (url, params = {}) => {
    try {
        console.log(`\nFetching: ${url}`);
        console.log('Params:', params);
        const response = await axios.get(url, {
            params,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Status:', response.status);
        if (response.data) {
            console.log('Keys in data:', Object.keys(response.data));
            console.log('Data:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        console.error('Error fetching API:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
};

const run = async () => {
    const baseUrl = 'http://localhost:8080';
    const projectId = '6a10393784291ca6f40d1c34';
    const clientId = '69db423932f75fa039cfb76f';
    
    console.log('--- TESTING USED MATERIALS FETCH WITH MINI-SECTION ID ---');
    await testApi(`${baseUrl}/api/material-usage`, {
        projectId,
        clientId,
        sectionId: '6a10393784291ca6f40d1c49,6a10393784291ca6f40d1c46',
        miniSectionId: '6a1039a284291ca6f40d1c9a',
        limit: 10
    });
};

run();
