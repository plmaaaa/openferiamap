<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser) {
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];
$esStaff    = in_array($sesionUser['rol'], ['root', 'moderador']);

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_feria) || empty($data->password)) {
    echo json_encode(["success" => false, "message" => "Faltan datos requeridos"]);
    exit;
}

// Always verify the session user's own password
$stmt = $conexion->prepare("SELECT password FROM usuarios WHERE id_usuario = :id");
$stmt->bindParam(":id", $id_usuario);
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!password_verify($data->password, $user['password'])) {
    echo json_encode(["success" => false, "message" => "Contraseña incorrecta"]);
    exit;
}

$check = $conexion->prepare("SELECT id_usuario FROM ferias WHERE id_feria = :id");
$check->bindParam(":id", $data->id_feria);
$check->execute();
$feria = $check->fetch(PDO::FETCH_ASSOC);

if (!$feria) {
    echo json_encode(["success" => false, "message" => "Feria no encontrada"]);
    exit;
}

if ($feria['id_usuario'] != $id_usuario && !$esStaff) {
    echo json_encode(["success" => false, "message" => "No tienes permiso para eliminar esta feria"]);
    exit;
}

$delete = $conexion->prepare("DELETE FROM ferias WHERE id_feria = :id");
$delete->bindParam(":id", $data->id_feria);

try {
    if ($delete->execute()) {
        echo json_encode(["success" => true, "message" => "Feria eliminada con éxito"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al eliminar la feria"]);
    }
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
