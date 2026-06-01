<?php

namespace Database\Seeders;

use App\Models\Materia;
use App\Models\PreguntaSimulacro;
use Illuminate\Database\Seeder;

class PreguntasSimulacroSeeder extends Seeder
{
    public function run(): void
    {
        $materias = Materia::all();

        $banco = [
            'Matematicas' => [
                ['Cual es el resultado de 2^10?', ['512', '1024', '2048', '256'], '1024'],
                ['Derivada de x^3?', ['3x', '3x^2', 'x^2', '2x^3'], '3x^2'],
                ['Integral de 2x dx?', ['x^2 + C', '2x^2 + C', 'x + C', '2 + C'], 'x^2 + C'],
                ['Raiz cuadrada de 144?', ['11', '12', '13', '14'], '12'],
                ['Seno de 90 grados?', ['0', '0.5', '1', '-1'], '1'],
                ['Limite de 1/x cuando x tiende a infinito?', ['0', '1', 'infinito', 'indefinido'], '0'],
                ['Factorial de 5?', ['60', '120', '24', '720'], '120'],
                ['Angulo recto mide?', ['45', '90', '180', '360'], '90'],
                ['Pitagoras: a=3, b=4, hipotenusa?', ['5', '6', '7', '25'], '5'],
                ['Log base 10 de 1000?', ['2', '3', '4', '10'], '3'],
                ['Suma de angulos internos de un triangulo?', ['90', '180', '270', '360'], '180'],
                ['Area de circulo radio 5?', ['25pi', '10pi', '50pi', '5pi'], '25pi'],
            ],
            'Fisica' => [
                ['Unidad de fuerza en SI?', ['Joule', 'Newton', 'Pascal', 'Watt'], 'Newton'],
                ['Velocidad de la luz (aprox)?', ['300000 km/s', '150000 km/s', '3000 km/s', '30000 km/s'], '300000 km/s'],
                ['F = m * a es la ley de?', ['Newton', 'Ohm', 'Kepler', 'Faraday'], 'Newton'],
                ['Unidad de energia?', ['Newton', 'Joule', 'Watt', 'Voltio'], 'Joule'],
                ['Aceleracion de gravedad terrestre?', ['8.9 m/s2', '9.8 m/s2', '10.8 m/s2', '7.8 m/s2'], '9.8 m/s2'],
                ['Presion = Fuerza / ?', ['Masa', 'Area', 'Volumen', 'Tiempo'], 'Area'],
                ['Potencia se mide en?', ['Joule', 'Watt', 'Newton', 'Hertz'], 'Watt'],
                ['Ley de Ohm: V = ?', ['I * R', 'I / R', 'R / I', 'I + R'], 'I * R'],
                ['Que es inercia?', ['Resistencia al movimiento', 'Tipo de energia', 'Fuerza', 'Velocidad'], 'Resistencia al movimiento'],
                ['1 km = ? metros', ['100', '1000', '10000', '10'], '1000'],
                ['Frecuencia se mide en?', ['Segundos', 'Hertz', 'Metros', 'Newton'], 'Hertz'],
                ['Trabajo = Fuerza x ?', ['Tiempo', 'Distancia', 'Masa', 'Velocidad'], 'Distancia'],
            ],
            'Quimica' => [
                ['Simbolo del sodio?', ['S', 'Na', 'So', 'Sd'], 'Na'],
                ['Numero atomico del carbono?', ['4', '6', '8', '12'], '6'],
                ['Formula del agua?', ['HO', 'H2O', 'H2O2', 'OH'], 'H2O'],
                ['Gas noble mas ligero?', ['Neon', 'Helio', 'Argon', 'Kripton'], 'Helio'],
                ['pH neutro?', ['0', '7', '14', '1'], '7'],
                ['Tabla periodica la creo?', ['Newton', 'Mendeleiev', 'Bohr', 'Dalton'], 'Mendeleiev'],
                ['Enlace ionico se forma entre?', ['No metales', 'Metal y no metal', 'Metales', 'Gases'], 'Metal y no metal'],
                ['Numero de Avogadro?', ['6.02x10^23', '3.14x10^8', '9.8x10^2', '1.6x10^-19'], '6.02x10^23'],
                ['Acido con pH menor a?', ['7', '14', '0', '10'], '7'],
                ['Elemento mas abundante en la Tierra?', ['Carbono', 'Oxigeno', 'Hidrogeno', 'Nitrogeno'], 'Oxigeno'],
                ['Sal comun formula?', ['NaOH', 'NaCl', 'KCl', 'CaCl'], 'NaCl'],
                ['Estado de la materia a temperatura ambiente del mercurio?', ['Solido', 'Liquido', 'Gas', 'Plasma'], 'Liquido'],
            ],
            'Lenguaje' => [
                ['Sujeto y predicado forman una?', ['Oracion', 'Parrafo', 'Texto', 'Silaba'], 'Oracion'],
                ['Sinonimo de "efimero"?', ['Eterno', 'Pasajero', 'Solido', 'Grande'], 'Pasajero'],
                ['Antonimo de "benevolo"?', ['Generoso', 'Malvado', 'Amable', 'Cruel'], 'Cruel'],
                ['Verbo en preterito de "cantar", yo?', ['Canto', 'Cante', 'Cantare', 'Cantaba'], 'Cante'],
                ['Tipo de palabra: "rapidamente"?', ['Adjetivo', 'Sustantivo', 'Adverbio', 'Verbo'], 'Adverbio'],
                ['Genero literario de "El Quijote"?', ['Lirico', 'Narrativo', 'Dramatico', 'Ensayo'], 'Narrativo'],
                ['Figura literaria: "sus ojos son soles"?', ['Simil', 'Metafora', 'Hiperbole', 'Anafora'], 'Metafora'],
                ['Silaba tonica de "telefono"?', ['te', 'le', 'fo', 'no'], 'le'],
                ['Palabra aguda lleva tilde cuando termina en?', ['Consonante', 'N, S o vocal', 'Vocal cerrada', 'Cualquier vocal'], 'N, S o vocal'],
                ['Que es un diptongo?', ['Dos vocales fuertes juntas', 'Vocal fuerte + debil en misma silaba', 'Tres vocales juntas', 'Vocal sola'], 'Vocal fuerte + debil en misma silaba'],
                ['Sujeto de: "El gato duerme"?', ['duerme', 'El gato', 'gato', 'El'], 'El gato'],
                ['Plural de "analisis"?', ['Analisises', 'Analisis', 'Analisiss', 'Analises'], 'Analisis'],
            ],
        ];

        foreach ($materias as $materia) {
            // Nota: En CatalogosSeeder, sembramos "Lenguaje" pero el skill de base dice "Lenguaje".
            // Para asegurar el emparejamiento, usaremos un mapeo robusto:
            $nombreMateria = $materia->nombre;
            if ($nombreMateria === 'Quimica') {
                $preguntas = $banco['Quimica'] ?? [];
            } elseif ($nombreMateria === 'Matematicas') {
                $preguntas = $banco['Matematicas'] ?? [];
            } elseif ($nombreMateria === 'Fisica') {
                $preguntas = $banco['Fisica'] ?? [];
            } elseif ($nombreMateria === 'Lenguaje') {
                $preguntas = $banco['Lenguaje'] ?? [];
            } else {
                $preguntas = [];
            }

            foreach ($preguntas as $data) {
                PreguntaSimulacro::create([
                    'materia_id' => $materia->id,
                    'enunciado' => $data[0],
                    'opciones' => $data[1], // cast array handle
                    'respuesta_correcta' => $data[2],
                ]);
            }
        }
    }
}
