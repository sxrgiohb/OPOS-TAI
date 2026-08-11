/* ========================================================
   SISTEMA DE DOMINIO
   ========================================================

   Una pregunta puede considerarse DOMINADA cuando:

   1. Tiene al menos 20 intentos históricos.
   2. Su porcentaje de aciertos es igual o superior al 90 %.

   IMPORTANTE:

   Estos datos son permanentes y proceden del historial
   global guardado en localStorage.

   Los 2 aciertos consecutivos de test.js NO intervienen
   en este sistema.
   ======================================================== */

const MINIMO_INTENTOS_DOMINADA = 20;

const PORCENTAJE_MINIMO_DOMINADA = 90;


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
