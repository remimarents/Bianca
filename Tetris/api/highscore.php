<?php
header("Content-Type: application/json");

$file = __DIR__ . "/../data/highscores.json";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    if (!file_exists($file)) {
        echo json_encode([]);
        exit;
    }

    echo file_get_contents($file);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data["name"]) || !isset($data["score"])) {
        echo json_encode(["status"=>"error"]);
        exit;
    }

    $list = [];

    if (file_exists($file)) {
        $list = json_decode(file_get_contents($file), true);
    }

    $list[] = [
        "name"=>$data["name"],
        "score"=>$data["score"]
    ];

    usort($list, function($a,$b){
        return $b["score"] - $a["score"];
    });

    $list = array_slice($list, 0, 5);

    file_put_contents($file, json_encode($list));

    echo json_encode(["status"=>"ok"]);
}
?>
