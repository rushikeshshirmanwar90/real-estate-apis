/**
 * Real Estate API Test Suite
 * Run with: node test-apis.js
 *
 * Make sure your server is running on http://localhost:8080
 */

const BASE_URL = "http://localhost:8080";

// Test data
const testData = {
  email: "test@example.com",
  password: "TestPass123!",
  clientId: "", // Will be set from actual data
  userId: "", // Will be set from actual data
  leadId: "",
  eventId: "",
  projectId: "",
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test assertion helper
function assert(condition, testName, message = "") {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    results.passed++;
    results.tests.push({ name: testName, status: "passed" });
  } else {
    console.log(
      `${colors.red}✗${colors.reset} ${testName}${message ? ": " + message : ""}`
    );
    results.failed++;
    results.tests.push({ name: testName, status: "failed", message });
  }
}

function skip(testName, reason) {
  console.log(`${colors.yellow}⊘${colors.reset} ${testName} (${reason})`);
  results.skipped++;
  results.tests.push({ name: testName, status: "skipped", reason });
}

// Test suites
async function testLogin() {
  console.log(`\n${colors.cyan}=== Testing Login API ===${colors.reset}`);

  // Test 1: Valid login
  const loginResponse = await makeRequest("POST", "/api/login", {
    email: testData.email,
    password: testData.password,
  });

  assert(
    loginResponse.status === 200 || loginResponse.status === 401,
    "Login endpoint responds",
    `Got status ${loginResponse.status}`
  );

  if (loginResponse.status === 200) {
    assert(loginResponse.data.success === true, "Login returns success field");
    assert(
      loginResponse.data.data && loginResponse.data.data.user,
      "Login returns user data"
    );
    assert(
      loginResponse.data.data && loginResponse.data.data.token,
      "Login returns auth token"
    );
  }

  // Test 2: Invalid credentials
  const invalidLogin = await makeRequest("POST", "/api/login", {
    email: testData.email,
    password: "WrongPassword123!",
  });

  assert(
    invalidLogin.status === 401,
    "Invalid credentials return 401",
    `Got status ${invalidLogin.status}`
  );

  // Test 3: Missing fields
  const missingFields = await makeRequest("POST", "/api/login", {
    email: testData.email,
  });

  assert(
    missingFields.status === 400,
    "Missing password returns 400",
    `Got status ${missingFields.status}`
  );
}

async function testClients() {
  console.log(`\n${colors.cyan}=== Testing Clients API ===${colors.reset}`);

  // Test 1: Get all clients with pagination
  const clientsResponse = await makeRequest(
    "GET",
    "/api/clients?page=1&limit=10"
  );

  assert(
    clientsResponse.status === 200,
    "Get clients endpoint responds",
    `Got status ${clientsResponse.status}`
  );

  if (clientsResponse.status === 200) {
    assert(
      clientsResponse.data.data && clientsResponse.data.data.clients,
      "Response has clients array"
    );
    assert(
      clientsResponse.data.data && clientsResponse.data.data.meta,
      "Response has pagination metadata"
    );
    assert(
      clientsResponse.data.data.meta.page === 1,
      "Pagination page is correct"
    );
    assert(
      clientsResponse.data.data.meta.limit === 10,
      "Pagination limit is correct"
    );

    // Check if passwords are excluded
    if (clientsResponse.data.data.clients.length > 0) {
      assert(
        !clientsResponse.data.data.clients[0].password,
        "Passwords are not exposed in response"
      );
      testData.clientId = clientsResponse.data.data.clients[0]._id;
    }
  }

  // Test 2: Get client by email
  if (testData.email) {
    const clientByEmail = await makeRequest(
      "GET",
      `/api/clients?email=${testData.email}`
    );
    assert(
      clientByEmail.status === 200 || clientByEmail.status === 404,
      "Get client by email responds",
      `Got status ${clientByEmail.status}`
    );
  }
}

async function testLeads() {
  console.log(`\n${colors.cyan}=== Testing Leads API ===${colors.reset}`);

  if (!testData.clientId) {
    skip("Leads tests", "No clientId available");
    return;
  }

  // Test 1: Get leads with pagination
  const leadsResponse = await makeRequest(
    "GET",
    `/api/leads?clientId=${testData.clientId}&page=1&limit=10`
  );

  assert(
    leadsResponse.status === 200 || leadsResponse.status === 404,
    "Get leads endpoint responds",
    `Got status ${leadsResponse.status}`
  );

  if (leadsResponse.status === 200) {
    assert(
      leadsResponse.data.data && leadsResponse.data.data.leads,
      "Response has leads array"
    );
    assert(
      leadsResponse.data.data && leadsResponse.data.data.meta,
      "Response has pagination metadata"
    );
  }

  // Test 2: Create lead
  const createLead = await makeRequest("POST", "/api/leads", {
    clientId: testData.clientId,
    name: "Test Lead",
    email: "testlead@example.com",
    phone: "1234567890",
    status: "new",
  });

  assert(
    createLead.status === 201 || createLead.status === 400,
    "Create lead endpoint responds",
    `Got status ${createLead.status}`
  );

  if (createLead.status === 201) {
    assert(createLead.data.success === true, "Lead creation returns success");
    assert(
      createLead.data.data && createLead.data.data._id,
      "Lead creation returns ID"
    );
    testData.leadId = createLead.data.data._id;
  }
}

async function testEvents() {
  console.log(`\n${colors.cyan}=== Testing Events API ===${colors.reset}`);

  // Test 1: Get all events with pagination
  const eventsResponse = await makeRequest(
    "GET",
    "/api/events?page=1&limit=10"
  );

  assert(
    eventsResponse.status === 200,
    "Get events endpoint responds",
    `Got status ${eventsResponse.status}`
  );

  if (eventsResponse.status === 200) {
    assert(
      eventsResponse.data.data && eventsResponse.data.data.events,
      "Response has events array"
    );
    assert(
      eventsResponse.data.data && eventsResponse.data.data.meta,
      "Response has pagination metadata"
    );
  }

  // Test 2: Create event
  const createEvent = await makeRequest("POST", "/api/events", {
    title: "Test Event",
    description: "This is a test event",
    date: new Date().toISOString(),
    location: "Test Location",
  });

  assert(
    createEvent.status === 201 || createEvent.status === 400,
    "Create event endpoint responds",
    `Got status ${createEvent.status}`
  );

  if (createEvent.status === 201) {
    assert(createEvent.data.success === true, "Event creation returns success");
    testData.eventId = createEvent.data.data._id;
  }
}

async function testProjects() {
  console.log(`\n${colors.cyan}=== Testing Projects API ===${colors.reset}`);

  if (!testData.clientId) {
    skip("Projects tests", "No clientId available");
    return;
  }

  // Test 1: Get projects with pagination
  const projectsResponse = await makeRequest(
    "GET",
    `/api/project?clientId=${testData.clientId}&page=1&limit=10`
  );

  assert(
    projectsResponse.status === 200 || projectsResponse.status === 404,
    "Get projects endpoint responds",
    `Got status ${projectsResponse.status}`
  );

  if (projectsResponse.status === 200) {
    assert(
      projectsResponse.data.data && projectsResponse.data.data.projects,
      "Response has projects array"
    );
    assert(
      projectsResponse.data.data && projectsResponse.data.data.meta,
      "Response has pagination metadata"
    );
  }
}

async function testContacts() {
  console.log(`\n${colors.cyan}=== Testing Contacts API ===${colors.reset}`);

  if (!testData.clientId) {
    skip("Contacts tests", "No clientId available");
    return;
  }

  // Test 1: Get contacts with pagination
  const contactsResponse = await makeRequest(
    "GET",
    `/api/contacts?clientId=${testData.clientId}&page=1&limit=10`
  );

  assert(
    contactsResponse.status === 200 || contactsResponse.status === 404,
    "Get contacts endpoint responds",
    `Got status ${contactsResponse.status}`
  );

  if (contactsResponse.status === 200) {
    assert(
      contactsResponse.data.data && contactsResponse.data.data.contacts,
      "Response has contacts array"
    );
    assert(
      contactsResponse.data.data && contactsResponse.data.data.meta,
      "Response has pagination metadata"
    );
  }
}

async function testBuildings() {
  console.log(`\n${colors.cyan}=== Testing Buildings API ===${colors.reset}`);

  // Test 1: Get buildings with pagination
  const buildingsResponse = await makeRequest(
    "GET",
    "/api/building?page=1&limit=10"
  );

  assert(
    buildingsResponse.status === 200,
    "Get buildings endpoint responds",
    `Got status ${buildingsResponse.status}`
  );

  if (buildingsResponse.status === 200) {
    assert(
      buildingsResponse.data.data && buildingsResponse.data.data.buildings,
      "Response has buildings array"
    );
    assert(
      buildingsResponse.data.data && buildingsResponse.data.data.meta,
      "Response has pagination metadata"
    );
  }
}

async function testOTP() {
  console.log(`\n${colors.cyan}=== Testing OTP API ===${colors.reset}`);

  // Test 1: Send OTP
  const sendOTP = await makeRequest("POST", "/api/otp", {
    email: testData.email,
  });

  assert(
    sendOTP.status === 200 || sendOTP.status === 404 || sendOTP.status === 429,
    "Send OTP endpoint responds",
    `Got status ${sendOTP.status}`
  );

  if (sendOTP.status === 200) {
    assert(sendOTP.data.success === true, "OTP send returns success");
    assert(
      sendOTP.data.data && sendOTP.data.data.expiresIn,
      "OTP response includes expiration info"
    );
  }

  // Test 2: Verify OTP (will fail without real OTP)
  const verifyOTP = await makeRequest("POST", "/api/otp/verify", {
    email: testData.email,
    otp: "123456",
  });

  assert(
    verifyOTP.status === 200 ||
      verifyOTP.status === 400 ||
      verifyOTP.status === 404,
    "Verify OTP endpoint responds",
    `Got status ${verifyOTP.status}`
  );
}

// Main test runner
async function runAllTests() {
  console.log(
    `${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║  Real Estate API Test Suite               ║${colors.reset}`
  );
  console.log(
    `${colors.blue}║  Testing: ${BASE_URL}           ║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`
  );

  const startTime = Date.now();

  try {
    await testLogin();
    await testClients();
    await testLeads();
    await testEvents();
    await testProjects();
    await testContacts();
    await testBuildings();
    await testOTP();
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(
    `\n${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║  Test Summary                              ║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`
  );
  console.log(`${colors.green}Passed:${colors.reset}  ${results.passed}`);
  console.log(`${colors.red}Failed:${colors.reset}  ${results.failed}`);
  console.log(`${colors.yellow}Skipped:${colors.reset} ${results.skipped}`);
  console.log(
    `${colors.cyan}Total:${colors.reset}   ${results.passed + results.failed + results.skipped}`
  );
  console.log(`${colors.cyan}Duration:${colors.reset} ${duration}s`);

  const successRate = (
    (results.passed / (results.passed + results.failed)) *
    100
  ).toFixed(1);
  console.log(`\n${colors.cyan}Success Rate:${colors.reset} ${successRate}%`);

  if (results.failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(
      `\n${colors.red}✗ Some tests failed. Review the output above.${colors.reset}`
    );
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === "undefined") {
  console.error(
    `${colors.red}Error: This script requires Node.js 18+ with native fetch support.${colors.reset}`
  );
  console.error("Please upgrade Node.js or use a polyfill.");
  process.exit(1);
}

// Run tests
runAllTests();
