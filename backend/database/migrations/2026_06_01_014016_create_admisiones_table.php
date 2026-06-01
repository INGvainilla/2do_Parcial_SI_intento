<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admisiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->unique()->constrained('postulantes')->cascadeOnDelete();
            $table->foreignId('carrera_id')->constrained('carreras');
            $table->string('via', 50);
            $table->timestamp('fecha_admision')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admisiones');
    }
};
