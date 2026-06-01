<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50);
            $table->integer('capacidad');
            $table->string('ubicacion', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};
