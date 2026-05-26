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

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id_feria) && !empty($data->nombre) && !empty($data->categoria) && !empty($data->coordenadas)) {
    $allowedBases = ['caseta', 'cacharrito', 'puesto', 'baño', 'estacionamiento', 'otro'];
    $catBase = explode('_', $data->categoria, 2)[0];
    if (!in_array($catBase, $allowedBases)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Categoría no válida"]);
        exit;
    }

    $tipo = $data->tipo_geometria ?? 'marcador';
    if (!in_array($tipo, ['marcador', 'recuadro'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Tipo de geometría no válido"]);
        exit;
    }

    $coords = json_decode($data->coordenadas, true);
    if ($coords === null) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Coordenadas no válidas"]);
        exit;
    }

    $check = $conexion->prepare("SELECT id_usuario FROM ferias WHERE id_feria = :id_feria");
    $check->bindParam(":id_feria", $data->id_feria);
    $check->execute();
    $feria = $check->fetch(PDO::FETCH_ASSOC);

    if (!$feria) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Feria no encontrada"]);
        exit;
    }

    $isOwner = $feria['id_usuario'] == $id_usuario;
    if (!$isOwner && !$isStaff) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "No tienes permiso para añadir puntos a esta feria"]);
        exit;
    }

    $sinopsis  = $data->sinopsis   ?? '';
    $imagen_url = $data->imagen_url ?? '';

    $query = "INSERT INTO puntos_interes (id_feria, nombre, categoria, tipo_geometria, coordenadas, sinopsis, imagen_url)
              VALUES (:id_feria, :nombre, :categoria, :tipo_geometria, :coordenadas, :sinopsis, :imagen_url)";
    $stmt = $conexion->prepare($query);
    $stmt->bindParam(":id_feria",      $data->id_feria);
    $stmt->bindParam(":nombre",        $data->nombre);
    $stmt->bindParam(":categoria",     $data->categoria);
    $stmt->bindParam(":tipo_geometria", $tipo);
    $stmt->bindParam(":coordenadas",   $data->coordenadas);
    $stmt->bindParam(":sinopsis",      $sinopsis);
    $stmt->bindParam(":imagen_url",    $imagen_url);

    if ($stmt->execute()) {
        $punto = [
            "id_punto"      => intval($conexion->lastInsertId()),
            "id_feria"      => intval($data->id_feria),
            "nombre"        => $data->nombre,
            "categoria"     => $data->categoria,
            "tipo_geometria"=> $tipo,
            "coordenadas"   => $data->coordenadas,
            "sinopsis"      => $sinopsis,
            "imagen_url"    => $imagen_url,
            "historia"      => $sinopsis,
            "imagenes"      => $imagen_url,
            "promedio"      => null,
            "num_resenas"   => 0,
            "latitud"       => null,
            "longitud"      => null
        ];
        if ($tipo === 'marcador' && is_array($coords)) {
            $punto["latitud"]  = $coords['lat'] ?? null;
            $punto["longitud"] = $coords['lng'] ?? null;
        }
        echo json_encode(["success" => true, "message" => "Punto creado con éxito", "punto" => $punto]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al crear el punto"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan campos obligatorios"]);
}
?>
