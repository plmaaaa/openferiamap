<?php
include_once "conexion.php";
$_SESSION = [];
session_destroy();
echo json_encode(["success" => true]);
?>
