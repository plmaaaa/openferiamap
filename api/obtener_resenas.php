<?php
include_once "conexion.php";

$id_punto = isset($_GET['id_punto']) ? intval($_GET['id_punto']) : 0;
if ($id_punto <= 0) { echo json_encode([]); exit; }

$sesionUser = getSessionUser($conexion);
$id_usuario = $sesionUser ? $sesionUser['id_usuario'] : null;
$rolSesion  = $sesionUser ? $sesionUser['rol'] : null;

try {
    $check = $conexion->prepare("SELECT f.id_usuario AS dueno, f.estado, IFNULL(f.verificacion, 'aprobado') AS verificacion
        FROM puntos_interes p
        JOIN ferias f ON f.id_feria = p.id_feria
        WHERE p.id_punto = :id_punto");
    $check->bindParam(":id_punto", $id_punto, PDO::PARAM_INT);
    $check->execute();
    $point = $check->fetch(PDO::FETCH_ASSOC);

    $isOwner          = $id_usuario && $point && $point['dueno'] == $id_usuario;
    $isStaff          = in_array($rolSesion, ['root', 'moderador', 'verificador']);
    $isPublicApproved = $point && $point['verificacion'] === 'aprobado' && $point['estado'] === 'publico';

    if (!$point || (!$isOwner && !$isStaff && !$isPublicApproved)) {
        echo json_encode([]);
        exit;
    }

    $stmt = $conexion->prepare(
        "SELECT r.*, u.nombre as autor FROM resenas r
         LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
         WHERE r.id_punto = :id_punto ORDER BY r.fecha_publicacion DESC"
    );
    $stmt->bindParam(":id_punto", $id_punto, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    echo json_encode([]);
}
?>
