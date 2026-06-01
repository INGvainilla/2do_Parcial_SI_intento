<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupos_gestion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')->constrained('gestiones')->cascadeOnDelete();
            $table->foreignId('carrera_id')->constrained('carreras')->cascadeOnDelete();
            $table->integer('cupo_maximo');
            $table->integer('cupos_disponibles');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['gestion_id', 'carrera_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupos_gestion');
    }
};
