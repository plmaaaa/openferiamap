<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser) {
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];
$esStaff    = in_array($sesionUser['rol'], ['root', 'moderador']);

$data     = json_decode(file_get_contents("php://input"));
$id_feria = $data->id_feria ?? null;

if (empty($id_feria)) {
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

$check = $conexion->prepare("SELECT id_usuario, verificacion FROM ferias WHERE id_feria = :id");
$check->bindParam(":id", $id_feria);
$check->execute();
$feria = $check->fetch(PDO::FETCH_ASSOC);

if (!$feria) {
    echo json_encode(["success" => false, "message" => "Feria no encontrada"]);
    exit;
}

if ($feria['id_usuario'] != $id_usuario && !$esStaff) {
    echo json_encode(["success" => false, "message" => "No tienes permiso para publicar esta feria"]);
    exit;
}

if (!in_array($feria['verificacion'], ['borrador', 'rechazado'])) {
    echo json_encode(["success" => false, "message" => "La feria ya está publicada o pendiente de revisión"]);
    exit;
}

try {
    $update = $conexion->prepare("UPDATE ferias SET verificacion = 'pendiente', motivo_rechazo = NULL WHERE id_feria = :id");
    $update->bindParam(":id", $id_feria);
    $update->execute();
    echo json_encode(["success" => true, "message" => "Feria enviada para revisión"]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
