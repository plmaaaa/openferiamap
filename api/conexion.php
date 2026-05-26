<?php
if (session_status() === PHP_SESSION_NONE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => $isSecure ? 'None' : 'Lax',
        'secure'   => $isSecure,
    ]);
    session_start();
}

$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'https://localhost',        // Capacitor Android WebView
    'capacitor://localhost',    // Capacitor iOS / older Android
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$cors_origin = in_array($origin, $allowed_origins) ? $origin : 'http://localhost';
header("Access-Control-Allow-Origin: $cors_origin");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$host     = "localhost";
$db_name  = "db_openferiamap";
$username = "root";
$password = "";

function getSessionUser($conexion) {
    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) return null;
    $stmt = $conexion->prepare("SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = :id");
    $stmt->bindParam(":id", $uid, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

try {
    $tmp = new PDO("mysql:host=" . $host . ";charset=utf8mb4", $username, $password);
    $tmp->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
    $tmp = null;

    $conexion = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $conexion->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol ENUM('root', 'moderador', 'verificador', 'usuario') DEFAULT 'usuario',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    $conexion->exec("CREATE TABLE IF NOT EXISTS ferias (
        id_feria INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        nombre_feria VARCHAR(150) NOT NULL,
        localidad VARCHAR(100) NOT NULL,
        anio INT NOT NULL,
        estado ENUM('publico', 'privado') DEFAULT 'privado',
        verificacion ENUM('borrador', 'pendiente', 'aprobado', 'rechazado') DEFAULT 'borrador',
        verificado_por INT DEFAULT NULL,
        motivo_rechazo TEXT DEFAULT NULL,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    $conexion->exec("CREATE TABLE IF NOT EXISTS puntos_interes (
        id_punto INT AUTO_INCREMENT PRIMARY KEY,
        id_feria INT NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'otro',
        tipo_geometria ENUM('marcador', 'recuadro') DEFAULT 'marcador',
        coordenadas TEXT NOT NULL,
        sinopsis TEXT,
        imagen_url VARCHAR(255) DEFAULT NULL,
        FOREIGN KEY (id_feria) REFERENCES ferias(id_feria) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    $conexion->exec("CREATE TABLE IF NOT EXISTS resenas (
        id_resena INT AUTO_INCREMENT PRIMARY KEY,
        id_punto INT NOT NULL,
        id_usuario INT DEFAULT NULL,
        comentario TEXT NOT NULL,
        puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
        fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_punto) REFERENCES puntos_interes(id_punto) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
    ) ENGINE=InnoDB");

    // schema_version MUST exist before querying it
    $conexion->exec("CREATE TABLE IF NOT EXISTS schema_version (
        version INT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $vRow    = $conexion->query("SELECT COALESCE(MAX(version), 0) FROM schema_version")->fetchColumn();
    $version = ($vRow === false) ? 0 : intval($vRow);

    if ($version < 1) {
        try { $conexion->exec("ALTER TABLE usuarios ADD token VARCHAR(255) DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE usuarios ADD rol ENUM('root', 'moderador', 'verificador', 'usuario') DEFAULT 'usuario'"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD centro_lat DOUBLE DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD centro_lng DOUBLE DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD zoom INT DEFAULT 15"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD zona TEXT DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD color_perimetro VARCHAR(7) DEFAULT '#e74c3c'"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD verificacion ENUM('pendiente', 'aprobado', 'rechazado') DEFAULT 'pendiente'"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD verificado_por INT DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD motivo_rechazo TEXT DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("UPDATE ferias SET verificacion = 'aprobado' WHERE verificacion IS NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE resenas ADD id_usuario INT DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias ADD pending_changes TEXT DEFAULT NULL"); } catch(PDOException $e) {}
        try { $conexion->exec("ALTER TABLE ferias MODIFY COLUMN verificacion ENUM('borrador', 'pendiente', 'aprobado', 'rechazado') DEFAULT 'borrador'"); } catch(PDOException $e) {}
        $conexion->exec("INSERT INTO schema_version (version) VALUES (1) ON DUPLICATE KEY UPDATE applied_at = applied_at");
        $version = 1;
    }

    if ($version < 2) {
        /* Cambiar categoria de ENUM a VARCHAR para soportar subcategorías (caseta_publica, cacharrito_vikinga, etc.) */
        try { $conexion->exec("ALTER TABLE puntos_interes MODIFY COLUMN categoria VARCHAR(50) NOT NULL DEFAULT 'otro'"); } catch(PDOException $e) {}
        $conexion->exec("INSERT INTO schema_version (version) VALUES (2) ON DUPLICATE KEY UPDATE applied_at = applied_at");
        $version = 2;
    }

    $seed_check = $conexion->query("SELECT COUNT(*) FROM usuarios WHERE email = 'admin@openferiamap.com'")->fetchColumn();
    if ($seed_check == 0) {
        $admin_hash = password_hash('openferiamap', PASSWORD_DEFAULT);
        $n = 'Admin'; $e = 'admin@openferiamap.com'; $p = $admin_hash;
        $seed = $conexion->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (:nombre, :email, :password, 'root')");
        $seed->bindParam(":nombre", $n);
        $seed->bindParam(":email",  $e);
        $seed->bindParam(":password", $p);
        $seed->execute();
    }

} catch(PDOException $exception) {
    http_response_code(503);
    echo json_encode(["success" => false, "message" => "No se puede conectar con la base de datos"]);
    exit;
}
?>
