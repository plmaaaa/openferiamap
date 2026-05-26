<?php
include_once "../conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser || !in_array($sesionUser['rol'], ['root', 'moderador', 'verificador'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tienes permiso para verificar ferias"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];

$data     = json_decode(file_get_contents("php://input"));
$id_feria = $data->id_feria ?? null;
$accion   = $data->accion   ?? null;
$motivo   = $data->motivo   ?? null;

if (empty($id_feria) || empty($accion)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}
if (!in_array($accion, ['aprobar', 'rechazar'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Acción no válida"]);
    exit;
}

$feriaCheck = $conexion->prepare("SELECT id_feria, verificacion FROM ferias WHERE id_feria = :id");
$feriaCheck->bindParam(":id", $id_feria);
$feriaCheck->execute();
$feriaRow = $feriaCheck->fetch(PDO::FETCH_ASSOC);

if (!$feriaRow) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Feria no encontrada"]);
    exit;
}
if ($feriaRow['verificacion'] === 'borrador') {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "La feria todavía no ha sido publicada"]);
    exit;
}

try {
    if ($accion === 'aprobar') {
        $fetch = $conexion->prepare("SELECT pending_changes FROM ferias WHERE id_feria = :id");
        $fetch->bindParam(":id", $id_feria);
        $fetch->execute();
        $row         = $fetch->fetch(PDO::FETCH_ASSOC);
        $pendingJson = $row ? $row['pending_changes'] : null;

        if ($pendingJson) {
            $pending      = json_decode($pendingJson, true);
            $setClauses   = ["verificacion = 'aprobado'", "verificado_por = :vid", "motivo_rechazo = NULL", "pending_changes = NULL"];
            $params       = [":vid" => $id_usuario, ":id" => $id_feria];
            $allowedFields = ['nombre_feria', 'localidad', 'zona', 'centro_lat', 'centro_lng', 'zoom', 'color_perimetro', 'estado'];
            foreach ($allowedFields as $f) {
                if (isset($pending[$f])) { $setClauses[] = "$f = :p_$f"; $params[":p_$f"] = $pending[$f]; }
            }
            $update = $conexion->prepare("UPDATE ferias SET " . implode(", ", $setClauses) . " WHERE id_feria = :id");
            foreach ($params as $key => $val) { $update->bindValue($key, $val); }
        } else {
            $update = $conexion->prepare("UPDATE ferias SET verificacion = 'aprobado', estado = 'publico', verificado_por = :vid, motivo_rechazo = NULL WHERE id_feria = :id");
            $update->bindParam(":vid", $id_usuario);
            $update->bindParam(":id",  $id_feria);
        }
    } else {
        $update = $conexion->prepare("UPDATE ferias SET verificacion = 'rechazado', verificado_por = :vid, motivo_rechazo = :motivo, pending_changes = NULL WHERE id_feria = :id");
        $update->bindParam(":vid",    $id_usuario);
        $update->bindParam(":motivo", $motivo);
        $update->bindParam(":id",     $id_feria);
    }

    if ($update->execute()) {
        echo json_encode(["success" => true, "message" => $accion === 'aprobar' ? "Feria aprobada correctamente" : "Feria rechazada"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
