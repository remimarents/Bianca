<?php
declare(strict_types=1);
// Private, temporary two-player cafe rooms. The storage directory is outside public_html.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
function fail(string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
function cleanName($name): string {
    if (!is_string($name)) fail('Skriv et kallenavn.');
    $name = trim(preg_replace('/[^\p{L}\p{N} _\-]/u', '', $name) ?? '');
    if ($name === '' || strlen($name) > 80) fail('Bruk et kort kallenavn (maks 20 tegn).');
    preg_match_all('/./us', $name, $chars);
    if (count($chars[0]) > 20) fail('Bruk et kort kallenavn (maks 20 tegn).');
    return $name;
}
function player(string $name, int $boostUntil = 0): array {
    return ['id' => bin2hex(random_bytes(6)), 'nickname' => $name, 'token' => bin2hex(random_bytes(24)),
        'boostUntil' => min(time()+600, max(0,$boostUntil)), 'lastAward' => 0, 'score' => 0, 'index' => 0, 'attempts' => 0, 'solved' => false, 'feedback' => ''];
}
function publicState(array $room, int $who): array {
    $me = $room['players'][$who];
    unset($me['token']);
    $q = null;
    if ($room['status'] !== 'waiting' && $me['index'] < count($room['questions'])) {
        $q = $room['questions'][$me['index']];
        unset($q['answer']);
        if (!$me['attempts']) unset($q['hint']);
    }
    $players = array_map(fn($p) => ['id' => $p['id'], 'nickname' => $p['nickname'], 'score' => $p['score'],
        'index' => $p['index'], 'done' => $p['index'] >= count($room['questions'])], $room['players']);
    return ['revision' => $room['revision'] ?? 0, 'code' => $room['code'], 'mode' => $room['mode'], 'status' => $room['status'], 'host' => $who === 0,
        'players' => $players, 'me' => $me, 'question' => $q, 'total' => count($room['questions']),
        'teamScore' => array_sum(array_column($players, 'score'))];
}
set_exception_handler(function(Throwable $e): void { fail('Kafeen fikk en liten pause. Prøv igjen.', 500); });
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Bruk POST.', 405);
if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) fail('Ugyldig forespørsel.', 415);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = strtolower((string)parse_url($origin, PHP_URL_HOST));
    $requestHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    if ($originHost !== $requestHost) fail('Åpne spillet fra Biancas hjemmeside.', 403);
}
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fail('Ugyldig avsender.', 403);
$raw = file_get_contents('php://input', false, null, 0, 16001);
if (strlen($raw) > 16000) fail('Forespørselen er for stor.', 413);
$input = json_decode($raw, true);
if (!is_array($input)) fail('Ugyldig forespørsel.');
$action = $input['action'] ?? '';
if (!in_array($action, ['create','join','poll','start','answer','next','boost'], true)) fail('Ukjent handling.');
$dir = dirname(__DIR__, 2) . '/.bianca-cafe-rooms';
if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) fail('Spillerom er midlertidig utilgjengelig.', 503);
$now = time();
// Bound unauthenticated room creation and join attempts, without storing IP addresses.
if ($action === 'create' || $action === 'join') {
    $ratePath = $dir . '/rate-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|bianca-cafe') . '.json';
    $rateFile = fopen($ratePath, 'c+');
    if (!$rateFile || !flock($rateFile, LOCK_EX)) fail('Prøv igjen om litt.', 503);
    $rate = json_decode(stream_get_contents($rateFile), true);
    if (!is_array($rate) || ($rate['until'] ?? 0) < $now) $rate = ['until' => $now + 3600, 'create' => 0, 'join' => 0];
    $limit = $action === 'create' ? 30 : 100;
    if ($rate[$action] >= $limit) { flock($rateFile, LOCK_UN); fclose($rateFile); fail('Litt mange forsøk. Prøv igjen senere.', 429); }
    $rate[$action]++;
    ftruncate($rateFile, 0); rewind($rateFile); fwrite($rateFile, json_encode($rate)); fflush($rateFile); flock($rateFile, LOCK_UN); fclose($rateFile);
    // Expired files are removed on room creation/join. Active rooms are never removed.
    foreach (glob($dir . '/*.json') ?: [] as $old) {
        if (filemtime($old) < $now - 86400) {
            $f = @fopen($old, 'r+');
            if ($f && flock($f, LOCK_EX | LOCK_NB)) {
                $data = json_decode(stream_get_contents($f), true);
                if (($data['expires'] ?? $data['until'] ?? 0) < $now) @unlink($old);
                flock($f, LOCK_UN);
            }
            if ($f) fclose($f);
        }
    }
}
$newToken = null;
if ($action === 'create') {
    $name = cleanName($input['nickname'] ?? null);
    $mode = $input['mode'] ?? 'versus';
    if (!in_array($mode, ['versus','coop'], true)) fail('Velg spillmåte.');
    $questions = $input['questions'] ?? null;
    if (!is_array($questions) || count($questions) !== 6) fail('Runden må ha seks bestillinger.');
    $validated = [];
    foreach ($questions as $q) {
        if (!is_array($q) || !is_string($q['q'] ?? null) || strlen($q['q']) > 800 || trim($q['q']) === '' || !is_numeric($q['answer'] ?? null)) fail('Ugyldig bestilling.');
        $answer = (float)$q['answer'];
        if (!is_finite($answer) || abs($answer) > 100000) fail('Ugyldig svar.');
        $hint = $q['hint'] ?? 'Prøv å dele regnestykket i mindre deler.';
        if (!is_string($hint) || strlen($hint) > 800) fail('Ugyldig hint.');
        $item = ['q' => $q['q'], 'answer' => $answer, 'hint' => $hint];
        if (isset($q['options'])) {
            if (!is_array($q['options']) || count($q['options']) > 6) fail('Ugyldige svarvalg.');
            foreach ($q['options'] as $o) if (!is_numeric($o) || abs((float)$o) > 100000) fail('Ugyldige svarvalg.');
            $item['options'] = array_values($q['options']);
        }
        $validated[] = $item;
    }
    $tries = 0;
    do {
        if (++$tries > 200) fail('Mange spiller akkurat nå. Prøv igjen om litt.', 503);
        $code = str_pad((string)random_int(0,9999),4,'0',STR_PAD_LEFT);
        $path = $dir . '/room-' . $code . '.json';
        $file = @fopen($path, 'x+');
    } while (!$file && file_exists($path));
    if (!$file) fail('Kunne ikke åpne spillerom.', 503);
    chmod($path, 0600);
    flock($file, LOCK_EX);
    $p = player($name, (int)($input['boostUntil'] ?? 0));
    $room = ['code' => $code, 'mode' => $mode, 'status' => 'waiting', 'expires' => $now+86400, 'players' => [$p], 'questions' => $validated];
    $who = 0;
    $newToken = $p['token'];
} else {
    $code = strtoupper(trim((string)($input['code'] ?? '')));
    if (!preg_match('/^[0-9]{4}$/D', $code)) fail('Sjekk romkoden.');
    $path = $dir . '/room-' . $code . '.json';
    $file = @fopen($path, 'r+');
    if (!$file) fail('Rommet finnes ikke eller er utløpt.', 404);
    if (!flock($file, LOCK_EX)) fail('Prøv igjen om litt.', 503);
    $room = json_decode(stream_get_contents($file), true);
    if (!is_array($room) || ($room['expires'] ?? 0) < $now) { flock($file, LOCK_UN); fclose($file); fail('Rommet er utløpt. Lag et nytt.', 410); }
    if ($action === 'join') {
        if ($room['status'] !== 'waiting' || count($room['players']) >= 2) fail('Rommet er fullt eller har startet.', 409);
        $p = player(cleanName($input['nickname'] ?? null), (int)($input['boostUntil'] ?? 0));
        $room['players'][] = $p;
        $who = 1;
        $newToken = $p['token'];
    } else {
        $token = $input['token'] ?? '';
        if (!is_string($token) || strlen($token) !== 48) fail('Du må bli med i rommet på nytt.', 403);
        $who = -1;
        foreach ($room['players'] as $i => $p) if (hash_equals($p['token'], $token)) $who = $i;
        if ($who < 0) fail('Du har ikke tilgang til rommet.', 403);
        if ($action === 'boost') {
            $room['players'][$who]['boostUntil'] = min(time()+600, max(0,(int)($input['boostUntil'] ?? 0)));
        }
        if ($action === 'start') {
            if ($who !== 0) fail('Den som åpnet rommet starter runden.', 403);
            if (count($room['players']) !== 2) fail('Vent til vennen din har blitt med.', 409);
            if ($room['status'] === 'waiting') $room['status'] = 'playing';
        }
        if ($action === 'answer' || $action === 'next') {
            if ($room['status'] === 'waiting') fail('Runden har ikke startet.', 409);
            $p =& $room['players'][$who];
            $index = $input['index'] ?? null;
            if (!is_int($index) || $index < 0 || $index >= count($room['questions'])) fail('Ugyldig bestilling.');
            // Duplicate requests for an old index return state without changing score or progress.
            if ($index > $p['index']) fail('Hent den gjeldende bestillingen først.', 409);
            if ($index === $p['index']) {
                if ($action === 'answer' && !$p['solved']) {
                    $answer = $input['answer'] ?? null;
                    if (!is_numeric($answer) || !is_finite((float)$answer)) fail('Skriv et tall.');
                    $p['attempts']++;
                    if (abs((float)$answer - $room['questions'][$index]['answer']) < 0.005) {
                        $multiplier = ($p['boostUntil'] ?? 0) > time() ? 2 : 1;
                        $points = max(1, 4 - $p['attempts']) * $multiplier;
                        $p['lastAward'] = $points;
                        $p['score'] += $points;
                        $p['solved'] = true;
                        $p['feedback'] = 'Riktig! +' . $points . ' mynter' . ($multiplier === 2 ? ' ⚡ Dobbel bonus!' : '');
                    } else $p['feedback'] = 'Prøv igjen. ' . $room['questions'][$index]['hint'];
                } elseif ($action === 'next' && $p['solved']) {
                    $p['index']++; $p['attempts'] = 0; $p['solved'] = false; $p['feedback'] = '';
                }
            }
            unset($p);
            if (count(array_filter($room['players'], fn($p) => $p['index'] >= count($room['questions']))) === 2) $room['status'] = 'finished';
        }
    }
}
if ($action !== 'poll') {
    $room['revision'] = ($room['revision'] ?? 0) + 1;
    ftruncate($file, 0); rewind($file);
    fwrite($file, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)); fflush($file);
}
$state = publicState($room, $who);
flock($file, LOCK_UN); fclose($file);
$response = ['state' => $state];
if ($newToken !== null) { $response['code'] = $room['code']; $response['token'] = $newToken; }
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
