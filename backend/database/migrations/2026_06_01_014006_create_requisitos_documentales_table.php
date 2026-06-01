<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requisitos_documentales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->unique()->constrained('postulantes')->cascadeOnDelete();
            $table->boolean('ci_digitalizado')->default(false);
            $table->boolean('certificado_nacimiento')->default(false);
            $table->boolean('titulo_bachiller_legalizado')->default(false);
            $table->boolean('formulario_preinscripcion')->default(false);
            $table->boolean('verificado_bd_externa')->default(false);
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requisitos_documentales');
    }
};
