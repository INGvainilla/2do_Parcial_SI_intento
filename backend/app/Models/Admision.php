<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admision extends Model
{
    public $timestamps = false;
    protected $table = 'admisiones';
    protected $fillable = ['postulante_id', 'carrera_id', 'via', 'fecha_admision'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function carrera()
    {
        return $this->belongsTo(Carrera::class);
    }
}
