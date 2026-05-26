<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
$id_usuario = $sesionUser ? $sesionUser['id_usuario'] : null;
$rol        = $sesionUser ? $sesionUser['rol'] : null;
$isStaff    = in_array($rol, ['root', 'moderador', 'verificador']);

try {
    if ($isStaff) {
        $query = "SELECT f.*, IFNULL(f.verificacion, 'aprobado') as verificacion,
                  (SELECT COUNT(*) FROM puntos_interes p WHERE p.id_feria = f.id_feria) as num_puntos,
                  u.nombre as creador, u.rol as creador_rol
                  FROM ferias f JOIN usuarios u ON f.id_usuario = u.id_usuario
                  WHERE f.verificacion != 'borrador' OR f.id_usuario = :uid
                  ORDER BY f.anio DESC";
        $stmt = $conexion->prepare($query);
        $stmt->bindParam(":uid", $id_usuario);
    } elseif ($id_usuario) {
        $query = "SELECT f.*, IFNULL(f.verificacion, 'aprobado') as verificacion,
                  (SELECT COUNT(*) FROM puntos_interes p WHERE p.id_feria = f.id_feria) as num_puntos,
                  u.nombre as creador, u.rol as creador_rol
                  FROM ferias f JOIN usuarios u ON f.id_usuario = u.id_usuario
                  WHERE (IFNULL(f.verificacion, 'aprobado') = 'aprobado' AND f.estado = 'publico') OR f.id_usuario = :uid
                  ORDER BY f.anio DESC";
        $stmt = $conexion->prepare($query);
        $stmt->bindParam(":uid", $id_usuario);
    } else {
        $query = "SELECT f.*, IFNULL(f.verificacion, 'aprobado') as verificacion,
                  (SELECT COUNT(*) FROM puntos_interes p WHERE p.id_feria = f.id_feria) as num_puntos,
                  u.nombre as creador, u.rol as creador_rol
                  FROM ferias f JOIN usuarios u ON f.id_usuario = u.id_usuario
                  WHERE IFNULL(f.verificacion, 'aprobado') = 'aprobado' AND f.estado = 'publico'
                  ORDER BY f.anio DESC";
        $stmt = $conexion->prepare($query);
    }
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    echo json_encode([]);
}
?>
