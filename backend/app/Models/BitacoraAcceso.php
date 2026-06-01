<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BitacoraAcceso extends Model
{
    public $timestamps = false;
    protected $table = 'bitacora_accesos';
    protected $fillable = ['user_id', 'ip_address', 'action'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
