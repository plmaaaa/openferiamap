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

if (!empty($data->id_feria)) {
    $check = $conexion->prepare("SELECT id_usuario, verificacion, pending_changes FROM ferias WHERE id_feria = :id");
    $check->bindParam(":id", $data->id_feria);
    $check->execute();
    $feria = $check->fetch(PDO::FETCH_ASSOC);

    if (!$feria || ($feria['id_usuario'] != $id_usuario && !$esStaff)) {
        echo json_encode(["success" => false, "message" => "No tienes permiso para modificar esta feria"]);
        exit;
    }

    $fields = [];
    $params = [];

    if (isset($data->estado))          { $fields[] = "estado = :estado";                   $params[":estado"]          = $data->estado; }
    if (isset($data->nombre_feria))    { $fields[] = "nombre_feria = :nombre_feria";        $params[":nombre_feria"]    = $data->nombre_feria; }
    if (isset($data->localidad))       { $fields[] = "localidad = :localidad";              $params[":localidad"]       = $data->localidad; }
    if (isset($data->zona))            { $fields[] = "zona = :zona";                        $params[":zona"]            = $data->zona; }
    if (isset($data->centro_lat))      { $fields[] = "centro_lat = :centro_lat";            $params[":centro_lat"]      = $data->centro_lat; }
    if (isset($data->centro_lng))      { $fields[] = "centro_lng = :centro_lng";            $params[":centro_lng"]      = $data->centro_lng; }
    if (isset($data->zoom))            { $fields[] = "zoom = :zoom";                        $params[":zoom"]            = $data->zoom; }
    if (isset($data->color_perimetro)) { $fields[] = "color_perimetro = :color_perimetro";  $params[":color_perimetro"] = $data->color_perimetro; }

    if (!empty($fields)) {
        $esAprobada         = $feria['verificacion'] === 'aprobado';
        $requiereReAprobacion = !$esStaff && $esAprobada;

        if ($requiereReAprobacion) {
            $existingPending = $feria['pending_changes'] ? json_decode($feria['pending_changes'], true) : [];
            $newPending = $existingPending ?: [];
            $fieldMap = ['estado', 'nombre_feria', 'localidad', 'zona', 'centro_lat', 'centro_lng', 'zoom', 'color_perimetro'];
            foreach ($fieldMap as $f) {
                if (isset($data->$f)) $newPending[$f] = $data->$f;
            }
            $pendingJson = json_encode($newPending);
            $update = $conexion->prepare("UPDATE ferias SET pending_changes = :pc, verificacion = 'pendiente' WHERE id_feria = :id");
            $update->bindParam(":pc", $pendingJson);
            $update->bindParam(":id", $data->id_feria);
            try {
                $update->execute();
            } catch (PDOException $e) {
                echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
                exit;
            }
            echo json_encode(["success" => true, "message" => "Cambios guardados y enviados para revisión"]);
        } else {
            if ($esStaff && $feria['pending_changes']) {
                $fields[] = "pending_changes = NULL";
            }
            if (isset($data->estado) && $data->estado === 'privado' && $feria['verificacion'] === 'pendiente') {
                $fields[] = "verificacion = 'borrador'";
                if ($feria['pending_changes']) $fields[] = "pending_changes = NULL";
            }
            $params[":id"] = $data->id_feria;
            $query  = "UPDATE ferias SET " . implode(", ", $fields) . " WHERE id_feria = :id";
            $update = $conexion->prepare($query);
            foreach ($params as $key => $val) { $update->bindValue($key, $val); }
            try {
                $update->execute();
            } catch (PDOException $e) {
                echo json_encode(["success" => false, "message" => "Error en la base de datos"]);
                exit;
            }
            echo json_encode(["success" => true, "message" => "Feria actualizada"]);
        }
    } else {
        echo json_encode(["success" => true, "message" => "Sin cambios"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ID de feria requerido"]);
}
?>
