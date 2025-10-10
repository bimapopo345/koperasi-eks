# MERN Koperasi API Testing Script
# ==================================

$baseUrl = "http://localhost:5000"
$token = ""
$memberId = ""
$productId = ""
$savingId = ""

# Color output functions
function Write-TestHeader($message) {
    Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Yellow
}

# Helper function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = @{},
        [bool]$UseToken = $false
    )
    
    $uri = "$baseUrl$Endpoint"
    $headers = @{"Content-Type" = "application/json"}
    
    if ($UseToken -and $token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body.Count -gt 0 -and $Method -ne "GET") {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Error "API Call Failed: $_"
        return $null
    }
}

# =====================================
# 1. AUTHENTICATION TESTS
# =====================================
Write-TestHeader "AUTHENTICATION TESTS"

# Admin Login
Write-Info "Testing Admin Login..."
$loginResponse = Invoke-API -Method POST -Endpoint "/api/admin/auth/login" -Body @{
    username = "admin"
    password = "admin123"
}

if ($loginResponse.success) {
    $token = $loginResponse.data.token
    Write-Success "Admin login successful! Token received."
} else {
    Write-Error "Admin login failed!"
}

# =====================================
# 2. MEMBER MANAGEMENT TESTS
# =====================================
Write-TestHeader "MEMBER MANAGEMENT TESTS"

# Get all members
Write-Info "Getting all members..."
$members = Invoke-API -Method GET -Endpoint "/api/admin/members" -UseToken $true
if ($members.success -or $members.data) {
    Write-Success "Retrieved members list"
    $existingMembers = if ($members.data) { $members.data } else { $members }
    if ($existingMembers -and $existingMembers.Count -gt 0) {
        $memberId = $existingMembers[0]._id
        Write-Info "Using existing member ID: $memberId"
    }
}

# Create new member (if no members exist)
if (-not $memberId) {
    Write-Info "Creating new member..."
    $newMember = Invoke-API -Method POST -Endpoint "/api/admin/members" -UseToken $true -Body @{
        name = "Test Member $(Get-Random -Maximum 1000)"
        email = "test$(Get-Random -Maximum 1000)@test.com"
        phone = "081234567$(Get-Random -Maximum 999)"
        address = "Jl. Test No. 123"
        productId = $null
    }
    
    if ($newMember.success -or $newMember._id) {
        Write-Success "Member created successfully"
        $memberId = if ($newMember.data._id) { $newMember.data._id } else { $newMember._id }
    }
}

# =====================================
# 3. PRODUCT MANAGEMENT TESTS
# =====================================
Write-TestHeader "PRODUCT MANAGEMENT TESTS"

# Get all products
Write-Info "Getting all products..."
$products = Invoke-API -Method GET -Endpoint "/api/admin/products" -UseToken $true
if ($products.success -or $products.data) {
    Write-Success "Retrieved products list"
    $productList = if ($products.data) { $products.data } else { $products }
    if ($productList -and $productList.Count -gt 0) {
        $productId = $productList[0]._id
        Write-Info "Using product ID: $productId"
    }
}

# Create new product (if no products exist)
if (-not $productId) {
    Write-Info "Creating new product..."
    $newProduct = Invoke-API -Method POST -Endpoint "/api/admin/products" -UseToken $true -Body @{
        title = "Test Product $(Get-Random -Maximum 1000)"
        depositAmount = 100000
        termDuration = 12
        returnProfit = 10
        minDeposit = 100000
        maxDeposit = 10000000
        description = "Test product description"
        features = @("Feature 1", "Feature 2")
    }
    
    if ($newProduct.success -or $newProduct._id) {
        Write-Success "Product created successfully"
        $productId = if ($newProduct.data._id) { $newProduct.data._id } else { $newProduct._id }
    }
}

# =====================================
# 4. SAVINGS MANAGEMENT TESTS
# =====================================
Write-TestHeader "SAVINGS MANAGEMENT TESTS"

# Check last installment period
if ($memberId -and $productId) {
    Write-Info "Checking last installment period..."
    $periodCheck = Invoke-API -Method GET -Endpoint "/api/admin/savings/check-period/$memberId/$productId" -UseToken $true
    if ($periodCheck.success) {
        Write-Success "Period check successful"
        Write-Info "Next Period: $($periodCheck.data.nextPeriod)"
        Write-Info "Expected Amount: $($periodCheck.data.expectedAmount)"
        Write-Info "Has Upgrade: $($periodCheck.data.hasUpgrade)"
    }
}

# Create new savings
Write-Info "Creating new savings entry..."
$newSaving = Invoke-API -Method POST -Endpoint "/api/admin/savings" -UseToken $true -Body @{
    installmentPeriod = 1
    memberId = $memberId
    productId = $productId
    amount = 100000
    savingsDate = (Get-Date).ToString("yyyy-MM-dd")
    type = "Setoran"
    description = "Test Savings"
    status = "Pending"
    paymentType = "Full"
    notes = "Test notes"
}

if ($newSaving.success -or $newSaving._id) {
    Write-Success "Savings created successfully"
    $savingId = if ($newSaving.data._id) { $newSaving.data._id } else { $newSaving._id }
}

# Get all savings
Write-Info "Getting all savings..."
$savings = Invoke-API -Method GET -Endpoint "/api/admin/savings?page=1&limit=10" -UseToken $true
if ($savings.success -or $savings.data) {
    Write-Success "Retrieved savings list"
}

# =====================================
# 5. PRODUCT UPGRADE TESTS
# =====================================
Write-TestHeader "PRODUCT UPGRADE TESTS"

# Get product upgrades
Write-Info "Getting product upgrades..."
$upgrades = Invoke-API -Method GET -Endpoint "/api/admin/product-upgrades" -UseToken $true
if ($upgrades) {
    Write-Success "Retrieved upgrades list"
}

# Check if member can upgrade
if ($memberId) {
    Write-Info "Checking upgrade availability for member..."
    $upgradeCheck = Invoke-API -Method GET -Endpoint "/api/admin/product-upgrades/check/$memberId" -UseToken $true
    if ($upgradeCheck) {
        if ($upgradeCheck.data.canUpgrade) {
            Write-Success "Member can upgrade"
            Write-Info "Available products: $($upgradeCheck.data.availableProducts.Count)"
        } else {
            Write-Info "Member cannot upgrade: $($upgradeCheck.data.reason)"
        }
    }
}

# =====================================
# 6. MEMBER API TESTS (Student Dashboard)
# =====================================
Write-TestHeader "MEMBER API TESTS"

# Get member by UUID (if exists)
if ($members -and $existingMembers[0].uuid) {
    $memberUuid = $existingMembers[0].uuid
    Write-Info "Testing member dashboard for UUID: $memberUuid"
    
    # Get member info
    $memberInfo = Invoke-API -Method GET -Endpoint "/api/members/$memberUuid"
    if ($memberInfo) {
        Write-Success "Retrieved member info"
    }
    
    # Get member savings
    $memberSavings = Invoke-API -Method GET -Endpoint "/api/savings/member/$memberUuid"
    if ($memberSavings) {
        Write-Success "Retrieved member savings"
    }
}

# =====================================
# 7. DASHBOARD STATS
# =====================================
Write-TestHeader "DASHBOARD STATISTICS"

# Get dashboard stats
Write-Info "Getting dashboard statistics..."
$stats = Invoke-API -Method GET -Endpoint "/api/admin/dashboard/stats" -UseToken $true
if ($stats) {
    Write-Success "Retrieved dashboard stats"
    if ($stats.data) {
        Write-Info "Total Members: $($stats.data.totalMembers)"
        Write-Info "Total Savings: $($stats.data.totalSavings)"
        Write-Info "Active Products: $($stats.data.totalProducts)"
    }
}

# =====================================
# SUMMARY
# =====================================
Write-TestHeader "TEST SUMMARY"
Write-Success "API Testing completed!"
Write-Info "Token: $($token.Substring(0, 20))..."
Write-Info "Member ID: $memberId"
Write-Info "Product ID: $productId"
Write-Info "Saving ID: $savingId"
