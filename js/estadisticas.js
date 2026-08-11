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
      → Las gestiona test.js.

   2. ESTADO DE REPASO
      → Lo gestiona test.js.

   3. RENDIMIENTO GLOBAL
      → Lo gestiona este archivo.

   ======================================================== */


/* ========================================================
   CONFIGURACIÓN
   ======================================================== */


/*
 * Clave utilizada para guardar todas las estadísticas
 * permanentes de la aplicación.
 */

const CLAVE_ESTADISTICAS =
    "opos_tai_estadisticas";


/*
 * Número máximo de respuestas recientes utilizadas
 * para calcular el rendimiento.
 */

const VENTANA_ESTADISTICAS =
    100;


/*
 * Número máximo de puntos que conservaremos
 * en el histórico de rendimiento.
 */

const MAXIMO_PUNTOS_HISTORICO =
    100;


/* ========================================================
   CREAR ESTADÍSTICA VACÍA
   ======================================================== */

function crearEstadisticaPregunta() {

    return {

        /*
         * Últimas respuestas utilizadas para calcular
         * el rendimiento reciente.
         */

        historial: [],


        /*
         * Número total de respuestas correctas.
         */

        aciertosTotales: 0,


        /*
         * Número total de respuestas incorrectas.
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
   OBTENER TODAS LAS ESTADÍSTICAS
   ======================================================== */

function obtenerEstadisticasGlobales() {

    const datos =
        localStorage.getItem(
            CLAVE_ESTADISTICAS
        );


    if (!datos) {

        return {};

    }


    try {

        const estadisticas =
            JSON.parse(
                datos
            );


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
   OBTENER ESTADÍSTICA DE UNA PREGUNTA
   ======================================================== */

function obtenerEstadisticaPregunta(
    idPregunta
) {

    if (!idPregunta) {

        return null;

    }


    const estadisticas =
        obtenerEstadisticasGlobales();


    if (
        !estadisticas[idPregunta]
    ) {

        return crearEstadisticaPregunta();

    }


    const estadistica =
        estadisticas[idPregunta];


    /*
     * Compatibilidad y protección frente
     * a datos antiguos o corruptos.
     */

    if (
        !Array.isArray(
            estadistica.historial
        )
    ) {

        estadistica.historial =
            [];

    }


    if (
        !Number.isFinite(
            Number(
                estadistica.aciertosTotales
            )
        )
    ) {

        estadistica.aciertosTotales =
            0;

    }


    if (
        !Number.isFinite(
            Number(
                estadistica.fallosTotales
            )
        )
    ) {

        estadistica.fallosTotales =
            0;

    }


    if (
        !Array.isArray(
            estadistica.historico
        )
    ) {

        estadistica.historico =
            [];

    }


    return estadistica;

}


/* ========================================================
   REGISTRAR UNA RESPUESTA
   ========================================================

   Esta es la función principal que utiliza test.js.

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
     * Crear estadística si es la primera vez
     * que aparece esta pregunta.
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
     * Asegurar estructura.
     */

    if (
        !Array.isArray(
            estadistica.historial
        )
    ) {

        estadistica.historial =
            [];

    }


    if (
        !Array.isArray(
            estadistica.historico
        )
    ) {

        estadistica.historico =
            [];

    }


    if (
        !Number.isFinite(
            Number(
                estadistica.aciertosTotales
            )
        )
    ) {

        estadistica.aciertosTotales =
            0;

    }


    if (
        !Number.isFinite(
            Number(
                estadistica.fallosTotales
            )
        )
    ) {

        estadistica.fallosTotales =
            0;

    }


    /*
     * Normalizar resultado.
     */

    const resultado =
        Boolean(
            esCorrecta
        );


    /*
     * Guardar en historial reciente.
     */

    estadistica.historial.push(
        resultado
    );


    /*
     * Mantener únicamente las últimas
     * VENTANA_ESTADISTICAS respuestas.
     */

    while (
        estadistica.historial.length >
        VENTANA_ESTADISTICAS
    ) {

        estadistica.historial.shift();

    }


    /*
     * Actualizar totales históricos.
     */

    if (resultado) {

        estadistica.aciertosTotales++;

    }

    else {

        estadistica.fallosTotales++;

    }


    /*
     * Guardar fecha.
     */

    estadistica.ultimaRespuesta =
        new Date().toISOString();


    /*
     * Calcular rendimiento actual.
     */

    const rendimiento =
        calcularRendimientoEstadistica(
            estadistica
        );


    /*
     * Guardar evolución.
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


    return estadistica;

}


/* ========================================================
   CALCULAR RENDIMIENTO RECIENTE
   ======================================================== */

function calcularRendimientoEstadistica(
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
   OBTENER RENDIMIENTO RECIENTE
   ======================================================== */

function obtenerRendimientoRecientePregunta(
    idPregunta
) {

    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (!estadistica) {

        return 0;

    }


    return calcularRendimientoEstadistica(
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
        numeroRespuestas < VENTANA_ESTADISTICAS
    ) {

        return "alta";

    }


    return "muy alta";

}


/* ========================================================
   OBTENER INFORMACIÓN COMPLETA DE RENDIMIENTO
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
        calcularRendimientoEstadistica(
            estadistica
        );


    return {

        rendimiento:
            Number(
                rendimiento.toFixed(2)
            ),

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
   OBTENER TOTALES HISTÓRICOS
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
   ======================================================== */

function borrarTodasLasEstadisticas() {

    localStorage.removeItem(
        CLAVE_ESTADISTICAS
    );

}
