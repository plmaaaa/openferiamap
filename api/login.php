<?php
include_once "conexion.php";

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->email) && !empty($data->password)) {
    $stmt = $conexion->prepare("SELECT id_usuario, nombre, email, rol, password FROM usuarios WHERE email = :email");
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        if (password_verify($data->password, $usuario['password'])) {
            $_SESSION['uid'] = $usuario['id_usuario'];
            echo json_encode([
                "success" => true,
                "usuario" => [
                    "id_usuario" => $usuario['id_usuario'],
                    "nombre"     => $usuario['nombre'],
                    "email"      => $usuario['email'],
                    "rol"        => $usuario['rol'] ?? 'usuario'
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Contraseña incorrecta"]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email y contraseña requeridos"]);
}
?>
