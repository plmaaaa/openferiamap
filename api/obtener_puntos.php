<?php
include_once "conexion.php";

$id_feria = isset($_GET['id_feria']) ? intval($_GET['id_feria']) : 0;
if ($id_feria <= 0) { echo json_encode([]); exit; }

$sesionUser = getSessionUser($conexion);
$id_usuario = $sesionUser ? $sesionUser['id_usuario'] : null;
$rolSesion  = $sesionUser ? $sesionUser['rol'] : null;

try {
    $fairCheck = $conexion->prepare("SELECT f.id_usuario, f.estado, IFNULL(f.verificacion, 'aprobado') AS verificacion
        FROM ferias f WHERE f.id_feria = :id_feria");
    $fairCheck->bindParam(":id_feria", $id_feria, PDO::PARAM_INT);
    $fairCheck->execute();
    $fair = $fairCheck->fetch(PDO::FETCH_ASSOC);

    if (!$fair) { echo json_encode([]); exit; }

    $isOwner          = $id_usuario && $fair['id_usuario'] == $id_usuario;
    $isStaff          = in_array($rolSesion, ['root', 'moderador', 'verificador']);
    $isPublicApproved = $fair['verificacion'] === 'aprobado' && $fair['estado'] === 'publico';
    $isVisibleToStaff = $isStaff && $fair['verificacion'] !== 'borrador';

    if (!$isOwner && !$isPublicApproved && !$isVisibleToStaff) { echo json_encode([]); exit; }

    $query = "SELECT p.*,
              (SELECT ROUND(AVG(r.puntuacion), 1) FROM resenas r WHERE r.id_punto = p.id_punto) as promedio,
              (SELECT COUNT(*) FROM resenas r WHERE r.id_punto = p.id_punto) as num_resenas
              FROM puntos_interes p WHERE p.id_feria = :id_feria";
    $stmt = $conexion->prepare($query);
    $stmt->bindParam(":id_feria", $id_feria, PDO::PARAM_INT);
    $stmt->execute();
    $puntos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($puntos as &$p) {
        $coords = json_decode($p['coordenadas'], true);
        if ($p['tipo_geometria'] === 'marcador' && is_array($coords)) {
            $p['latitud']  = $coords['lat'] ?? null;
            $p['longitud'] = $coords['lng'] ?? null;
        } else {
            $p['latitud']  = null;
            $p['longitud'] = null;
        }
        $p['historia']    = $p['sinopsis']   ?? '';
        $p['imagenes']    = $p['imagen_url'] ?? '';
        $p['promedio']    = $p['promedio']   ? floatval($p['promedio']) : null;
        $p['num_resenas'] = intval($p['num_resenas']);
    }
    unset($p);

    echo json_encode($puntos);
} catch (PDOException $e) {
    echo json_encode([]);
}
?>
