<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotaFinal extends Model
{
    public $timestamps = false;
    protected $table = 'notas_finales';
    protected $fillable = ['postulante_id', 'materia_id', 'promedio', 'estado'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
