<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Postulante;
use App\Models\Admision;
use Illuminate\Support\Facades\DB;

echo "=== ESTADOS DE POSTULANTES ===\n";
$estados = Postulante::select('estado', DB::raw('count(*) as total'))->groupBy('estado')->get();
foreach ($estados as $e) {
    echo "  {$e->estado}: {$e->total}\n";
}

echo "\n=== TABLA ADMISIONES ===\n";
$admisiones = Admision::all();
echo "Total registros en admisiones: " . $admisiones->count() . "\n";
foreach ($admisiones->take(5) as $a) {
    echo "  ID: {$a->id} | Postulante: {$a->postulante_id} | Carrera: {$a->carrera_id} | Via: {$a->via}\n";
}

echo "\n=== CUPOS GESTION ===\n";
$cupos = DB::table('cupos_gestion')->get();
echo "Total registros en cupos_gestion: " . $cupos->count() . "\n";
foreach ($cupos as $c) {
    echo "  Gestion: {$c->gestion_id} | Carrera: {$c->carrera_id} | Max: {$c->cupo_maximo} | Disponibles: {$c->cupos_disponibles}\n";
}

echo "\n=== POSTULANTES CON primera_opcion_id y segunda_opcion_id ===\n";
$sample = Postulante::whereIn('estado', ['Aprobado', 'Pendiente Reasignacion', 'Admitido'])->take(5)->get();
foreach ($sample as $p) {
    echo "  ID: {$p->id} | Estado: {$p->estado} | 1ra: {$p->primera_opcion_id} | 2da: {$p->segunda_opcion_id} | Gestion: {$p->gestion_id}\n";
}
