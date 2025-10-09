<?php
// Konfigurasi API
$api_base_url = "http://localhost:5000/api"; // Sesuaikan dengan URL server Anda

// Fungsi untuk mendapatkan data member berdasarkan UUID
function getMemberByUuid($uuid) {
    global $api_base_url;
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/members/$uuid",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . getToken(),
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        return ["error" => "Error: $err"];
    }
    
    return json_decode($response, true);
}

// Fungsi untuk mendapatkan savings berdasarkan member ID
function getSavingsByMemberId($memberId) {
    global $api_base_url;
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/savings/member/$memberId",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . getToken(),
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        return ["error" => "Error: $err"];
    }
    
    return json_decode($response, true);
}

// Fungsi untuk mendapatkan token
function getToken() {
    global $api_base_url;
    
    // Jika token sudah ada di session, gunakan token tersebut
    session_start();
    if (isset($_SESSION['token']) && isset($_SESSION['token_expiry']) && $_SESSION['token_expiry'] > time()) {
        return $_SESSION['token'];
    }
    
    // Jika tidak, dapatkan token baru
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/auth/login",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            "username" => "admin", // Ganti dengan username yang valid
            "password" => "password123" // Ganti dengan password yang valid
        ]),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        die("Error getting token: $err");
    }
    
    $data = json_decode($response, true);
    if (isset($data['data']['token'])) {
        $_SESSION['token'] = $data['data']['token'];
        $_SESSION['token_expiry'] = time() + 3600; // Token berlaku 1 jam
        return $data['data']['token'];
    }
    
    die("Failed to get token: " . print_r($data, true));
}

// Proses form submission
$result = null;
$uuid = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['uuid'])) {
    $uuid = $_POST['uuid'];
    
    // Dapatkan member berdasarkan UUID
    $memberResponse = getMemberByUuid($uuid);
    
    if (isset($memberResponse['success']) && $memberResponse['success'] === true) {
        $memberId = $memberResponse['data']['_id'];
        
        // Dapatkan savings berdasarkan member ID
        $savingsResponse = getSavingsByMemberId($memberId);
        
        if (isset($savingsResponse['statusCode']) && $savingsResponse['statusCode'] === 200) {
            $result = $savingsResponse['data'];
        } else {
            $result = ["error" => "Gagal mendapatkan data savings: " . ($savingsResponse['message'] ?? "Unknown error")];
        }
    } else {
        $result = ["error" => "Member dengan UUID $uuid tidak ditemukan"];
    }
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cek Savings Berdasarkan UUID</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding: 20px; }
        .card { margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">Cek Savings Berdasarkan UUID</h1>
        
        <div class="card">
            <div class="card-body">
                <form method="POST">
                    <div class="mb-3">
                        <label for="uuid" class="form-label">UUID Member</label>
                        <input type="text" class="form-control" id="uuid" name="uuid" value="<?php echo htmlspecialchars($uuid); ?>" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Cek Savings</button>
                </form>
            </div>
        </div>
        
        <?php if ($result): ?>
            <?php if (isset($result['error'])): ?>
                <div class="alert alert-danger">
                    <?php echo $result['error']; ?>
                </div>
            <?php else: ?>
                <h2>Hasil Pencarian</h2>
                
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Ringkasan</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <p><strong>Total Setoran:</strong> Rp <?php echo number_format($result['summary']['totalSavings'], 0, ',', '.'); ?></p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Total Penarikan:</strong> Rp <?php echo number_format($result['summary']['totalWithdrawals'], 0, ',', '.'); ?></p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Saldo:</strong> Rp <?php echo number_format($result['summary']['balance'], 0, ',', '.'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h3 class="mt-4">Daftar Transaksi</h3>
                <div class="table-responsive">
                    <table class="table table-striped table-bordered">
                        <thead class="table-dark">
                            <tr>
                                <th>Periode</th>
                                <th>Tanggal</th>
                                <th>Produk</th>
                                <th>Jenis</th>
                                <th>Jumlah</th>
                                <th>Status</th>
                                <th>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($result['savings'] as $saving): ?>
                                <tr>
                                    <td><?php echo $saving['installmentPeriod']; ?></td>
                                    <td><?php echo date('d/m/Y', strtotime($saving['savingsDate'])); ?></td>
                                    <td><?php echo $saving['productId']['title'] ?? 'Unknown'; ?></td>
                                    <td>
                                        <?php if ($saving['type'] === 'Setoran'): ?>
                                            <span class="badge bg-primary">Setoran</span>
                                        <?php else: ?>
                                            <span class="badge bg-warning">Penarikan</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>Rp <?php echo number_format($saving['amount'], 0, ',', '.'); ?></td>
                                    <td>
                                        <?php if ($saving['status'] === 'Approved'): ?>
                                            <span class="badge bg-success">Approved</span>
                                        <?php elseif ($saving['status'] === 'Rejected'): ?>
                                            <span class="badge bg-danger">Rejected</span>
                                        <?php else: ?>
                                            <span class="badge bg-secondary">Pending</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo $saving['description'] ?? '-'; ?></td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (empty($result['savings'])): ?>
                                <tr>
                                    <td colspan="7" class="text-center">Tidak ada data transaksi</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>