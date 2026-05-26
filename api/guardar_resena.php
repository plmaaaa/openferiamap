<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
$id_usuario = $sesionUser ? $sesionUser['id_usuario'] : null;

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id_punto) && !empty($data->comentario) && !empty($data->puntuacion)) {
    $puntuacion = intval($data->puntuacion);
    if ($puntuacion < 1 || $puntuacion > 5) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Puntuación no válida."]);
        exit;
    }

    $check = $conexion->prepare("SELECT f.id_usuario AS dueno, f.estado, IFNULL(f.verificacion, 'aprobado') AS verificacion, u.rol AS requester_rol
        FROM puntos_interes p
        JOIN ferias f ON f.id_feria = p.id_feria
        LEFT JOIN usuarios u ON u.id_usuario = :uid
        WHERE p.id_punto = :id_punto");
    $check->bindParam(":uid",      $id_usuario);
    $check->bindParam(":id_punto", $data->id_punto);
    $check->execute();
    $row = $check->fetch(PDO::FETCH_ASSOC);

    $isOwner          = $id_usuario && $row && $row['dueno'] == $id_usuario;
    $isStaff          = $row && in_array($row['requester_rol'] ?? '', ['root', 'moderador', 'verificador']);
    $isPublicApproved = $row && $row['verificacion'] === 'aprobado' && $row['estado'] === 'publico';

    if (!$row) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Punto no encontrado."]);
        exit;
    }
    if (!$isPublicApproved && !$isOwner && !$isStaff) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No se puede reseñar este punto."]);
        exit;
    }

    $query = "INSERT INTO resenas (id_punto, id_usuario, comentario, puntuacion) VALUES (:id_punto, :id_usuario, :comentario, :puntuacion)";
    $stmt  = $conexion->prepare($query);
    $stmt->bindParam(":id_punto",   $data->id_punto);
    $stmt->bindParam(":id_usuario", $id_usuario);
    $stmt->bindParam(":comentario", $data->comentario);
    $stmt->bindParam(":puntuacion", $puntuacion);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Reseña guardada con éxito."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "No se pudo guardar la reseña."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos incompletos."]);
}
?>
