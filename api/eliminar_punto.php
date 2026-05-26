<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];
$isStaff    = in_array($sesionUser['rol'], ['root', 'moderador']);

$data    = json_decode(file_get_contents("php://input"));
$id_punto = $data->id_punto ?? null;

if (empty($id_punto)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

try {
    $check = $conexion->prepare("SELECT p.id_feria, f.id_usuario AS dueno FROM puntos_interes p JOIN ferias f ON p.id_feria = f.id_feria WHERE p.id_punto = :id");
    $check->bindParam(":id", $id_punto);
    $check->execute();
    $punto = $check->fetch(PDO::FETCH_ASSOC);

    if (!$punto) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Punto no encontrado"]);
        exit;
    }

    $isOwner = $punto['dueno'] == $id_usuario;
    if (!$isOwner && !$isStaff) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No tienes permiso para borrar este punto"]);
        exit;
    }

    $del = $conexion->prepare("DELETE FROM puntos_interes WHERE id_punto = :id");
    $del->bindParam(":id", $id_punto);
    $del->execute();
    echo json_encode(["success" => true, "message" => "Punto eliminado"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
