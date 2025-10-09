<?php
/**
 * Secure JSON API untuk mendapatkan data member berdasarkan UUID
 * Tanpa perlu login admin - menggunakan public API
 * 
 * Usage:
 * GET: saving_json.php?uuid=JPSB37142
 * POST: saving_json.php dengan body uuid=JPSB37142
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Konfigurasi
$API_BASE_URL = "http://localhost:5000/api/public";

// Fungsi untuk call API
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
        return [
            'success' => false, 
            'message' => 'CURL Error: ' . $error
        ];
    }
    
    if ($httpCode !== 200) {
        return [
            'success' => false, 
            'message' => 'HTTP Error: ' . $httpCode
        ];
    }
    
    $data = json_decode($response, true);
    return $data ?: [
        'success' => false, 
        'message' => 'Invalid JSON response'
    ];
}

// Ambil UUID dari GET, POST, atau command line
$uuid = null;

// Jika dijalankan dari command line
if (php_sapi_name() === 'cli') {
    // Ambil dari argument command line
    if (isset($argv[1])) {
        $uuid = trim($argv[1]);
    }
} else {
    // Jika dijalankan dari web server
    $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($requestMethod === 'GET' && isset($_GET['uuid'])) {
        $uuid = trim($_GET['uuid']);
    } elseif ($requestMethod === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['uuid'])) {
            $uuid = trim($data['uuid']);
        } elseif (isset($_POST['uuid'])) {
            $uuid = trim($_POST['uuid']);
        }
    }
}

// Validasi UUID
if (empty($uuid)) {
    $usage = [
        'CLI' => 'php saving_json.php JPSB37142',
        'GET' => 'saving_json.php?uuid=JPSB37142',
        'POST' => 'saving_json.php with body {"uuid":"JPSB37142"}'
    ];
    
    echo json_encode([
        'success' => false,
        'message' => 'UUID parameter is required',
        'usage' => $usage
    ], JSON_PRETTY_PRINT);
    exit;
}

// Call API untuk mendapatkan data member
$result = callAPI("/member/" . urlencode($uuid));

// Return response
echo json_encode($result, JSON_PRETTY_PRINT);
?>