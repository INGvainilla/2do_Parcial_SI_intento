<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gestion extends Model
{
    public $timestamps = false;
    protected $table = 'gestiones';
    protected $fillable = ['codigo', 'activa', 'fecha_inicio', 'fecha_fin'];
    protected $casts = ['activa' => 'boolean', 'fecha_inicio' => 'date', 'fecha_fin' => 'date'];

    public function scopeActiva($query)
    {
        return $query->where('activa', true);
    }
}
