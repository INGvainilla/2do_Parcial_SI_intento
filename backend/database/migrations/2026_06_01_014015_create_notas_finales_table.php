<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas_finales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->decimal('promedio', 5, 2);
            $table->string('estado', 20);
            $table->timestamp('updated_at')->useCurrent();
            $table->unique(['postulante_id', 'materia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas_finales');
    }
};
