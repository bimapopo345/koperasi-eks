<?php
/**
 * Secure API Consumer untuk Sistem Koperasi
 * Menggunakan Public API tanpa perlu login admin
 * 
 * Endpoints:
 * - http://localhost:5000/api/public/savings
 * - http://localhost:5000/api/public/members  
 * - http://localhost:5000/api/public/products
 * - http://localhost:5000/api/public/summary
 */

// Konfigurasi
$API_BASE_URL = "http://localhost:5000/api/public";

// Fungsi helper untuk API call
function callAPI($endpoint) {
    global $API_BASE_URL;
    
    $url = $API_BASE_URL . $endpoint;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return ['success' => false, 'message' => 'CURL Error: ' . $error];
    }
    
    if ($httpCode !== 200) {
        return ['success' => false, 'message' => 'HTTP Error: ' . $httpCode];
    }
    
    $data = json_decode($response, true);
    return $data ?: ['success' => false, 'message' => 'Invalid JSON response'];
}

// Fungsi untuk mengambil data savings
function getSavings() {
    return callAPI('/savings');
}

// Fungsi untuk mengambil data members
function getMembers() {
    return callAPI('/members');
}

// Fungsi untuk mengambil data products
function getProducts() {
    return callAPI('/products');
}

// Fungsi untuk mengambil summary
function getSummary() {
    return callAPI('/summary');
}

// Format currency Indonesia
function formatRupiah($amount) {
    return 'Rp ' . number_format($amount, 0, ',', '.');
}

// Format date Indonesia
function formatDate($dateString) {
    $date = new DateTime($dateString);
    return $date->format('d/m/Y H:i');
}

// Handle AJAX requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'savings':
            echo json_encode(getSavings());
            break;
        case 'members':
            echo json_encode(getMembers());
            break;
        case 'products':
            echo json_encode(getProducts());
            break;
        case 'summary':
            echo json_encode(getSummary());
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}

// Ambil data untuk tampilan
$summary = getSummary();
$savings = getSavings();
$members = getMembers();
$products = getProducts();
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Koperasi - Secure API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            border-left: 5px solid #667eea;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        .card h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .tabs {
            display: flex;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 5px;
            margin-bottom: 20px;
        }
        
        .tab {
            flex: 1;
            padding: 15px;
            text-align: center;
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .tab.active {
            background: #667eea;
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .table-container {
            overflow-x: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .status {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
        }
        
        .status.approved {
            background: #d4edda;
            color: #155724;
        }
        
        .status.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .refresh-btn:hover {
            background: #5a6fd8;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Data Koperasi</h1>
            <p>Secure API - Tanpa Login Admin</p>
        </div>
        
        <div class="content">
            <!-- Summary Cards -->
            <?php if ($summary['success']): ?>
            <div class="summary-cards">
                <div class="card">
                    <h3>👥 Total Anggota</h3>
                    <div class="value"><?= $summary['data']['totalMembers'] ?></div>
                </div>
                <div class="card">
                    <h3>📦 Total Produk</h3>
                    <div class="value"><?= $summary['data']['totalProducts'] ?></div>
                </div>
                <div class="card">
                    <h3>💰 Total Simpanan</h3>
                    <div class="value"><?= formatRupiah($summary['data']['totalSavings']) ?></div>
                </div>
                <div class="card">
                    <h3>💳 Saldo</h3>
                    <div class="value"><?= formatRupiah($summary['data']['balance']) ?></div>
                </div>
            </div>
            <?php else: ?>
            <div class="error">❌ Gagal memuat ringkasan: <?= $summary['message'] ?></div>
            <?php endif; ?>
            
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
            
            <!-- Tabs -->
            <div class="tabs">
                <button class="tab active" onclick="showTab('savings')">💰 Simpanan</button>
                <button class="tab" onclick="showTab('members')">👥 Anggota</button>
                <button class="tab" onclick="showTab('products')">📦 Produk</button>
            </div>
            
            <!-- Savings Tab -->
            <div id="savings" class="tab-content active">
                <h2>💰 Data Simpanan</h2>
                <?php if ($savings['success']): ?>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Anggota</th>
                                <th>Produk</th>
                                <th>Periode</th>
                                <th>Jumlah</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($savings['data'] as $saving): ?>
                            <tr>
                                <td><?= formatDate($saving['savingsDate']) ?></td>
                                <td>
                                    <strong><?= htmlspecialchars($saving['member']['name']) ?></strong><br>
                                    <small><?= htmlspecialchars($saving['member']['uuid']) ?></small>
                                </td>
                                <td><?= htmlspecialchars($saving['product']['title']) ?></td>
                                <td><?= $saving['installmentPeriod'] ?> bulan</td>
                                <td><?= formatRupiah($saving['amount']) ?></td>
                                <td>
                                    <span class="status <?= strtolower($saving['status']) ?>">
                                        <?= $saving['status'] ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php else: ?>
                <div class="error">❌ Gagal memuat data simpanan: <?= $savings['message'] ?></div>
                <?php endif; ?>
            </div>
            
            <!-- Members Tab -->
            <div id="members" class="tab-content">
                <h2>👥 Data Anggota</h2>
                <?php if ($members['success']): ?>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>UUID</th>
                                <th>Nama</th>
                                <th>Gender</th>
                                <th>Kota</th>
                                <th>Produk</th>
                                <th>Total Simpanan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($members['data'] as $member): ?>
                            <tr>
                                <td><?= htmlspecialchars($member['uuid']) ?></td>
                                <td>
                                    <strong><?= htmlspecialchars($member['name']) ?></strong><br>
                                    <small><?= htmlspecialchars($member['username']) ?></small>
                                </td>
                                <td><?= $member['gender'] === 'L' ? 'Laki-laki' : 'Perempuan' ?></td>
                                <td><?= htmlspecialchars($member['city'] ?: '-') ?></td>
                                <td>
                                    <?php if ($member['product']): ?>
                                        <?= htmlspecialchars($member['product']['title']) ?>
                                    <?php else: ?>
                                        <em>Belum pilih produk</em>
                                    <?php endif; ?>
                                </td>
                                <td><?= formatRupiah($member['totalSavings']) ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php else: ?>
                <div class="error">❌ Gagal memuat data anggota: <?= $members['message'] ?></div>
                <?php endif; ?>
            </div>
            
            <!-- Products Tab -->
            <div id="products" class="tab-content">
                <h2>📦 Data Produk</h2>
                <?php if ($products['success']): ?>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nama Produk</th>
                                <th>Setoran Minimal</th>
                                <th>Keuntungan</th>
                                <th>Durasi</th>
                                <th>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($products['data'] as $product): ?>
                            <tr>
                                <td><strong><?= htmlspecialchars($product['title']) ?></strong></td>
                                <td><?= formatRupiah($product['depositAmount']) ?></td>
                                <td><?= $product['returnProfit'] ?>%</td>
                                <td><?= $product['termDuration'] ?> bulan</td>
                                <td><?= htmlspecialchars($product['description'] ?: '-') ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php else: ?>
                <div class="error">❌ Gagal memuat data produk: <?= $products['message'] ?></div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab contents
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
        
        // Auto refresh every 30 seconds
        setInterval(() => {
            console.log('Auto refreshing data...');
            location.reload();
        }, 30000);
    </script>
</body>
</html>