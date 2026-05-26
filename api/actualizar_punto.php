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

function normalizarCoordenadas($coordenadas, $tipo) {
    if (!is_string($coordenadas)) return null;
    $coords = json_decode($coordenadas, true);
    if (json_last_error() !== JSON_ERROR_NONE) return null;

    if ($tipo === 'marcador') {
        if (!is_array($coords) || !isset($coords['lat']) || !isset($coords['lng']) || !is_numeric($coords['lat']) || !is_numeric($coords['lng'])) return null;
        $lat = floatval($coords['lat']); $lng = floatval($coords['lng']);
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) return null;
        return json_encode(["lat" => $lat, "lng" => $lng]);
    }

    if ($tipo === 'recuadro') {
        if (!is_array($coords) || count($coords) < 3) return null;
        $normalizadas = [];
        foreach ($coords as $coord) {
            if (!is_array($coord) || !isset($coord['lat']) || !isset($coord['lng']) || !is_numeric($coord['lat']) || !is_numeric($coord['lng'])) return null;
            $lat = floatval($coord['lat']); $lng = floatval($coord['lng']);
            if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) return null;
            $normalizadas[] = ["lat" => $lat, "lng" => $lng];
        }
        return json_encode($normalizadas);
    }
    return null;
}

if (empty($id_punto)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

try {
    $check = $conexion->prepare("SELECT p.id_feria, p.tipo_geometria, f.id_usuario AS dueno FROM puntos_interes p JOIN ferias f ON p.id_feria = f.id_feria WHERE p.id_punto = :id");
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
        echo json_encode(["success" => false, "message" => "No tienes permiso para editar este punto"]);
        exit;
    }

    $nombre        = $data->nombre        ?? null;
    $categoria     = $data->categoria     ?? null;
    $sinopsis      = $data->sinopsis      ?? null;
    $imagen_url    = $data->imagen_url    ?? null;
    $tipo_geometria = $data->tipo_geometria ?? null;
    $coordenadas   = $data->coordenadas   ?? null;

    if ($categoria !== null) {
        $allowedBases = ['caseta', 'cacharrito', 'puesto', 'baño', 'estacionamiento', 'otro'];
        $catBase = explode('_', $categoria, 2)[0];
        if (!in_array($catBase, $allowedBases)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Categoría no válida"]);
            exit;
        }
    }
    if ($tipo_geometria !== null && !in_array($tipo_geometria, ['marcador', 'recuadro'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Tipo de geometría no válido"]);
        exit;
    }
    if ($tipo_geometria !== null && $tipo_geometria !== $punto['tipo_geometria'] && $coordenadas === null) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Coordenadas requeridas para cambiar la geometría"]);
        exit;
    }
    if ($coordenadas !== null) {
        $tipoParaCoordenadas   = $tipo_geometria ?? $punto['tipo_geometria'];
        $coordenadasNormalizadas = normalizarCoordenadas($coordenadas, $tipoParaCoordenadas);
        if ($coordenadasNormalizadas === null) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coordenadas no válidas"]);
            exit;
        }
        $coordenadas = $coordenadasNormalizadas;
    }

    $updates = [];
    $params  = [":id" => $id_punto];
    if ($nombre        !== null) { $updates[] = "nombre = :nombre";               $params[":nombre"]        = $nombre; }
    if ($categoria     !== null) { $updates[] = "categoria = :categoria";          $params[":categoria"]     = $categoria; }
    if ($sinopsis      !== null) { $updates[] = "sinopsis = :sinopsis";            $params[":sinopsis"]      = $sinopsis; }
    if ($imagen_url    !== null) { $updates[] = "imagen_url = :imagen_url";        $params[":imagen_url"]    = $imagen_url; }
    if ($tipo_geometria !== null) { $updates[] = "tipo_geometria = :tipo_geometria"; $params[":tipo_geometria"] = $tipo_geometria; }
    if ($coordenadas   !== null) { $updates[] = "coordenadas = :coordenadas";      $params[":coordenadas"]   = $coordenadas; }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "No hay campos para actualizar"]);
        exit;
    }

    $query = "UPDATE puntos_interes SET " . implode(", ", $updates) . " WHERE id_punto = :id";
    $stmt  = $conexion->prepare($query);
    foreach ($params as $key => &$val) { $stmt->bindParam($key, $val); }
    $stmt->execute();
    echo json_encode(["success" => true, "message" => "Punto actualizado"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
}
?>
