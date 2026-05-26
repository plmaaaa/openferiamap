<?php
include_once "../conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser || !in_array($sesionUser['rol'], ['root', 'moderador', 'verificador'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No autorizado"]);
    exit;
}

try {
    $query = "SELECT f.*, IFNULL(f.verificacion, 'aprobado') as verificacion,
              (SELECT COUNT(*) FROM puntos_interes p WHERE p.id_feria = f.id_feria) as num_puntos,
              u.nombre as creador FROM ferias f JOIN usuarios u ON f.id_usuario = u.id_usuario
              WHERE f.verificacion = 'rechazado' OR (f.verificacion = 'aprobado' AND f.pending_changes IS NOT NULL)
              ORDER BY f.anio DESC";
    $stmt = $conexion->prepare($query);
    $stmt->execute();
    echo json_encode(["success" => true, "ferias" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
