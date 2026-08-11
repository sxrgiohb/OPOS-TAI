/* ========================================================
   ESTADÍSTICAS PERMANENTES DE LAS PREGUNTAS

   Las estadísticas se guardan en localStorage y son
   independientes de cada test.

   Cada pregunta almacena:

   - historial
   - aciertosTotales
   - fallosTotales
   - ultimaRespuesta
   - historico

   ======================================================== */


const CLAVE_ESTADISTICAS =
    "opos_tai_estadisticas";


/* ========================================================
   CONFIGURACIÓN DE DOMINADA
   ========================================================

   Una pregunta se considera DOMINADA cuando:

   1. Tiene al menos 20 intentos históricos.
   2. Tiene un porcentaje de aciertos >= 90 %.

   Estos datos son PERMANENTES.

   Los 2 aciertos consecutivos de test.js
   NO intervienen aquí.
   ======================================================== */


const MINIMO_INTENTOS_DOMINADA =
    20;


const PORCENTAJE_MINIMO_DOMINADA =
    90;


/* ========================================================
   OBTENER TODAS LAS ESTADÍSTICAS
   ======================================================== */

function obtenerEstadisticas() {

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
            estadisticas &&
            typeof estadisticas === "object" &&
            !Array.isArray(estadisticas)
        ) {

            return estadisticas;

        }


        return {};

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

function guardarEstadisticas(
    estadisticas
) {

    localStorage.setItem(
        CLAVE_ESTADISTICAS,
        JSON.stringify(
            estadisticas
        )
    );

}


/* ========================================================
   OBTENER ESTADÍSTICAS DE UNA PREGUNTA
   ======================================================== */

function obtenerEstadisticaPregunta(
    idPregunta
) {

    if (!idPregunta) {

        return null;

    }


    const estadisticas =
        obtenerEstadisticas();


    return (
        estadisticas[idPregunta] ||
        null
    );

}


/* ========================================================
   OBTENER TOTALES DE UNA PREGUNTA
   ========================================================

   Esta es la función que utiliza
   estaPreguntaDominada().

   Devuelve siempre:

   - respuestas
   - aciertos
   - fallos
   ======================================================== */

function obtenerTotalesPregunta(
    idPregunta
) {

    if (!idPregunta) {

        return {

            respuestas: 0,

            aciertos: 0,

            fallos: 0

        };

    }


    const estadistica =
        obtenerEstadisticaPregunta(
            idPregunta
        );


    if (!estadistica) {

        return {

            respuestas: 0,

            aciertos: 0,

            fallos: 0

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

        respuestas:
            aciertos +
            fallos,

        aciertos:
            aciertos,

        fallos:
            fallos

    };

}


/* ========================================================
   REGISTRAR RESPUESTA DE UNA PREGUNTA
   ========================================================

   Cada vez que el usuario responde una pregunta:

   - se registra un nuevo intento histórico;
   - se actualizan los aciertos o fallos;
   - se guarda la última respuesta.

   Esto NO depende del sistema de repaso de test.js.
   ======================================================== */

function registrarRespuestaPregunta(
    idPregunta,
    esCorrecta
) {

    if (!idPregunta) {

        console.warn(
            "No se puede registrar una respuesta sin ID de pregunta."
        );

        return;

    }


    const estadisticas =
        obtenerEstadisticas();


    /*
     * Si la pregunta todavía no tiene estadísticas,
     * creamos su registro.
     */

    if (
        !estadisticas[idPregunta]
    ) {

        estadisticas[idPregunta] = {

            historial: [],

            aciertosTotales: 0,

            fallosTotales: 0,

            ultimaRespuesta: null,

            historico: []

        };

    }


    const pregunta =
        estadisticas[idPregunta];


    /*
     * Asegurar que los campos existen.
     *
     * Esto también permite mantener registros
     * antiguos sin romperlos.
     */

    if (
        !Array.isArray(
            pregunta.historial
        )
    ) {

        pregunta.historial = [];

    }


    if (
        !Array.isArray(
            pregunta.historico
        )
    ) {

        pregunta.historico = [];

    }


    if (
        typeof pregunta.aciertosTotales !==
        "number"
    ) {

        pregunta.aciertosTotales =
            Number(
                pregunta.aciertosTotales
            ) || 0;

    }


    if (
        typeof pregunta.fallosTotales !==
        "number"
    ) {

        pregunta.fallosTotales =
            Number(
                pregunta.fallosTotales
            ) || 0;

    }


    /*
     * Registrar respuesta.
     */

    if (esCorrecta) {

        pregunta.aciertosTotales++;

    }

    else {

        pregunta.fallosTotales++;

    }


    /*
     * Guardar el resultado en el historial.
     */

    pregunta.historial.push(
        Boolean(
            esCorrecta
        )
    );


    /*
     * Mantener también el histórico.
     */

    pregunta.historico.push({

        correcta:
            Boolean(
                esCorrecta
            ),

        fecha:
            new Date().toISOString()

    });


    /*
     * Guardar última respuesta.
     */

    pregunta.ultimaRespuesta =
        Boolean(
            esCorrecta
        );


    /*
     * Guardar todo en localStorage.
     */

    guardarEstadisticas(
        estadisticas
    );

}


/* ========================================================
   COMPROBAR SI UNA PREGUNTA ESTÁ DOMINADA
   ======================================================== */

function estaPreguntaDominada(
    idPregunta
) {

    if (!idPregunta) {

        return false;

    }


    const totales =
        obtenerTotalesPregunta(
            idPregunta
        );


    /*
     * Todavía no tiene suficientes intentos.
     */

    if (
        totales.respuestas <
        MINIMO_INTENTOS_DOMINADA
    ) {

        return false;

    }


    /*
     * Calcular porcentaje de aciertos.
     */

    const porcentaje =
        (
            totales.aciertos /
            totales.respuestas
        ) * 100;


    return (
        porcentaje >=
        PORCENTAJE_MINIMO_DOMINADA
    );

}


/* ========================================================
   OBTENER ESTADO COMPLETO DE DOMINIO
   ======================================================== */

function obtenerEstadoDominioPregunta(
    idPregunta
) {

    const totales =
        obtenerTotalesPregunta(
            idPregunta
        );


    const intentos =
        totales.respuestas;


    const porcentaje =
        intentos > 0

            ? (
                totales.aciertos /
                intentos
            ) * 100

            : 0;


    return {

        intentos:
            intentos,

        aciertos:
            totales.aciertos,

        fallos:
            totales.fallos,

        porcentaje:
            Number(
                porcentaje.toFixed(2)
            ),

        intentosMinimos:
            MINIMO_INTENTOS_DOMINADA,

        porcentajeMinimo:
            PORCENTAJE_MINIMO_DOMINADA,

        dominada:
            estaPreguntaDominada(
                idPregunta
            )

    };

}
