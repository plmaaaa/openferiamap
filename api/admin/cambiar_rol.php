<?php
include_once "../conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser || !in_array($sesionUser['rol'], ['root', 'moderador'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No autorizado"]);
    exit;
}
$id_usuario  = $sesionUser['id_usuario'];
$rolActual   = $sesionUser['rol'];

$data      = json_decode(file_get_contents("php://input"));
$target_id = $data->target_id ?? null;
$nuevo_rol = $data->nuevo_rol ?? null;

if (empty($target_id) || empty($nuevo_rol)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

$rolesValidos = ['root', 'moderador', 'verificador', 'usuario'];
if (!in_array($nuevo_rol, $rolesValidos)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Rol no válido"]);
    exit;
}

$targetCheck = $conexion->prepare("SELECT rol FROM usuarios WHERE id_usuario = :id");
$targetCheck->bindParam(":id", $target_id);
$targetCheck->execute();
$target = $targetCheck->fetch(PDO::FETCH_ASSOC);

if (!$target) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Usuario objetivo no encontrado"]);
    exit;
}

if ($rolActual === 'moderador') {
    if (in_array($target['rol'], ['root', 'moderador'])) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No puedes cambiar el rol de usuarios con nivel superior o igual"]);
        exit;
    }
    if ($nuevo_rol === 'root') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No puedes asignar rol de root"]);
        exit;
    }
}

try {
    $update = $conexion->prepare("UPDATE usuarios SET rol = :rol WHERE id_usuario = :id");
    $update->bindParam(":rol", $nuevo_rol);
    $update->bindParam(":id",  $target_id);
    $update->execute();
    echo json_encode(["success" => true, "message" => "Rol actualizado correctamente"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
