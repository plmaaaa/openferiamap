<?php
include_once "conexion.php";

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->nombre) && !empty($data->email) && !empty($data->password)) {
    if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Email no válido"]);
        exit;
    }

    $check = $conexion->prepare("SELECT id_usuario FROM usuarios WHERE email = :email");
    $check->bindParam(":email", $data->email);
    $check->execute();

    if ($check->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "El email ya está registrado"]);
        exit;
    }

    $hash = password_hash($data->password, PASSWORD_DEFAULT);

    $count = $conexion->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $rol = ($count == 0) ? 'root' : 'usuario';

    $query = "INSERT INTO usuarios (nombre, email, password, rol) VALUES (:nombre, :email, :password, :rol)";
    $stmt = $conexion->prepare($query);
    $stmt->bindParam(":nombre", $data->nombre);
    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":password", $hash);
    $stmt->bindParam(":rol", $rol);

    try {
        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => ($rol === 'root' ? "Cuenta root creada con éxito" : "Usuario registrado con éxito")]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al registrar"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Todos los campos son requeridos"]);
}
?>