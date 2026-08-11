
/* ========================================================
   ESTADÍSTICAS GLOBALES DE OPOS-TAI
   ========================================================

   Este archivo se encarga exclusivamente de gestionar
   las estadísticas de las preguntas.

   NO se encarga de:
   - Mostrar preguntas.
   - Corregir respuestas.
   - Seleccionar preguntas.
   - Gestionar el modo estudio.
   - Gestionar la interfaz.

   test.js simplemente deberá llamar a:

       registrarResultado(idPregunta, esCorrecta);

   ======================================================== */


/* ========================================================
   CONFIGURACIÓN
   ======================================================== */

const CLAVE_ESTADISTICAS =
    "opos_tai_estadisticas";


/*
 * Número de aciertos consecutivos necesarios para
 * considerar una pregunta dominada.
 *
 * Se mantiene en 2 porque es la lógica que hemos
 * establecido para el modo estudio.
 */

const ACIERTOS_PARA_DOMINAR =
    2;


/* ========================================================
   ESTRUCTURA DE UNA ESTADÍSTICA
   ========================================================

   Cada pregunta tendrá:

   {
       vecesRespondida: 0,
       aciertos: 0,
       fallos: 0,

       rachaActual: 0,
       mejorRacha: 0,

       ultimoResultado: null,
       ultimaRespuesta: null,

       dominio: "nueva",

       historial: []
   }

   ======================================================== */


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
            typeof estadisticas !== "object" ||
            estadisticas === null ||
            Array.isArray(estadisticas)
        ) {

            return {};

        }


        return estadisticas;

    }

    catch (error) {

        console.error(
            "Error al leer las estadísticas:",
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
            "Error al guardar las estadísticas:",
            error
        );


        return false;

    }

}


/* ========================================================
   CREAR ESTADÍSTICA VACÍA
   ======================================================== */

function crearEstadisticaInicial() {

    return {

        vecesRespondida: 0,

        aciertos: 0,

        fallos: 0,

        rachaActual: 0,

        mejorRacha: 0,

        ultimoResultado: null,

        ultimaRespuesta: null,

        dominio: "nueva",

        historial: []

    };

}


/* ========================================================
   OBTENER ESTADÍSTICA DE UNA PREGUNTA
   ========================================================

   Si la pregunta todavía no tiene estadísticas,
   devuelve una estructura inicial.

   Importante:
   NO guarda automáticamente la estadística.

   ======================================================== */

function obtenerEstadistica(
    idPregunta
) {

    if (!idPregunta) {

        return null;

    }


    const estadisticas =
        obtenerEstadisticas();


    if (
        !estadisticas[idPregunta]
    ) {

        return crearEstadisticaInicial();

    }


    return estadisticas[
        idPregunta
    ];

}


/* ========================================================
   REGISTRAR RESULTADO
   ========================================================

   Esta será la función principal que utilizará test.js.

   Ejemplo:

       registrarResultado(
           pregunta.id,
           true
       );

   o:

       registrarResultado(
           pregunta.id,
           false
       );

   ======================================================== */

function registrarResultado(
    idPregunta,
    esCorrecta,
    datosAdicionales = {}
) {

    if (!idPregunta) {

        console.warn(
            "No se puede registrar un resultado sin ID de pregunta."
        );


        return null;

    }


    /*
     * Obtener estadísticas actuales.
     */

    const estadisticas =
        obtenerEstadisticas();


    /*
     * Crear estadísticas si es una pregunta
     * que nunca se ha respondido.
     */

    if (
        !estadisticas[idPregunta]
    ) {

        estadisticas[idPregunta] =
            crearEstadisticaInicial();

    }


    const estadistica =
        estadisticas[
            idPregunta
        ];


    /*
     * Fecha y hora actual.
     */

    const fecha =
        new Date();


    const fechaISO =
        fecha.toISOString();


    /*
     * ====================================================
     * VECES RESPONDIDA
     * ====================================================
     */

    estadistica.vecesRespondida++;


    /*
     * ====================================================
     * ACIERTO
     * ====================================================
     */

    if (esCorrecta) {

        estadistica.aciertos++;


        /*
         * Aumentamos la racha actual.
         */

        estadistica.rachaActual++;


        /*
         * Actualizamos la mejor racha si corresponde.
         */

        if (
            estadistica.rachaActual >
            estadistica.mejorRacha
        ) {

            estadistica.mejorRacha =
                estadistica.rachaActual;

        }


        /*
         * Último resultado.
         */

        estadistica.ultimoResultado =
            true;


        /*
         * Dominio.
         */

        actualizarDominio(
            estadistica
        );

    }


    /*
     * ====================================================
     * FALLO
     * ====================================================
     */

    else {

        estadistica.fallos++;


        /*
         * Un fallo rompe completamente la racha.
         */

        estadistica.rachaActual =
            0;


        /*
         * Último resultado.
         */

        estadistica.ultimoResultado =
            false;


        /*
         * Una pregunta que se había dominado
         * deja de estar dominada si volvemos
         * a fallarla.
         */

        estadistica.dominio =
            "debil";

    }


    /*
     * ====================================================
     * ÚLTIMA RESPUESTA
     * ====================================================
     */

    estadistica.ultimaRespuesta =
        fechaISO;


    /*
     * ====================================================
     * HISTORIAL
     * ====================================================
     *
     * Guardamos cada intento individual.
     *
     * Esto permitirá posteriormente crear:
     *
     * - Evolución temporal.
     * - Gráficos.
     * - Últimos fallos.
     * - Rendimiento por sesiones.
     * - Rendimiento por modo.
     *
     * No se utiliza todavía en la interfaz.
     */

    estadistica.historial.push({

        fecha: fechaISO,

        correcta: Boolean(
            esCorrecta
        ),

        modo:
            datosAdicionales.modo ||
            null,

        sesion:
            datosAdicionales.sesion ||
            null

    });


    /*
     * ====================================================
     * GUARDAR
     * ====================================================
     */

    guardarEstadisticas(
        estadisticas
    );


    /*
     * Devolvemos la estadística actualizada.
     *
     * Esto puede ser útil para test.js.
     */

    return estadistica;

}


/* ========================================================
   ACTUALIZAR DOMINIO
   ========================================================

   Estados:

       nueva
       debil
       aprendizaje
       dominada

   La regla actual es:

       0 aciertos consecutivos
           → débil

       1 acierto consecutivo
           → aprendizaje

       2 aciertos consecutivos
           → dominada

   ======================================================== */

function actualizarDominio(
    estadistica
) {

    const racha =
        estadistica.rachaActual;


    /*
     * Dos aciertos consecutivos:
     * pregunta dominada.
     */

    if (
        racha >=
        ACIERTOS_PARA_DOMINAR
    ) {

        estadistica.dominio =
            "dominada";


        return;

    }


    /*
     * Un acierto consecutivo:
     * todavía está en aprendizaje.
     */

    if (
        racha === 1
    ) {

        estadistica.dominio =
            "aprendizaje";


        return;

    }


    /*
     * Sin racha.
     */

    estadistica.dominio =
        "debil";

}


/* ========================================================
   OBTENER PORCENTAJE DE ACIERTO
   ======================================================== */

function obtenerPorcentaje(
    idPregunta
) {

    const estadistica =
        obtenerEstadistica(
            idPregunta
        );


    if (
        !estadistica ||
        estadistica.vecesRespondida === 0
    ) {

        return 0;

    }


    return (
        estadistica.aciertos /
        estadistica.vecesRespondida
    ) * 100;

}


/* ========================================================
   OBTENER PREGUNTAS CON FALLOS
   ========================================================

   Devuelve los IDs de todas las preguntas
   que alguna vez se hayan fallado.

   IMPORTANTE:

   Una pregunta dominada NO desaparece del historial.

   Si alguna vez tuvo fallos, continuará apareciendo
   aquí.

   Esto permitirá posteriormente decidir desde la
   interfaz si queremos:

       - Todos los fallos.
       - Fallos no dominados.
       - Fallos recientes.
       - Fallos más frecuentes.

   ======================================================== */

function obtenerPreguntasConFallos() {

    const estadisticas =
        obtenerEstadisticas();


    return Object.keys(
        estadisticas
    ).filter(
        idPregunta =>
            estadisticas[
                idPregunta
            ].fallos > 0
    );

}


/* ========================================================
   OBTENER PREGUNTAS NO DOMINADAS
   ======================================================== */

function obtenerPreguntasNoDominadas() {

    const estadisticas =
        obtenerEstadisticas();


    return Object.keys(
        estadisticas
    ).filter(
        idPregunta =>
            estadisticas[
                idPregunta
            ].dominio !== "dominada"
    );

}


/* ========================================================
   OBTENER PREGUNTAS CON FALLOS Y NO DOMINADAS
   ========================================================

   Esta función será especialmente útil para el futuro
   "Test de fallos".

   ======================================================== */

function obtenerPreguntasParaRepaso() {

    const estadisticas =
        obtenerEstadisticas();


    return Object.keys(
        estadisticas
    ).filter(
        idPregunta => {

            const estadistica =
                estadisticas[
                    idPregunta
                ];


            return (
                estadistica.fallos > 0 &&
                estadistica.dominio !==
                    "dominada"
            );

        }
    );

}


/* ========================================================
   OBTENER PREGUNTAS MÁS FALLADAS
   ========================================================

   Devuelve las preguntas ordenadas desde la que tiene
   más fallos hasta la que tiene menos.

   ======================================================== */

function obtenerPreguntasMasFalladas() {

    const estadisticas =
        obtenerEstadisticas();


    return Object.keys(
        estadisticas
    )
        .filter(
            idPregunta =>
                estadisticas[
                    idPregunta
                ].fallos > 0
        )
        .sort(
            (
                idA,
                idB
            ) => {

                return (
                    estadisticas[idB].fallos -
                    estadisticas[idA].fallos
                );

            }
        );

}


/* ========================================================
   CALCULAR ESTADÍSTICAS DE UN CONJUNTO DE PREGUNTAS
   ========================================================

   Recibe un array de IDs:

       [
           "constitucion-titulo-1-001",
           "constitucion-titulo-1-002",
           "constitucion-titulo-1-003"
       ]

   y devuelve estadísticas agrupadas.

   Esto permitirá posteriormente calcular:

       - Estadísticas de un capítulo.
       - Estadísticas de una asignatura.
       - Estadísticas de una sesión.

   ======================================================== */

function calcularEstadisticasPreguntas(
    idsPreguntas
) {

    const estadisticas =
        obtenerEstadisticas();


    let vecesRespondidas =
        0;

    let aciertos =
        0;

    let fallos =
        0;

    let preguntasConDatos =
        0;

    let preguntasDominadas =
        0;

    let preguntasConFallos =
        0;


    idsPreguntas.forEach(
        idPregunta => {

            const estadistica =
                estadisticas[
                    idPregunta
                ];


            /*
             * Si nunca se ha respondido,
             * no aporta datos estadísticos.
             */

            if (!estadistica) {

                return;

            }


            preguntasConDatos++;


            vecesRespondidas +=
                estadistica.vecesRespondida;


            aciertos +=
                estadistica.aciertos;


            fallos +=
                estadistica.fallos;


            if (
                estadistica.dominio ===
                "dominada"
            ) {

                preguntasDominadas++;

            }


            if (
                estadistica.fallos > 0
            ) {

                preguntasConFallos++;

            }

        }
    );


    const porcentaje =
        vecesRespondidas > 0

            ? (
                aciertos /
                vecesRespondidas
            ) * 100

            : 0;


    return {

        preguntasTotales:
            idsPreguntas.length,

        preguntasConDatos,

        preguntasSinDatos:
            idsPreguntas.length -
            preguntasConDatos,

        preguntasDominadas,

        preguntasConFallos,

        vecesRespondidas,

        aciertos,

        fallos,

        porcentaje

    };

}


/* ========================================================
   ESTADÍSTICAS DE CAPÍTULO
   ========================================================

   Para utilizar esta función necesitaremos proporcionar
   los IDs de las preguntas que pertenecen al capítulo.

   ======================================================== */

function obtenerEstadisticasCapitulo(
    idsPreguntas
) {

    return calcularEstadisticasPreguntas(
        idsPreguntas
    );

}


/* ========================================================
   ESTADÍSTICAS DE ASIGNATURA
   ========================================================

   Igual que para un capítulo, pero pasando todos los IDs
   pertenecientes a la asignatura.

   ======================================================== */

function obtenerEstadisticasAsignatura(
    idsPreguntas
) {

    return calcularEstadisticasPreguntas(
        idsPreguntas
    );

}


/* ========================================================
   OBTENER EVOLUCIÓN
   ========================================================

   Devuelve todos los intentos registrados de las preguntas
   indicadas.

   Si no se proporciona una lista de IDs, devuelve el
   historial global.

   ======================================================== */

function obtenerEvolucion(
    idsPreguntas = null
) {

    const estadisticas =
        obtenerEstadisticas();


    const historial =
        [];


    /*
     * Si no se indican IDs:
     * utilizamos todas las preguntas.
     */

    const ids =
        Array.isArray(
            idsPreguntas
        )

            ? idsPreguntas

            : Object.keys(
                estadisticas
            );


    ids.forEach(
        idPregunta => {

            const estadistica =
                estadisticas[
                    idPregunta
                ];


            if (
                !estadistica ||
                !Array.isArray(
                    estadistica.historial
                )
            ) {

                return;

            }


            estadistica.historial.forEach(
                intento => {

                    historial.push({

                        idPregunta,

                        fecha:
                            intento.fecha,

                        correcta:
                            intento.correcta,

                        modo:
                            intento.modo,

                        sesion:
                            intento.sesion

                    });

                }
            );

        }
    );


    /*
     * Ordenar cronológicamente.
     */

    historial.sort(
        (
            a,
            b
        ) => {

            return (
                new Date(a.fecha) -
                new Date(b.fecha)
            );

        }
    );


    return historial;

}


/* ========================================================
   OBTENER ÚLTIMO RESULTADO
   ======================================================== */

function obtenerUltimoResultado(
    idPregunta
) {

    const estadistica =
        obtenerEstadistica(
            idPregunta
        );


    if (
        !estadistica
    ) {

        return null;

    }


    return estadistica.ultimoResultado;

}


/* ========================================================
   COMPROBAR SI ESTÁ DOMINADA
   ======================================================== */

function preguntaEstaDominada(
    idPregunta
) {

    const estadistica =
        obtenerEstadistica(
            idPregunta
        );


    return Boolean(
        estadistica &&
        estadistica.dominio ===
            "dominada"
    );

}


/* ========================================================
   OBTENER RACHA ACTUAL
   ======================================================== */

function obtenerRachaActual(
    idPregunta
) {

    const estadistica =
        obtenerEstadistica(
            idPregunta
        );


    if (
        !estadistica
    ) {

        return 0;

    }


    return estadistica.rachaActual;

}


/* ========================================================
   OBTENER MEJOR RACHA
   ======================================================== */

function obtenerMejorRacha(
    idPregunta
) {

    const estadistica =
        obtenerEstadistica(
            idPregunta
        );


    if (
        !estadistica
    ) {

        return 0;

    }


    return estadistica.mejorRacha;

}


/* ========================================================
   ELIMINAR TODAS LAS ESTADÍSTICAS
   ========================================================

   Esta función NO se ejecuta automáticamente.

   Servirá posteriormente para añadir una opción como:

       "Borrar estadísticas"

   ======================================================== */

function eliminarTodasLasEstadisticas() {

    localStorage.removeItem(
        CLAVE_ESTADISTICAS
    );

}


/* ========================================================
   ELIMINAR ESTADÍSTICAS DE UNA PREGUNTA
   ======================================================== */

function eliminarEstadistica(
    idPregunta
) {

    if (!idPregunta) {

        return;

    }


    const estadisticas =
        obtenerEstadisticas();


    delete estadisticas[
        idPregunta
    ];


    guardarEstadisticas(
        estadisticas
    );

}


/* ========================================================
   EXPORTAR FUNCIONES
   ========================================================

   Si en algún momento usamos módulos ES6 podremos
   sustituir esto por "export".

   De momento las funciones quedan disponibles
   globalmente para que test.js pueda utilizarlas
   directamente.

   ======================================================== */
