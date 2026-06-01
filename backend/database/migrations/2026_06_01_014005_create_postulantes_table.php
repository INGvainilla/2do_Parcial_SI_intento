<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulantes', function (Blueprint $table) {
            $table->id();
            $table->string('ci', 20)->unique();
            $table->string('nombres', 150);
            $table->string('apellidos', 150);
            $table->date('fecha_nacimiento');
            $table->char('sexo', 1);
            $table->string('direccion', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 150);
            $table->string('colegio_procedencia', 150)->nullable();
            $table->string('ciudad', 100)->default('Santa Cruz de la Sierra');
            $table->string('titulo_bachiller', 255)->nullable();
            $table->foreignId('primera_opcion_id')->constrained('carreras');
            $table->foreignId('segunda_opcion_id')->constrained('carreras');
            $table->string('turno_preferencia', 20);
            $table->foreignId('gestion_id')->constrained('gestiones');
            $table->string('estado', 50)->default('Preinscrito');
            $table->boolean('recurrente')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
