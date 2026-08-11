/* ========================================================
   ESTADÍSTICAS GLOBALES DE LA APLICACIÓN
   ========================================================

   Este archivo gestiona el rendimiento global de las
   preguntas de toda la aplicación.

   IMPORTANTE:

   - Cada pregunta debe tener un "id" único y estable.
   - Las estadísticas se guardan en localStorage.
   - Los JSON de preguntas NO contienen estadísticas.
   - El sistema funciona independientemente de en qué
     archivo JSON se encuentre una pregunta.

   Se separan tres conceptos:

   1. ESTADÍSTICAS DEL TEST
      → Las seguirá gestionando test.js.

   2. ESTADO DE REPASO
      → Lo seguirá gestionando test.js.

   3. RENDIMIENTO GLOBAL
      → Lo gestiona este archivo.

   ======================================================== */


/* ========================================================
   CONFIGURACIÓN
   ======================================================== */


/*
 * Clave utilizada para guardar todas las estadísticas
 * de la aplicación en localStorage.
 */

const CLAVE_ESTADISTICAS =
    "opos_tai_estadisticas";


/*
 * Número máximo de respuestas que utilizaremos
 * para calcular el rendimiento reciente.
 *
 * Se puede cambiar en el futuro:
 *
 * 50
 * 100
 * 200
 * etc.
 */

const VENTANA_RENDIMIENTO =
    100;


/*
 * Número máximo de puntos que conservaremos
 * en el histórico de rendimiento de cada pregunta.
 *
 * Esto evita que el histórico crezca indefinidamente.
 *
 * Más adelante podemos modificar este valor.
 */

const MAXIMO_PUNTOS_HISTORICO =
    100;


/* ========================================================
   ESTRUCTURA DE UNA ESTADÍSTICA
   ========================================================

   Cada pregunta tendrá una estructura como:

   {
       historial: [
           true,
           true,
           false
       ],

       aciertosTotales: 2,

       fallosTotales: 1,

       ultimaRespuesta:
           "2026-08-11T20:30:00.000Z",

       historico: [
           {
               fecha: "...",
               rendimiento: 66.67
           }
       ]
   }

   "true"  = respuesta correcta
   "false" = respuesta incorrecta

   ======================================================== */


/* ========================================================
   OBTENER TODAS LAS ESTADÍSTICAS
   ======================================================== */

function obtenerEstadisticasGlobales() {

    const datos =
        localStorage.getItem(
            CLAVE_ESTADISTICAS
        );


    /*
     * Si todavía no existen estadísticas,
     * devolvemos un objeto vacío.
     */

    if (!datos) {

        return {};

    }


    try {

        const estadisticas =
            JSON.parse(
                datos
            );


        /*
         * Nos aseguramos de que sea un objeto.
         */

        if (
            !estadisticas ||
            typeof estadisticas !== "object" ||
            Array.isArray(estadisticas)
        ) {

            return {};

        }


        return estadisticas;

    }


    catch (error) {

        console.error(
            "Error leyendo las estadísticas:",
            error
        );


        return {};

    }

}


/* ========================================================
   GUARDAR TODAS LAS ESTADÍSTICAS
   ======================================================== */

function guardarEstadisticasGlobales(
    estadisticas
) {

    try {

        localStorage.setItem(
            CLAVE_ESTADISTICAS,
            JSON.stringify(
                estadisticas
            )
        );


        return true;

    }


    catch (error) {

        console.error(
            "Error guardando las estadísticas:",
            error
        );


        return false;

    }

}


/* ========================================================
   CREAR ESTADÍSTICA VACÍA
   ======================================================== */

function crearEstadisticaPregunta() {

    return {

        /*
         * Respuestas utilizadas para calcular
         * el rendimiento reciente.
         */

        historial: [],


        /*
         * Número total de respuestas correctas
         * realizadas a lo largo del tiempo.
         */

        aciertosTotales: 0,


        /*
         * Número total de respuestas incorrectas
         * realizadas a lo largo del tiempo.
         */

        fallosTotales: 0,


        /*
         * Fecha de la última respuesta.
         */

        ultimaRespuesta: null,


        /*
         * Evolución del rendimiento.
         */

        historico: []

    };

}


/* ========================================================
   OBTENER ESTADÍSTICA DE UNA PREGUNTA
   ======================================================== */

function obtenerEstadisticaPregunta(
    idPregunta
) {

    /*
     * Sin ID no podemos identificar la pregunta.
     */

    if (!idPregunta) {

        return null;

    }


    const estadisticas =
        obtenerEstadisticasGlobales();


    /*
     * Si la pregunta todavía no tiene estadísticas,
     * devolvemos una estructura vacía.
     */

    if (
        !estadisticas[idPregunta]
    ) {

        return crearEstadisticaPregunta();

    }


    return estadisticas[idPregunta];

}


/* ========================================================
   REGISTRAR UNA RESPUESTA
   ========================================================

   Esta será la función principal que utilizará test.js.

   Ejemplo:

   registrarRespuestaPregunta(
       "constitucion-preambulo-001",
       true
   );

   ======================================================== */

function registrarRespuestaPregunta(
    idPregunta,
    esCorrecta
) {

    /*
     * Comprobar ID.
     */

    if (!idPregunta) {

        console.warn(
            "No se puede registrar una respuesta sin ID de pregunta."
        );


        return null;

    }


    const estadisticas =
        obtenerEstadisticasGlobales();


    /*
     * Crear estadísticas si es la primera vez
     * que vemos esta pregunta.
     */

    if (
        !estadisticas[idPregunta]
    ) {

        estadisticas[idPregunta] =
            crearEstadisticaPregunta();

    }


    const estadistica =
        estadisticas[idPregunta];


    /*
     * Asegurarnos de que el historial existe.
     *
     * Esto también hace el sistema más resistente
     * frente a datos antiguos.
     */

    if (
        !Array.isArray(
            estadistica.historial
        )
    ) {

        estadistica.historial =
            [];

    }


    /*
     * Normalizar el valor.
     */

    const resultado =
        Boolean(
            esCorrecta
        );


    /*
     * Añadir la respuesta al historial reciente.
     */

    estadistica.historial.push(
        resultado
    );


    /*
     * Si superamos la ventana configurada,
     * eliminamos las respuestas más antiguas.
     */

    while (
        estadistica.historial.length >
        VENTANA_RENDIMIENTO
    ) {

        estadistica.historial.shift();

    }


    /*
     * Actualizar estadísticas históricas.
     */

    if (resultado) {

        estadistica.aciertosTotales++;

    }

    else {

        estadistica.fallosTotales++;

    }


    /*
     * Guardar fecha de la última respuesta.
     */

    estadistica.ultimaRespuesta =
        new Date().toISOString();


    /*
     * Calcular el rendimiento actual.
     */

    const rendimiento =
        calcularRendimientoReciente(
            estadistica
        );


    /*
     * Guardar un nuevo punto en el histórico.
     */

    guardarPuntoHistorico(
        estadistica,
        rendimiento
    );


    /*
     * Guardar todo.
     */

    guardarEstadisticasGlobales(
        estadisticas
    );


    /*
     * Devolver la estadística actualizada.
     */

    return estadistica;

}


/* ========================================================
   CALCULAR RENDIMIENTO RECIENTE
   ========================================================

   El rendimiento se calcula únicamente sobre las
   respuestas existentes dentro de VENTANA_RENDIMIENTO.

   Ejemplo:

   80 aciertos
   20 fallos

   → 80%

   ======================================================== */

function calcularRendimientoReciente(
    estadistica
) {

    if (
        !estadistica ||
        !Array.isArray(
            estadistica.historial
        ) ||
        estadistica.historial.length === 0
    ) {

        return 0;

    }


    const historial =
        estadistica.historial;


    const aciertos =
        historial.filter(
            respuesta =>
                respuesta === true
        ).length;


    return (
        aciertos /
        historial.length
    ) * 100;

}


/* ========================================================
   OBTENER RENDIMIENTO RECIENTE DE UNA PREGUNTA
   ======================================================== */

function obtenerRendimientoReciente(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (!estadistica) {

        return 0;

    }


    return calcularRendimientoReciente(
        estadistica
    );

}


/* ========================================================
   OBTENER NÚMERO DE RESPUESTAS RECIENTES
   ======================================================== */

function obtenerNumeroRespuestasRecientes(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (
        !estadistica ||
        !Array.isArray(
            estadistica.historial
        )
    ) {

        return 0;

    }


    return estadistica.historial.length;

}


/* ========================================================
   CALCULAR CONFIANZA
   ========================================================

   IMPORTANTE:

   La confianza NO es lo mismo que el rendimiento.

   Ejemplo:

   2/2   → 100% de rendimiento
   50/50 → 100% de rendimiento
   100/100 → 100% de rendimiento

   Pero tenemos mucha más información en el último caso.

   De momento utilizamos cuatro niveles sencillos:

   0 respuestas
       → ninguna

   1-9 respuestas
       → baja

   10-49 respuestas
       → media

   50-99 respuestas
       → alta

   100 respuestas
       → muy alta

   Los umbrales pueden modificarse posteriormente.

   ======================================================== */

function obtenerConfianza(
    idPregunta
) {

    const numeroRespuestas =
        obtenerNumeroRespuestasRecientes(
            idPregunta
        );


    if (
        numeroRespuestas === 0
    ) {

        return "ninguna";

    }


    if (
        numeroRespuestas < 10
    ) {

        return "baja";

    }


    if (
        numeroRespuestas < 50
    ) {

        return "media";

    }


    if (
        numeroRespuestas < VENTANA_RENDIMIENTO
    ) {

        return "alta";

    }


    return "muy alta";

}


/* ========================================================
   OBTENER INFORMACIÓN COMPLETA DE RENDIMIENTO
   ========================================================

   Devuelve algo como:

   {
       rendimiento: 94,
       respuestas: 100,
       confianza: "muy alta"
   }

   ======================================================== */

function obtenerRendimientoPregunta(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (!estadistica) {

        return {

            rendimiento: 0,

            respuestas: 0,

            confianza: "ninguna"

        };

    }


    const respuestas =
        Array.isArray(
            estadistica.historial
        )
            ? estadistica.historial.length
            : 0;


    const rendimiento =
        calcularRendimientoReciente(
            estadistica
        );


    return {

        rendimiento:
            rendimiento,

        respuestas:
            respuestas,

        confianza:
            obtenerConfianza(
                idPregunta
            )

    };

}


/* ========================================================
   GUARDAR PUNTO HISTÓRICO
   ========================================================

   Guardamos la evolución del rendimiento para poder
   crear gráficas posteriormente.

   Ejemplo:

   {
       fecha: "2026-08-11T20:30:00.000Z",
       rendimiento: 94
   }

   ======================================================== */

function guardarPuntoHistorico(
    estadistica,
    rendimiento
) {

    if (!estadistica) {

        return;

    }


    if (
        !Array.isArray(
            estadistica.historico
        )
    ) {

        estadistica.historico =
            [];

    }


    const punto = {

        fecha:
            new Date().toISOString(),

        rendimiento:
            Number(
                rendimiento.toFixed(2)
            )

    };


    estadistica.historico.push(
        punto
    );


    /*
     * Limitar el tamaño del histórico.
     */

    while (
        estadistica.historico.length >
        MAXIMO_PUNTOS_HISTORICO
    ) {

        estadistica.historico.shift();

    }

}


/* ========================================================
   OBTENER HISTÓRICO DE UNA PREGUNTA
   ======================================================== */

function obtenerHistoricoPregunta(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (
        !estadistica ||
        !Array.isArray(
            estadistica.historico
        )
    ) {

        return [];

    }


    return estadistica.historico;

}


/* ========================================================
   OBTENER ESTADÍSTICAS HISTÓRICAS
   ======================================================== */

function obtenerTotalesPregunta(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (!estadistica) {

        return {

            aciertos: 0,

            fallos: 0,

            respuestas: 0

        };

    }


    const aciertos =
        Number(
            estadistica.aciertosTotales
        ) || 0;


    const fallos =
        Number(
            estadistica.fallosTotales
        ) || 0;


    return {

        aciertos:
            aciertos,

        fallos:
            fallos,

        respuestas:
            aciertos +
            fallos

    };

}


/* ========================================================
   COMPROBAR SI EXISTEN ESTADÍSTICAS
   ======================================================== */

function tieneEstadisticasPregunta(
    idPregunta
) {

    if (!idPregunta) {

        return false;

    }


    const estadisticas =
        obtenerEstadisticasGlobales();


    return Boolean(
        estadisticas[idPregunta]
    );

}


/* ========================================================
   BORRAR ESTADÍSTICAS DE UNA PREGUNTA
   ======================================================== */

function borrarEstadisticasPregunta(
    idPregunta
) {

    if (!idPregunta) {

        return false;

    }


    const estadisticas =
        obtenerEstadisticasGlobales();


    if (
        !estadisticas[idPregunta]
    ) {

        return false;

    }


    delete estadisticas[
        idPregunta
    ];


    return guardarEstadisticasGlobales(
        estadisticas
    );

}


/* ========================================================
   BORRAR TODAS LAS ESTADÍSTICAS
   ========================================================

   Esta función NO la utilizaremos todavía desde la
   interfaz.

   Se deja preparada para futuras opciones de
   configuración.

   ======================================================== */

function borrarTodasLasEstadisticas() {

    localStorage.removeItem(
        CLAVE_ESTADISTICAS
    );

}


/* ========================================================
   EXPORTAR / EXPONER FUNCIONES
   ========================================================

   Como este archivo se carga mediante <script>,
   las funciones quedan disponibles globalmente.

   Por ejemplo, desde test.js podremos utilizar:

   registrarRespuestaPregunta(
       pregunta.id,
       true
   );

   obtenerRendimientoPregunta(
       pregunta.id
   );

   ======================================================== */
