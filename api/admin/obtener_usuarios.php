<?php
include_once "../conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser || !in_array($sesionUser['rol'], ['root', 'moderador'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tienes permiso para ver usuarios"]);
    exit;
}

try {
    $stmt = $conexion->prepare("SELECT id_usuario, nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC");
    $stmt->execute();
    echo json_encode(["success" => true, "usuarios" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
