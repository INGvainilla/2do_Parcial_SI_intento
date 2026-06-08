# 🤖 Valoración e Integración de IA Local (Sin API de OpenAI)

Este documento detalla los recursos actuales y las alternativas tecnológicas disponibles para implementar un procesamiento de lenguaje natural (NLP) y comandos de voz de manera **local y 100% gratuita**, prescindiendo de la API de OpenAI (GPT-3.5).

---

## 🛠️ Lo Que Ya Tienes Implementado (Estado Actual)

Actualmente, el flujo de interacción por voz está totalmente estructurado, desde la captura hasta la ejecución en base de datos:

1. **Captura en Frontend (`ReportesPage.jsx`):**
   * Usa la **Web Speech API** (`window.SpeechRecognition`) del navegador para grabar del micrófono y transcribir a texto plano de manera local y gratuita.
   * Envía el texto transcrito al backend mediante un POST a `/api/reportes/comando-voz`.

2. **Controlador en Backend (`ReporteController.php`):**
   * Recibe la cadena de texto en `$request->texto`.
   * Posee un método alternativo local de emergencia: **`parsearVozRegex($texto)`**. Este utiliza expresiones regulares básicas (`str_contains`) para identificar y mapear palabras como *"aprobado"*, *"sistemas"*, *"tarde"*, etc.
   * Ejecuta la consulta SQL dinámica basándose en el JSON de filtros devuelto.

---

## 🚀 Alternativas para Implementar IA Local (Offline & Gratis)

Para lograr que el sistema interprete lenguaje natural complejo de forma local (sin depender de reglas rígidas de expresiones regulares ni de servicios de pago como OpenAI), puedes optar por las siguientes alternativas:

### Alternativa 1: Ejecutar un LLM Local con Ollama (Recomendada)
[Ollama](https://ollama.com/) es una herramienta de código abierto que permite correr Modelos de Lenguaje Grandes (LLMs) directamente en tu máquina local.

* **Modelos sugeridos:** 
  * `llama3:8b` (Requiere GPU dedicada de 6GB+ VRAM).
  * `phi3:mini` o `gemma:2b` (Muy ligeros, corren bien en CPUs modernas y consumen poca memoria).
* **Cómo funciona la integración:**
  Ollama levanta un servidor local en `http://localhost:11434`. Puedes consumir su API desde Laravel usando exactamente la misma estructura de llamadas HTTP actuales.
* **Ventajas:**
  * No requiere entrenamiento ("entrenar" o "afinar" un modelo es complejo). Solo necesitas darle un buen *System Prompt* (instrucciones estructuradas) igual al que ya tiene el código de Laravel actual.
  * Respeta la privacidad de los datos (nada sale de la máquina).

### Alternativa 2: Microservicio Local en Python (SpaCy / Hugging Face)
Consiste en levantar un pequeño servidor de Python (usando FastAPI o Flask) al que Laravel le envía el texto y este responde con las entidades extraídas.

* **Tecnologías:**
  * **SpaCy (con el modelo `es_core_news_sm` en español):** Es una librería de NLP tradicional muy rápida y ligera (corre en cualquier CPU en milisegundos). Permite definir reglas semánticas y reconocer nombres de carreras o turnos con facilidad.
  * **Transformers locales (Hugging Face):** Usar un modelo pequeño de clasificación de texto o extracción de entidades (NER) como `BETO` (BERT para español).
* **Ventajas:**
  * Consumo de recursos extremadamente bajo (menos de 200MB de RAM).
  * Respuestas en milisegundos.

### Alternativa 3: Clasificador Semántico en el Navegador (Transformers.js)
Procesar el lenguaje natural directamente en el navegador del cliente antes de enviar la petición al backend.

* **Tecnologías:** 
  * [Transformers.js](https://huggingface.co/docs/transformers.js): Carga y ejecuta modelos de Hugging Face directamente en Javascript dentro del navegador (usando WebGL/WebGPU).
* **Ventajas:**
  * El servidor no procesa nada de IA; todo el cómputo se delega al dispositivo del usuario.
  * Cero costos y cero carga al backend.

---

## 📊 Tabla Comparativa de Decisiones

| Criterio | Fallback Regex (Actual) | LLM Local (Ollama) | Microservicio Python (SpaCy) | IA en Navegador (JS) |
| :--- | :--- | :--- | :--- | :--- |
| **Costo** | $0.00 (Gratis) | $0.00 (Gratis) | $0.00 (Gratis) | $0.00 (Gratis) |
| **Dependencia de Internet** | No (100% Offline) | No (100% Offline) | No (100% Offline) | Solo la primera carga |
| **Consumo de Hardware** | Despreciable | **Alto** (Requiere buena RAM/GPU) | **Bajo** (Ligero) | **Medio** (Consume RAM en cliente) |
| **Complejidad del Código** | Ya implementado | Muy baja (Solo cambiar URL) | Media (Crear script Python) | Alta (Configurar bundle JS) |
| **Flexibilidad de Lenguaje** | Muy baja (Frases exactas) | **Muy alta** (Entiende sinónimos) | Media (Requiere reglas NLP) | Media (Modelos pequeños) |

---

## 🛠️ Plan de Acción Sugerido para Ollama (Si deseas IA Real Local)

Si decides optar por la **Alternativa 1 (Ollama)** por su alta flexibilidad sin necesidad de entrenar código desde cero:

1. **Instalar Ollama:** Descárgalo e instálalo en tu máquina desde [ollama.com](https://ollama.com/).
2. **Descargar un modelo ligero:** Abre tu terminal y ejecuta:
   ```bash
   ollama run phi3:mini
   ```
3. **Modificar el backend (`ReporteController.php`):**
   Cambiar la URL de la llamada HTTP en la línea 529 de:
   `https://api.openai.com/v1/chat/completions` 
   a:
   `http://localhost:11434/v1/chat/completions` (Ollama soporta el formato de API de OpenAI de forma nativa).
4. **Configurar en `.env`:**
   Colocar una clave ficticia en `OPENAI_API_KEY="ollama"` para habilitar el flujo principal del código.
