<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $tables = Illuminate\Support\Facades\DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    echo "--- TABLAS DE LA BASE DE DATOS ---\n";
    foreach ($tables as $index => $t) {
        echo ($index + 1) . ". " . $t->table_name . "\n";
    }
    echo "----------------------------------\n";
    echo "TOTAL: " . count($tables) . " tablas.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
