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

$data      = json_decode(file_get_contents("php://input"));
$id_resena = $data->id_resena ?? null;

if (empty($id_resena)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

try {
    $check = $conexion->prepare("SELECT id_usuario FROM resenas WHERE id_resena = :id");
    $check->bindParam(":id", $id_resena);
    $check->execute();
    $resena = $check->fetch(PDO::FETCH_ASSOC);

    if (!$resena) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Reseña no encontrada"]);
        exit;
    }

    $isOwner = $resena['id_usuario'] == $id_usuario;
    if (!$isOwner && !$isStaff) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No tienes permiso para borrar esta reseña"]);
        exit;
    }

    $del = $conexion->prepare("DELETE FROM resenas WHERE id_resena = :id");
    $del->bindParam(":id", $id_resena);
    $del->execute();
    echo json_encode(["success" => true, "message" => "Reseña eliminada"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
