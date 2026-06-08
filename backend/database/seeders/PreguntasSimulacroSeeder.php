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
            'Computacion' => [
                ['¿Qué significa CPU?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Process Unit'], 'Central Processing Unit'],
                ['¿Cuál de los siguientes es un lenguaje de programación?', ['HTML', 'CSS', 'Python', 'HTTP'], 'Python'],
                ['¿Qué protocolo se utiliza para transferir páginas web de forma segura?', ['FTP', 'HTTP', 'HTTPS', 'SMTP'], 'HTTPS'],
                ['¿Qué significa RAM?', ['Read Access Memory', 'Random Access Memory', 'Run Active Memory', 'Read Active Media'], 'Random Access Memory'],
                ['¿Qué comando en Linux muestra los archivos de un directorio?', ['cd', 'ls', 'dir', 'pwd'], 'ls'],
                ['¿Cuál es la base numérica del sistema octal?', ['2', '8', '10', '16'], '8'],
                ['¿Qué tipo de software es Linux?', ['Sistema Operativo', 'Procesador de Texto', 'Base de Datos', 'Navegador Web'], 'Sistema Operativo'],
                ['¿Cuál de las siguientes es una base de datos relacional?', ['MongoDB', 'PostgreSQL', 'Redis', 'Cassandra'], 'PostgreSQL'],
                ['¿Qué etiqueta HTML define el título de una página?', ['<title>', '<h1>', '<head>', '<meta>'], '<title>'],
                ['¿Qué significa SQL?', ['Simple Query Language', 'Structured Query Language', 'Sequential Query Logic', 'System Query Layout'], 'Structured Query Language'],
            ],
            'Ingles' => [
                ['Choose the correct form: She ___ to the store yesterday.', ['go', 'goes', 'went', 'going'], 'went'],
                ['What is the plural of "child"?', ['childs', 'children', 'childrens', 'childes'], 'children'],
                ['Identify the adjective: "The blue car drove fast."', ['blue', 'car', 'drove', 'fast'], 'blue'],
                ['What is the antonym of "difficult"?', ['hard', 'easy', 'simple', 'complex'], 'easy'],
                ['Which word is a pronoun?', ['house', 'he', 'happy', 'here'], 'he'],
                ['Complete: If it rains, I ___ stay home.', ['will', 'would', 'am', 'was'], 'will'],
                ['Synonym of "beautiful"?', ['ugly', 'pretty', 'bad', 'sad'], 'pretty'],
                ['Complete: They ___ playing soccer now.', ['is', 'am', 'are', 'was'], 'are'],
                ['What is the past participle of "write"?', ['wrote', 'writed', 'written', 'writing'], 'written'],
                ['Which of these is a modal verb?', ['run', 'can', 'eat', 'sleep'], 'can'],
            ],
        ];

        foreach ($materias as $materia) {
            $nombreMateria = strtoupper($materia->nombre);
            if ($nombreMateria === 'COMPUTACION' || $nombreMateria === 'COMPUTACIÓN') {
                $preguntas = $banco['Computacion'] ?? [];
            } elseif ($nombreMateria === 'MATEMATICAS' || $nombreMateria === 'MATEMÁTICAS') {
                $preguntas = $banco['Matematicas'] ?? [];
            } elseif ($nombreMateria === 'FISICA' || $nombreMateria === 'FÍSICA') {
                $preguntas = $banco['Fisica'] ?? [];
            } elseif ($nombreMateria === 'INGLES' || $nombreMateria === 'INGLÉS') {
                $preguntas = $banco['Ingles'] ?? [];
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
