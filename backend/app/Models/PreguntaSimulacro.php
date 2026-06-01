<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreguntaSimulacro extends Model
{
    public $timestamps = false;
    protected $table = 'preguntas_simulacro';
    protected $fillable = ['materia_id', 'enunciado', 'opciones', 'respuesta_correcta'];

    protected $casts = ['opciones' => 'array'];

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
