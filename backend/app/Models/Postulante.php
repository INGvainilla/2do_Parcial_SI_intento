<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Postulante extends Model
{
    protected $fillable = [
        'ci', 'nombres', 'apellidos', 'fecha_nacimiento', 'sexo',
        'direccion', 'telefono', 'email', 'colegio_procedencia', 'ciudad',
        'titulo_bachiller', 'primera_opcion_id', 'segunda_opcion_id',
        'turno_preferencia', 'gestion_id', 'estado', 'recurrente',
    ];

    protected $casts = ['fecha_nacimiento' => 'date', 'recurrente' => 'boolean'];

    public function primeraOpcion()
    {
        return $this->belongsTo(Carrera::class, 'primera_opcion_id');
    }

    public function segundaOpcion()
    {
        return $this->belongsTo(Carrera::class, 'segunda_opcion_id');
    }

    public function gestion()
    {
        return $this->belongsTo(Gestion::class);
    }

    public function requisitos()
    {
        return $this->hasOne(RequisitoDocumental::class);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    public function asignacionGrupo()
    {
        return $this->hasOne(AsignacionGrupo::class);
    }

    public function examenes()
    {
        return $this->hasMany(Examen::class);
    }

    public function notasFinales()
    {
        return $this->hasMany(NotaFinal::class);
    }
}
