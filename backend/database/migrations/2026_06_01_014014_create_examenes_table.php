<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->integer('numero_examen');
            $table->decimal('nota', 5, 2);
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['postulante_id', 'materia_id', 'numero_examen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
