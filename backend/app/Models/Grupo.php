<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    public $timestamps = false;
    protected $fillable = ['numero', 'gestion_id', 'turno', 'aula_id'];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class);
    }

    public function aula()
    {
        return $this->belongsTo(Aula::class);
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionGrupo::class);
    }

    public function docentes()
    {
        return $this->hasMany(AsignacionDocente::class);
    }

    public function cantidadEstudiantes(): int
    {
        return $this->asignaciones()->count();
    }

    public function tieneCapacidad(): bool
    {
        return $this->cantidadEstudiantes() < 70;
    }
}
