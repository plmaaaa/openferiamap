<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];

$data         = json_decode(file_get_contents("php://input"));
$email        = $data->email            ?? null;
$current_pass = $data->current_password ?? null;
$new_pass     = $data->new_password     ?? null;

if (empty($email) || empty($current_pass)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos requeridos"]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email no válido"]);
    exit;
}

try {
    $check = $conexion->prepare("SELECT id_usuario, password FROM usuarios WHERE id_usuario = :id");
    $check->bindParam(":id", $id_usuario);
    $check->execute();
    $user = $check->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($current_pass, $user['password'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Contraseña actual incorrecta"]);
        exit;
    }

    $checkEmail = $conexion->prepare("SELECT id_usuario FROM usuarios WHERE email = :email AND id_usuario != :id");
    $checkEmail->bindParam(":email", $email);
    $checkEmail->bindParam(":id",    $id_usuario);
    $checkEmail->execute();
    if ($checkEmail->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "El email ya está en uso por otro usuario"]);
        exit;
    }

    if ($new_pass) {
        if (strlen($new_pass) < 8) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "La nueva contraseña debe tener al menos 8 caracteres"]);
            exit;
        }
        $hash   = password_hash($new_pass, PASSWORD_DEFAULT);
        $update = $conexion->prepare("UPDATE usuarios SET email = :email, password = :password WHERE id_usuario = :id");
        $update->bindParam(":email",    $email);
        $update->bindParam(":password", $hash);
        $update->bindParam(":id",       $id_usuario);
        $update->execute();
    } else {
        $update = $conexion->prepare("UPDATE usuarios SET email = :email WHERE id_usuario = :id");
        $update->bindParam(":email", $email);
        $update->bindParam(":id",    $id_usuario);
        $update->execute();
    }

    $fresh = $conexion->prepare("SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = :id");
    $fresh->bindParam(":id", $id_usuario);
    $fresh->execute();
    $usuario = $fresh->fetch(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "message" => "Perfil actualizado", "usuario" => $usuario]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
