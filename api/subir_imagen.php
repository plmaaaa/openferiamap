<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

$allowed_origins = ['http://localhost', 'http://127.0.0.1'];
$origin          = $_SERVER['HTTP_ORIGIN'] ?? '';
$cors_origin     = in_array($origin, $allowed_origins) ? $origin : 'http://localhost';
header("Access-Control-Allow-Origin: $cors_origin");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (empty($_SESSION['uid'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}

$target_dir = __DIR__ . "/../uploads/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0755, true);
}

if (!isset($_FILES["imagen"]) || $_FILES["imagen"]["error"] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Error al subir la imagen"]);
    exit;
}

$maxBytes = 5 * 1024 * 1024;
if ($_FILES["imagen"]["size"] > $maxBytes) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "La imagen no puede superar 5MB"]);
    exit;
}

$allowed = ["image/jpeg" => "jpg", "image/png" => "png", "image/gif" => "gif", "image/webp" => "webp"];
$finfo   = finfo_open(FILEINFO_MIME_TYPE);
$mime    = finfo_file($finfo, $_FILES["imagen"]["tmp_name"]);
finfo_close($finfo);

if (!isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Formato no permitido (jpg, png, gif, webp)"]);
    exit;
}

$filename    = uniqid("img_", true) . "." . $allowed[$mime];
$target_path = $target_dir . $filename;

if (move_uploaded_file($_FILES["imagen"]["tmp_name"], $target_path)) {
    $url = "http://" . $_SERVER["HTTP_HOST"] . "/openferiamap/uploads/" . $filename;
    echo json_encode(["success" => true, "url" => $url]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al guardar la imagen"]);
}
?>
