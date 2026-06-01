<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequisitoDocumental extends Model
{
    public $timestamps = false;
    protected $table = 'requisitos_documentales';
    protected $fillable = [
        'postulante_id', 'ci_digitalizado', 'certificado_nacimiento',
        'titulo_bachiller_legalizado', 'formulario_preinscripcion', 'verificado_bd_externa',
    ];
    protected $casts = [
        'ci_digitalizado' => 'boolean',
        'certificado_nacimiento' => 'boolean',
        'titulo_bachiller_legalizado' => 'boolean',
        'formulario_preinscripcion' => 'boolean',
        'verificado_bd_externa' => 'boolean',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function todosVerificados(): bool
    {
        return $this->ci_digitalizado && $this->certificado_nacimiento
            && $this->titulo_bachiller_legalizado && $this->formulario_preinscripcion
            && $this->verificado_bd_externa;
    }
}
