<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->integer('numero');
            $table->foreignId('gestion_id')->constrained('gestiones')->cascadeOnDelete();
            $table->string('turno', 20);
            $table->foreignId('aula_id')->constrained('aulas');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['gestion_id', 'turno', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};
