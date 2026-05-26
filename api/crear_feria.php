<?php
include_once "conexion.php";

$sesionUser = getSessionUser($conexion);
if (!$sesionUser) {
    echo json_encode(["success" => false, "message" => "Sesión no iniciada"]);
    exit;
}
$id_usuario = $sesionUser['id_usuario'];
$rolReal    = $sesionUser['rol'];

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->nombre_feria) && !empty($data->localidad)) {
    $centro_lat  = $data->centro_lat  ?? null;
    $centro_lng  = $data->centro_lng  ?? null;
    $zoom        = $data->zoom        ?? 15;
    $zona        = $data->zona        ?? null;
    $anio        = $data->anio        ?? date("Y");
    $color       = $data->color_perimetro ?? '#e74c3c';
    $verificacion = in_array($rolReal, ['root', 'moderador']) ? 'aprobado' : 'borrador';

    $query = "INSERT INTO ferias (id_usuario, nombre_feria, localidad, anio, centro_lat, centro_lng, zoom, zona, color_perimetro, verificacion)
              VALUES (:id_usuario, :nombre_feria, :localidad, :anio, :centro_lat, :centro_lng, :zoom, :zona, :color, :verificacion)";
    $stmt = $conexion->prepare($query);
    $stmt->bindParam(":id_usuario",    $id_usuario);
    $stmt->bindParam(":nombre_feria",  $data->nombre_feria);
    $stmt->bindParam(":localidad",     $data->localidad);
    $stmt->bindParam(":anio",          $anio);
    $stmt->bindParam(":centro_lat",    $centro_lat);
    $stmt->bindParam(":centro_lng",    $centro_lng);
    $stmt->bindParam(":zoom",          $zoom);
    $stmt->bindParam(":zona",          $zona);
    $stmt->bindParam(":color",         $color);
    $stmt->bindParam(":verificacion",  $verificacion);

    try {
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Feria creada con éxito", "id_feria" => $conexion->lastInsertId()]);
        } else {
            echo json_encode(["success" => false, "message" => "Error al crear la feria"]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Faltan campos obligatorios"]);
}
?>
