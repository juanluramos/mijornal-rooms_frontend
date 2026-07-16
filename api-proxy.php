<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$apiBase = getenv('MIJORNALROOMS_API_BASE') ?: 'http://127.0.0.1:3000';
$path = $_GET['path'] ?? '/api/health';

if (!str_starts_with($path, '/api/')) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['msg' => 'Ruta no permitida']);
    exit;
}

$url = rtrim($apiBase, '/') . $path;
$method = $_SERVER['REQUEST_METHOD'];
$contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$isMultipart = stripos($contentType, 'multipart/form-data') !== false;
$body = file_get_contents('php://input');
$headers = [];
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

if ($authorization === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) === 'authorization') {
            $authorization = $value;
            break;
        }
    }
}

if ($authorization !== '') {
    $headers[] = 'Authorization: ' . $authorization;
}

function addPostFields(array $source, array &$target, string $prefix = ''): void
{
    foreach ($source as $key => $value) {
        $field = $prefix === '' ? (string) $key : $prefix . '[' . $key . ']';
        if (is_array($value)) {
            addPostFields($value, $target, $field);
            continue;
        }
        $target[$field] = (string) $value;
    }
}

function addUploadedFiles(array $files, array &$target, string $prefix = ''): void
{
    foreach ($files as $fieldName => $file) {
        $field = $prefix === '' ? (string) $fieldName : $prefix . '[' . $fieldName . ']';

        if (is_array($file['name'])) {
            foreach ($file['name'] as $index => $name) {
                addUploadedFiles([
                    $index => [
                        'name' => $name,
                        'type' => $file['type'][$index] ?? 'application/octet-stream',
                        'tmp_name' => $file['tmp_name'][$index] ?? '',
                        'error' => $file['error'][$index] ?? UPLOAD_ERR_NO_FILE,
                        'size' => $file['size'][$index] ?? 0,
                    ],
                ], $target, $field);
            }
            continue;
        }

        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            continue;
        }

        $target[$field] = new CURLFile($file['tmp_name'], $file['type'] ?: 'application/octet-stream', $file['name']);
    }
}

$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 15,
]);

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    if ($isMultipart && $method === 'POST') {
        $multipartBody = [];
        addPostFields($_POST, $multipartBody);
        addUploadedFiles($_FILES, $multipartBody);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $multipartBody);
    } else {
        if ($contentType !== '') {
            $headers[] = 'Content-Type: ' . $contentType;
            curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
        }
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($curl);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['msg' => 'No se pudo conectar con la API', 'error' => curl_error($curl)]);
    curl_close($curl);
    exit;
}

$headerSize = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($curl);

http_response_code($status);

foreach (explode("\r\n", $responseHeaders) as $headerLine) {
    if (stripos($headerLine, 'content-type:') === 0) {
        header($headerLine);
        break;
    }
}

echo $responseBody;
