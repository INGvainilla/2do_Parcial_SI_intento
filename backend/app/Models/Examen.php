<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    public $timestamps = false;
    protected $table = 'examenes';
    protected $fillable = ['postulante_id', 'materia_id', 'numero_examen', 'nota'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
