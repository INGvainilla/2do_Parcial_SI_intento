<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CupoGestion extends Model
{
    public $timestamps = false;
    protected $table = 'cupos_gestion';
    protected $fillable = [
        'gestion_id',
        'carrera_id',
        'cupo_maximo',
        'cupos_disponibles',
    ];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class);
    }

    public function carrera()
    {
        return $this->belongsTo(Carrera::class);
    }
}
