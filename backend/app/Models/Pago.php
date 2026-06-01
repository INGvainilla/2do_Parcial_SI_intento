<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    public $timestamps = false;
    protected $fillable = ['postulante_id', 'stripe_checkout_id', 'monto', 'estado_pago', 'fecha_pago'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }
}
