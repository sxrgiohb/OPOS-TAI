let preguntas = [];
let indice = 0;


/* ========================================================
   ESTADO DEL BOTÓN DEL TEST

   "corregir"  → todavía no hemos corregido
   "siguiente" → ya hemos corregido y esperamos al usuario
   ======================================================== */

let estadoBoton = "corregir";


/* ========================================================
   ESTADÍSTICAS DEL TEST ACTUAL
   ======================================================== */

let aciertos = 0;
let fallos = 0;
let respondidas = 0;


/* ========================================================
   CONFIGURACIÓN
   ======================================================== */

const CLAVE_SESIONES =
    "opos_tai_sesiones";


/* ========================================================
   HISTORIAL DE RENDIMIENTO
   ========================================================

   El historial es independiente de las estadísticas
   del test.

   Se guarda permanentemente en localStorage.

   Cada pregunta se identifica mediante su "id".

   Ejemplo:

   {
       "constitucion-preambulo-001": [
           true,
           true,
           false,
           true
       ]
   }

   true  = acierto
   false = fallo

   Solo conservamos las últimas respuestas indicadas
   por VENTANA_RENDIMIENTO.
   ======================================================== */

const CLAVE_HISTORIAL_RENDIMIENTO =
    "opos_tai_historial_rendimiento";


/*
 * Número máximo de respuestas que conservamos
 * por cada pregunta.
 *
 * Se puede modificar en el futuro.
 */

const VENTANA_RENDIMIENTO =
    100;


/*
 * Número mínimo de intentos que necesitaremos
 * posteriormente para poder considerar una pregunta
 * como candidata a "dominada".
 *
 * IMPORTANTE:
 *
 * En este momento todavía NO se utiliza para
 * determinar el dominio.
 *
 * Lo utilizaremos en el siguiente paso.
 */

const MINIMO_INTENTOS_DOMINIO =
    20;


/*
 * Objeto que contiene el historial cargado
 * desde localStorage.
 */

let historialRendimiento =
    {};


/* ========================================================
   MODO ESTUDIO
   ========================================================

   Los tests normales que se abren mediante ?datos=
   SIEMPRE funcionan en modo estudio.

   En las sesiones:

   modoEstudio: true  → modo estudio
   modoEstudio: false → modo examen

   Una pregunta fallada entra en el sistema de repaso.

   Para considerar que una pregunta está repasada
   dentro del test debe conseguir DOS ACIERTOS
   CONSECUTIVOS.

   IMPORTANTE:

   Esto NO significa que la pregunta esté dominada.

   Es únicamente el sistema de repaso del test actual.

   El dominio se calculará posteriormente mediante
   el historial permanente.
   ======================================================== */

const MODO_ESTUDIO_POR_DEFECTO =
    true;


/* ========================================================
   INTERVALOS DE REPETICIÓN
   ========================================================

   Las preguntas de repaso nunca se muestran
   inmediatamente después de fallarlas.

   Se espera un número aleatorio de preguntas
   normales antes de volver a mostrarlas.
   ======================================================== */

const INTERVALO_REPETICION_MIN =
    3;

const INTERVALO_REPETICION_MAX =
    7;


/* ========================================================
   PARÁMETROS DE URL
   ======================================================== */

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idSesion =
    parametros.get("sesion");


/*
 * Sistema antiguo mediante ?datos=
 */

const archivoDatos =
    parametros.get("datos");


/* ========================================================
   ELEMENTOS DEL HTML
   ======================================================== */

const preguntaElemento =
    document.getElementById("pregunta");

const opcionesElemento =
    document.getElementById("opciones");

const asignaturaElemento =
    document.getElementById("asignatura");

const estadoElemento =
    document.getElementById("estado");

const botonTest =
    document.getElementById("botonTest");

const reiniciar =
    document.getElementById("reiniciar");

const resultadoElemento =
    document.getElementById("resultado");

const estadisticasElemento =
    document.getElementById("estadisticas");

const listaPreguntasElemento =
    document.getElementById("question-list");

const buscador =
    document.getElementById("search");


/* ========================================================
   ESTADO DEL MODO ESTUDIO
   ======================================================== */

let modoEstudio =
    MODO_ESTUDIO_POR_DEFECTO;


/*
 * Pregunta que se está mostrando actualmente.
 */

let preguntaActual =
    null;


/*
 * Indica si la pregunta actual es una repetición.
 */

let preguntaActualEsRepeticion =
    false;


/*
 * Número de preguntas ORIGINALES mostradas.

 * Las repeticiones NO incrementan este contador.
 */

let preguntasNormalesMostradas =
    0;


/*
 * Indica si la última pregunta mostrada
 * fue una repetición.
 */

let ultimaPreguntaFueRepeticion =
    false;


/* ========================================================
   ESTADO DE LAS PREGUNTAS EN REPASO
   ======================================================== */

let estadoPreguntasEstudio =
    new Map();


/* ========================================================
   CARGAR HISTORIAL DE RENDIMIENTO
   ========================================================

   Se ejecuta una vez al iniciar el test.

   Si no existe historial todavía, comenzamos
   con un objeto vacío.

   Si el contenido está corrupto, también empezamos
   de cero para evitar que la aplicación falle.
   ======================================================== */

function cargarHistorialRendimiento() {

    const datos =
        localStorage.getItem(
            CLAVE_HISTORIAL_RENDIMIENTO
        );


    if (!datos) {

        historialRendimiento =
            {};

        return;

    }


    try {

        const historial =
            JSON.parse(
                datos
            );


        if (
            historial &&
            typeof historial === "object" &&
            !Array.isArray(historial)
        ) {

            historialRendimiento =
                historial;

        }

        else {

            historialRendimiento =
                {};

        }

    }

    catch (error) {

        console.error(
            "Error leyendo el historial de rendimiento:",
            error
        );


        historialRendimiento =
            {};

    }

}


/* ========================================================
   GUARDAR HISTORIAL DE RENDIMIENTO
   ======================================================== */

function guardarHistorialRendimiento() {

    try {

        localStorage.setItem(
            CLAVE_HISTORIAL_RENDIMIENTO,
            JSON.stringify(
                historialRendimiento
            )
        );

    }

    catch (error) {

        console.error(
            "Error guardando el historial de rendimiento:",
            error
        );

    }

}


/* ========================================================
   REGISTRAR RESULTADO EN EL HISTORIAL
   ========================================================

   Guarda una respuesta de una pregunta.

   true  → acertada
   false → fallada

   Solo se guardan las últimas
   VENTANA_RENDIMIENTO respuestas.
   ======================================================== */

function registrarResultadoHistorial(
    pregunta,
    esCorrecta
) {

    /*
     * Las preguntas necesitan un ID.
     */

    if (
        !pregunta ||
        !pregunta.id
    ) {

        console.warn(
            "No se puede guardar el historial: la pregunta no tiene id.",
            pregunta
        );


        return;

    }


    const id =
        String(
            pregunta.id
        );


    /*
     * Si todavía no existe historial
     * para esta pregunta, lo creamos.
     */

    if (
        !Array.isArray(
            historialRendimiento[id]
        )
    ) {

        historialRendimiento[id] =
            [];

    }


    /*
     * Añadir el resultado actual.
     */

    historialRendimiento[id].push(
        Boolean(
            esCorrecta
        )
    );


    /*
     * Mantener únicamente las últimas
     * VENTANA_RENDIMIENTO respuestas.
     */

    if (
        historialRendimiento[id].length >
        VENTANA_RENDIMIENTO
    ) {

        historialRendimiento[id] =
            historialRendimiento[id].slice(
                -VENTANA_RENDIMIENTO
            );

    }


    /*
     * Guardar inmediatamente.
     *
     * De esta forma, aunque el usuario cierre
     * la página después de responder, el resultado
     * ya queda almacenado.
     */

    guardarHistorialRendimiento();

}


/* ========================================================
   OBTENER HISTORIAL DE UNA PREGUNTA
   ======================================================== */

function obtenerHistorialPregunta(
    pregunta
) {

    if (
        !pregunta ||
        !pregunta.id
    ) {

        return [];

    }


    const historial =
        historialRendimiento[
            String(
                pregunta.id
            )
        ];


    if (
        !Array.isArray(
            historial
        )
    ) {

        return [];

    }


    return historial;

}


/* ========================================================
   OBTENER NÚMERO DE INTENTOS HISTÓRICOS
   ======================================================== */

function obtenerIntentosPregunta(
    pregunta
) {

    return obtenerHistorialPregunta(
        pregunta
    ).length;

}


/* ========================================================
   OBTENER ACIERTOS RECIENTES
   ======================================================== */

function obtenerAciertosRecientes(
    pregunta
) {

    const historial =
        obtenerHistorialPregunta(
            pregunta
        );


    return historial.filter(
        resultado =>
            resultado === true
    ).length;

}


/* ========================================================
   OBTENER RENDIMIENTO RECIENTE
   ========================================================

   Todavía no se muestra en pantalla.

   Lo dejamos preparado para el siguiente paso.
   ======================================================== */

function obtenerRendimientoReciente(
    pregunta
) {

    const historial =
        obtenerHistorialPregunta(
            pregunta
        );


    if (
        historial.length === 0
    ) {

        return 0;

    }


    const aciertosRecientes =
        historial.filter(
            resultado =>
                resultado === true
        ).length;


    return Math.round(
        (
            aciertosRecientes /
            historial.length
        ) *
        100
    );

}


/* ========================================================
   OBTENER CONFIANZA
   ========================================================

   Todavía no utilizamos este valor para decidir
   si una pregunta está dominada.

   Se deja preparado para el siguiente paso.

   La idea es distinguir entre:

   100 % con 2 intentos

   y

   100 % con 100 intentos.
   ======================================================== */

function obtenerConfianzaPregunta(
    pregunta
) {

    const intentos =
        obtenerIntentosPregunta(
            pregunta
        );


    if (
        intentos === 0
    ) {

        return 0;

    }


    /*
     * Por ahora utilizamos como medida sencilla
     * la cantidad de historial disponible respecto
     * a la ventana máxima.
     *
     * Más adelante podremos convertir esto en
     * niveles de confianza.
     */

    return Math.round(
        Math.min(
            intentos /
            VENTANA_RENDIMIENTO,
            1
        ) *
        100
    );

}


/* ========================================================
   CONFIGURAR LISTADO
   ======================================================== */

function configurarListado() {

    if (!listaPreguntasElemento) {

        return;

    }


    const listadoCard =
        listaPreguntasElemento.closest(
            ".card"
        );


    if (!listadoCard) {

        return;

    }


    /*
     * SESIÓN:
     *
     * ocultamos completamente el listado.
     */

    if (idSesion) {

        listadoCard.style.display =
            "none";

    }


    /*
     * CAPÍTULO:
     *
     * mantenemos visible el listado.
     */

    else {

        listadoCard.style.display =
            "";

    }

}


/* ========================================================
   OBTENER SESIONES
   ======================================================== */

function obtenerSesiones() {

    const datos =
        localStorage.getItem(
            CLAVE_SESIONES
        );


    if (!datos) {

        return [];

    }


    try {

        const sesiones =
            JSON.parse(
                datos
            );


        return Array.isArray(
            sesiones
        )
            ? sesiones
            : [];

    }


    catch (error) {

        console.error(
            "Error leyendo las sesiones:",
            error
        );


        return [];

    }

}


/* ========================================================
   BUSCAR SESIÓN ACTUAL
   ======================================================== */

function obtenerSesionActual() {

    if (!idSesion) {

        return null;

    }


    const sesiones =
        obtenerSesiones();


    return sesiones.find(
        sesion =>
            sesion.id === idSesion
    ) || null;

}


/* ========================================================
   CONFIGURAR MODO ESTUDIO
   ======================================================== */

function configurarModoEstudio(
    sesion = null
) {

    /*
     * TEST NORMAL:
     *
     * Siempre modo estudio.
     */

    if (!idSesion) {

        modoEstudio =
            true;

        return;

    }


    /*
     * SESIÓN:
     *
     * El valor se obtiene de la configuración
     * guardada de la sesión.
     */

    modoEstudio =
        sesion?.modoEstudio === true;

}


/* ========================================================
   REINICIAR ESTADO DEL MODO ESTUDIO
   ======================================================== */

function reiniciarEstadoEstudio() {

    estadoPreguntasEstudio =
        new Map();


    preguntasNormalesMostradas =
        0;


    ultimaPreguntaFueRepeticion =
        false;


    preguntaActual =
        null;


    preguntaActualEsRepeticion =
        false;

}


/* ========================================================
   CARGAR PREGUNTAS
   ======================================================== */

async function cargarPreguntas() {

    try {

        /*
         * Si venimos desde una sesión personalizada.
         */

        if (idSesion) {

            await cargarPreguntasDeSesion();

            return;

        }


        /*
         * Sistema antiguo mediante ?datos=
         */

        if (archivoDatos) {

            await cargarPreguntasAntiguo();

            return;

        }


        throw new Error(
            "No se ha indicado ninguna sesión o capítulo."
        );

    }


    catch (error) {

        console.error(
            error
        );


        if (estadoElemento) {

            estadoElemento.style.display =
                "block";


            estadoElemento.textContent =
                "❌ " +
                error.message;

        }

    }

}


/* ========================================================
   CARGAR PREGUNTAS DE UNA SESIÓN
   ======================================================== */

async function cargarPreguntasDeSesion() {

    const sesion =
        obtenerSesionActual();


    if (!sesion) {

        throw new Error(
            "No se ha encontrado la sesión."
        );

    }


    const capitulos =
        sesion.capitulos || [];


    if (capitulos.length === 0) {

        throw new Error(
            "La sesión no tiene capítulos seleccionados."
        );

    }


    /*
     * Configurar modo de la sesión.
     */

    configurarModoEstudio(
        sesion
    );


    /*
     * Mostrar nombre de la sesión.
     */

    asignaturaElemento.textContent =
        sesion.nombre ||
        "Sesión personalizada";


    estadoElemento.textContent =
        "Cargando preguntas...";


    /*
     * Aquí almacenaremos todas las preguntas.
     */

    let preguntasCombinadas =
        [];


    /*
     * Cargar cada capítulo.
     */

    for (
        const capitulo of capitulos
    ) {

        const asignatura =
            capitulo.asignatura;


        const archivo =
            capitulo.archivo;


        if (
            !asignatura ||
            !archivo
        ) {

            console.warn(
                "Capítulo sin ruta válida:",
                capitulo
            );


            continue;

        }


        /*
         * Ruta:
         *
         * data/
         *   asignatura/
         *      archivo.json
         */

        const ruta =
            `data/${encodeURIComponent(
                asignatura
            )}/${encodeURIComponent(
                archivo
            )}`;


        console.log(
            "Cargando:",
            ruta
        );


        const respuesta =
            await fetch(
                ruta
            );


        if (!respuesta.ok) {

            throw new Error(
                `No se ha podido cargar ${ruta}`
            );

        }


        const preguntasArchivo =
            await respuesta.json();


        if (
            !Array.isArray(
                preguntasArchivo
            )
        ) {

            console.warn(
                `El archivo ${ruta} no contiene un array de preguntas.`
            );


            continue;

        }


        /*
         * Añadir preguntas.
         */

        preguntasCombinadas =
            preguntasCombinadas.concat(
                preguntasArchivo
            );

    }


    if (
        preguntasCombinadas.length === 0
    ) {

        throw new Error(
            "No se han encontrado preguntas en los capítulos seleccionados."
        );

    }


    /*
     * Guardar preguntas.
     */

    preguntas =
        preguntasCombinadas;


    /*
     * Aleatoriedad.
     */

    if (
        sesion.aleatorio !== false
    ) {

        mezclarArray(
            preguntas
        );

    }


    /*
     * Limitar número de preguntas.
     */

    const numeroPreguntas =
        Number(
            sesion.numeroPreguntas
        );


    if (
        Number.isInteger(
            numeroPreguntas
        ) &&
        numeroPreguntas > 0 &&
        preguntas.length >
            numeroPreguntas
    ) {

        preguntas =
            preguntas.slice(
                0,
                numeroPreguntas
            );

    }


    /*
     * Reiniciar estado.
     */

    reiniciarEstadoEstudio();


    /*
     * Hemos terminado de cargar.
     */

    estadoElemento.style.display =
        "none";


    actualizarEstadisticas();


    /*
     * Primera pregunta.
     */

    indice =
        0;


    mostrarPregunta();

}


/* ========================================================
   CARGAR PREGUNTAS DE UN CAPÍTULO
   ======================================================== */

async function cargarPreguntasAntiguo() {

    /*
     * Los tests antiguos SIEMPRE utilizan
     * modo estudio.
     */

    configurarModoEstudio();


    /*
     * archivoDatos:
     *
     * constitucion/titulo-i.json
     *
     * Ruta:
     *
     * data/constitucion/titulo-i.json
     */

    asignaturaElemento.textContent =
        obtenerNombreAsignatura(
            archivoDatos
        );


    const ruta =
        `data/${archivoDatos}`;


    console.log(
        "Cargando capítulo:",
        ruta
    );


    const respuesta =
        await fetch(
            ruta
        );


    if (!respuesta.ok) {

        throw new Error(
            `No se ha podido cargar ${ruta}`
        );

    }


    preguntas =
        await respuesta.json();


    if (
        !Array.isArray(
            preguntas
        ) ||
        preguntas.length === 0
    ) {

        throw new Error(
            "El archivo JSON no contiene preguntas."
        );

    }


    /*
     * Reiniciar sistema de estudio.
     */

    reiniciarEstadoEstudio();


    estadoElemento.style.display =
        "none";


    indice =
        0;


    actualizarEstadisticas();


    mostrarPregunta();


    /*
     * SÍ mostramos el listado en capítulos.
     */

    mostrarListado();

}


/* ========================================================
   MOSTRAR PREGUNTA
   ======================================================== */

function mostrarPregunta(
    pregunta = null,
    esRepeticion = false
) {

    /*
     * Si no se proporciona una pregunta,
     * obtenemos la siguiente mediante el
     * sistema de selección.
     */

    if (!pregunta) {

        pregunta =
            obtenerSiguientePregunta();


        if (!pregunta) {

            finalizarTest();

            return;

        }


        esRepeticion =
            esPreguntaPendiente(
                pregunta
            );

    }


    /*
     * Guardar estado actual.
     */

    preguntaActual =
        pregunta;


    preguntaActualEsRepeticion =
        esRepeticion;


    /*
     * Mostrar pregunta.
     */

    preguntaElemento.textContent =
        pregunta.pregunta;


    opcionesElemento.innerHTML =
        "";


    /*
     * Crear opciones.
     */

    pregunta.opciones.forEach(
        (
            opcion,
            posicion
        ) => {

            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "option";


            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "radio";


            input.name =
                "opcion";


            input.value =
                posicion;


            label.appendChild(
                input
            );


            label.appendChild(
                document.createTextNode(
                    " " +
                    opcion
                )
            );


            opcionesElemento.appendChild(
                label
            );

        }
    );


    /*
     * Limpiar resultado anterior.
     */

    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * El botón vuelve a "Corregir".
     */

    estadoBoton =
        "corregir";


    botonTest.textContent =
        "Corregir";

}


/* ========================================================
   OBTENER SIGUIENTE PREGUNTA
   ======================================================== */

function obtenerSiguientePregunta() {

    /*
     * ====================================================
     * MODO EXAMEN
     * ====================================================
     *
     * No existen repeticiones.
     */

    if (!modoEstudio) {

        if (
            indice >=
            preguntas.length
        ) {

            return null;

        }


        const siguiente =
            preguntas[indice];


        indice++;


        preguntasNormalesMostradas++;


        ultimaPreguntaFueRepeticion =
            false;


        return siguiente;

    }


    /*
     * ====================================================
     * MODO ESTUDIO
     * ====================================================
     */


    /*
     * Buscar preguntas de repaso que
     * ya hayan cumplido su intervalo.
     */

    const repeticionesDisponibles =
        obtenerRepeticionesDisponibles();


    /*
     * Si existen repasos disponibles y
     * todavía podemos intercalar preguntas normales.
     */

    if (
        repeticionesDisponibles.length > 0 &&
        !(
            ultimaPreguntaFueRepeticion &&
            indice < preguntas.length
        )
    ) {

        const candidatos =
            repeticionesDisponibles.filter(
                pregunta =>
                    pregunta !==
                    preguntaActual
            );


        const lista =
            candidatos.length > 0
                ? candidatos
                : repeticionesDisponibles;


        const repeticion =
            obtenerElementoAleatorio(
                lista
            );


        ultimaPreguntaFueRepeticion =
            true;


        return repeticion;

    }


    /*
     * ====================================================
     * PREGUNTAS NORMALES
     * ====================================================
     */

    if (
        indice <
        preguntas.length
    ) {

        const siguiente =
            preguntas[indice];


        indice++;


        preguntasNormalesMostradas++;


        ultimaPreguntaFueRepeticion =
            false;


        return siguiente;

    }


    /*
     * ====================================================
     * FIN DE LAS PREGUNTAS NORMALES
     * ====================================================
     */

    const pendientes =
        obtenerPreguntasPendientes();


    if (
        pendientes.length > 0
    ) {

        const candidatos =
            pendientes.filter(
                pregunta =>
                    pregunta !==
                    preguntaActual
            );


        const lista =
            candidatos.length > 0
                ? candidatos
                : pendientes;


        const repeticion =
            obtenerElementoAleatorio(
                lista
            );


        ultimaPreguntaFueRepeticion =
            true;


        return repeticion;

    }


    /*
     * No quedan preguntas.
     */

    return null;

}


/* ========================================================
   OBTENER REPETICIONES DISPONIBLES
   ======================================================== */

function obtenerRepeticionesDisponibles() {

    const resultado =
        [];


    estadoPreguntasEstudio.forEach(
        (
            estado,
            pregunta
        ) => {

            /*
             * Si ya está repasada,
             * no vuelve a aparecer.
             */

            if (
                !estado.pendiente
            ) {

                return;

            }


            /*
             * La repetición puede aparecer
             * cuando se ha alcanzado la posición
             * programada.
             */

            if (
                preguntasNormalesMostradas >=
                estado.proximaRepeticionEn
            ) {

                resultado.push(
                    pregunta
                );

            }

        }
    );


    return resultado;

}


/* ========================================================
   OBTENER PREGUNTAS PENDIENTES
   ======================================================== */

function obtenerPreguntasPendientes() {

    const resultado =
        [];


    estadoPreguntasEstudio.forEach(
        (
            estado,
            pregunta
        ) => {

            if (
                estado.pendiente
            ) {

                resultado.push(
                    pregunta
                );

            }

        }
    );


    return resultado;

}


/* ========================================================
   COMPROBAR SI UNA PREGUNTA ESTÁ PENDIENTE
   ======================================================== */

function esPreguntaPendiente(
    pregunta
) {

    const estado =
        estadoPreguntasEstudio.get(
            pregunta
        );


    return Boolean(
        estado &&
        estado.pendiente
    );

}


/* ========================================================
   CREAR ESTADO DE UNA PREGUNTA FALLADA
   ======================================================== */

function crearEstadoPregunta(
    pregunta
) {

    const estado = {

        aciertosConsecutivos:
            0,

        pendiente:
            true,

        proximaRepeticionEn:
            calcularProximaRepeticion()

    };


    estadoPreguntasEstudio.set(
        pregunta,
        estado
    );


    return estado;

}


/* ========================================================
   CALCULAR PRÓXIMA REPETICIÓN
   ======================================================== */

function calcularProximaRepeticion() {

    const intervalo =
        Math.floor(
            Math.random() *
            (
                INTERVALO_REPETICION_MAX -
                INTERVALO_REPETICION_MIN +
                1
            )
        ) +
        INTERVALO_REPETICION_MIN;


    return (
        preguntasNormalesMostradas +
        intervalo
    );

}


/* ========================================================
   PROCESAR RESULTADO EN MODO ESTUDIO
   ======================================================== */

function procesarResultadoEstudio(
    pregunta,
    esCorrecta,
    eraRepeticion
) {

    /*
     * ====================================================
     * PRIMERA APARICIÓN
     * ====================================================
     */

    if (!eraRepeticion) {

        /*
         * Si se acierta a la primera:
         *
         * no necesita ningún repaso.
         */

        if (
            esCorrecta
        ) {

            return;

        }


        /*
         * Si falla:
         *
         * entra en modo repaso.
         */

        crearEstadoPregunta(
            pregunta
        );


        return;

    }


    /*
     * ====================================================
     * REPETICIÓN
     * ====================================================
     */

    const estado =
        estadoPreguntasEstudio.get(
            pregunta
        );


    if (!estado) {

        return;

    }


    /*
     * ====================================================
     * RESPUESTA CORRECTA
     * ====================================================
     */

    if (
        esCorrecta
    ) {

        estado.aciertosConsecutivos++;


        /*
         * DOS ACIERTOS CONSECUTIVOS:
         *
         * Pregunta repasada dentro del test.
         *
         * IMPORTANTE:
         *
         * Esto NO significa que esté dominada
         * a nivel histórico.
         */

        if (
            estado.aciertosConsecutivos >=
            2
        ) {

            estado.pendiente =
                false;


            return;

        }


        /*
         * Solo lleva un acierto.
         */

        estado.proximaRepeticionEn =
            calcularProximaRepeticion();


        return;

    }


    /*
     * ====================================================
     * RESPUESTA INCORRECTA
     * ====================================================
     *
     * Se rompe la racha.
     */

    estado.aciertosConsecutivos =
        0;


    /*
     * Vuelve a necesitar DOS ACIERTOS
     * CONSECUTIVOS.
     */

    estado.proximaRepeticionEn =
        calcularProximaRepeticion();

}


/* ========================================================
   CORREGIR / SIGUIENTE
   ======================================================== */

function corregirRespuesta() {

    /*
     * Si ya hemos corregido:
     *
     * el botón funciona como "Siguiente".
     */

    if (
        estadoBoton ===
        "siguiente"
    ) {

        siguientePregunta();

        return;

    }


    /*
     * Obtener respuesta seleccionada.
     */

    const seleccion =
        document.querySelector(
            'input[name="opcion"]:checked'
        );


    if (!seleccion) {

        resultadoElemento.textContent =
            "⚠️ Selecciona una respuesta.";


        resultadoElemento.className =
            "";


        return;

    }


    /*
     * Guardamos la pregunta que se está
     * corrigiendo.
     */

    const preguntaQueSeCorrige =
        preguntaActual;


    const posicionSeleccionada =
        Number(
            seleccion.value
        );


    const respuestaSeleccionada =
        preguntaQueSeCorrige.opciones[
            posicionSeleccionada
        ];


    /*
     * Todas las opciones.
     */

    const opciones =
        document.querySelectorAll(
            'input[name="opcion"]'
        );


    /*
     * Comprobar respuesta.
     */

    const esCorrecta =
        respuestaSeleccionada ===
        preguntaQueSeCorrige.respuesta;


    /*
     * ====================================================
     * CORRECTA
     * ====================================================
     */

    if (esCorrecta) {

        aciertos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "correcta"
            );

    }


    /*
     * ====================================================
     * INCORRECTA
     * ====================================================
     */

    else {

        fallos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "incorrecta"
            );


        /*
         * Marcar también la respuesta correcta.
         */

        opciones.forEach(
            input => {

                const posicion =
                    Number(
                        input.value
                    );


                if (
                    preguntaQueSeCorrige.opciones[
                        posicion
                    ] ===
                    preguntaQueSeCorrige.respuesta
                ) {

                    input
                        .parentElement
                        .classList.add(
                            "correcta"
                        );

                }

            }
        );

    }


    /*
     * ====================================================
     * GUARDAR EN HISTORIAL PERMANENTE
     * ====================================================
     *
     * Este registro es independiente del sistema
     * de repaso del test.
     *
     * Cada respuesta cuenta como un intento histórico.
     */

    registrarResultadoHistorial(
        preguntaQueSeCorrige,
        esCorrecta
    );


    /*
     * ====================================================
     * PROCESAR MODO ESTUDIO
     * ====================================================
     */

    if (
        modoEstudio
    ) {

        procesarResultadoEstudio(
            preguntaQueSeCorrige,
            esCorrecta,
            preguntaActualEsRepeticion
        );

    }


    /*
     * No mostramos texto de correcto/incorrecto.
     *
     * La información se muestra mediante colores.
     */

    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * Actualizar estadísticas del test.
     */

    actualizarEstadisticas();


    /*
     * Desactivar opciones.
     */

    opciones.forEach(
        input => {

            input.disabled =
                true;

        }
    );


    /*
     * Cambiar botón.
     */

    estadoBoton =
        "siguiente";


    botonTest.textContent =
        "Siguiente";

}


/* ========================================================
   SIGUIENTE PREGUNTA
   ======================================================== */

function siguientePregunta() {

    const siguiente =
        obtenerSiguientePregunta();


    if (
        siguiente
    ) {

        mostrarPregunta(
            siguiente,
            ultimaPreguntaFueRepeticion
        );


        return;

    }


    /*
     * No quedan preguntas normales
     * ni preguntas pendientes.
     */

    finalizarTest();

}


/* ========================================================
   FINALIZAR TEST
   ======================================================== */

function finalizarTest() {

    resultadoElemento.textContent =
        "🎉 Has terminado el test.";


    resultadoElemento.className =
        "";


    actualizarEstadisticas();


    estadoBoton =
        "finalizado";


    botonTest.textContent =
        "Terminado";


    botonTest.disabled =
        true;

}


/* ========================================================
   MEZCLAR ARRAY
   ======================================================== */

function mezclarArray(
    array
) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            array[i],
            array[j]
        ] =
        [
            array[j],
            array[i]
        ];

    }


    return array;

}


/* ========================================================
   ELEMENTO ALEATORIO
   ======================================================== */

function obtenerElementoAleatorio(
    array
) {

    if (
        !array ||
        array.length === 0
    ) {

        return null;

    }


    const indiceAleatorio =
        Math.floor(
            Math.random() *
            array.length
        );


    return array[
        indiceAleatorio
    ];

}


/* ========================================================
   ESTADÍSTICAS DEL TEST
   ========================================================

   Estas estadísticas siguen siendo exclusivamente
   las del TEST ACTUAL.

   El historial de rendimiento es independiente.
   ======================================================== */

function actualizarEstadisticas() {

    if (!estadisticasElemento) {

        return;

    }


    const porcentaje =
        respondidas > 0

            ? Math.round(
                (
                    aciertos /
                    respondidas
                ) * 100
            )

            : 0;


    estadisticasElemento.textContent =
        `✅ Aciertos: ${aciertos} | ` +
        `❌ Fallos: ${fallos} | ` +
        `🎯 Porcentaje: ${porcentaje}% | ` +
        `📋 Total: ${preguntas.length} preguntas`;

}


/* ========================================================
   REINICIAR ESTADÍSTICAS DEL TEST
   ========================================================

   IMPORTANTE:

   Reiniciar un test NO borra el historial permanente.

   El historial de rendimiento se conserva.
   ======================================================== */

function reiniciarEstadisticas() {

    aciertos =
        0;


    fallos =
        0;


    respondidas =
        0;


    /*
     * Reiniciar completamente
     * el sistema de repaso.
     */

    reiniciarEstadoEstudio();


    /*
     * Volver a habilitar el botón.
     */

    botonTest.disabled =
        false;


    estadoBoton =
        "corregir";


    actualizarEstadisticas();


    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * Volver a la primera pregunta.
     */

    indice =
        0;


    /*
     * Si es una sesión aleatoria,
     * volver a mezclar.
     */

    if (idSesion) {

        const sesion =
            obtenerSesionActual();


        if (
            sesion &&
            sesion.aleatorio !== false
        ) {

            mezclarArray(
                preguntas
            );

        }

    }


    mostrarPregunta();

}


/* ========================================================
   LISTADO DE PREGUNTAS
   ======================================================== */

function mostrarListado() {

    /*
     * Nunca mostramos listado en sesiones.
     */

    if (idSesion) {

        return;

    }


    if (!listaPreguntasElemento) {

        return;

    }


    listaPreguntasElemento.innerHTML =
        "";


    preguntas.forEach(
        pregunta => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "pregunta-listado";


            /*
             * PREGUNTA
             */

            const preguntaTexto =
                document.createElement(
                    "div"
                );


            preguntaTexto.className =
                "pregunta-listado-texto";


            preguntaTexto.textContent =
                pregunta.pregunta;


            /*
             * RESPUESTA
             */

            const respuestaTexto =
                document.createElement(
                    "div"
                );


            respuestaTexto.className =
                "respuesta-listado";


            respuestaTexto.textContent =
                pregunta.respuesta;


            /*
             * Texto utilizado por el buscador.
             */

            elemento.dataset.busqueda =
                (
                    pregunta.pregunta +
                    " " +
                    pregunta.respuesta
                ).toLowerCase();


            /*
             * Añadir elementos.
             */

            elemento.appendChild(
                preguntaTexto
            );


            elemento.appendChild(
                respuestaTexto
            );


            listaPreguntasElemento.appendChild(
                elemento
            );

        }
    );

}


/* ========================================================
   BUSCADOR
   ======================================================== */

function filtrarPreguntas() {

    if (!buscador) {

        return;

    }


    const texto =
        buscador.value
            .trim()
            .toLowerCase();


    const elementos =
        listaPreguntasElemento
            .querySelectorAll(
                ".pregunta-listado"
            );


    elementos.forEach(
        elemento => {

            const contenido =
                elemento.dataset.busqueda ||
                "";


            const coincide =
                contenido.includes(
                    texto
                );


            elemento.style.display =
                coincide
                    ? ""
                    : "none";

        }
    );

}


/* ========================================================
   NOMBRE DEL CAPÍTULO
   ======================================================== */

function obtenerNombreAsignatura(
    nombreArchivo
) {

    const partes =
        nombreArchivo.split("/");


    const carpeta =
        partes[0] || "";


    const archivo =
        partes[
            partes.length - 1
        ] || "";


    /*
     * Nombre de la asignatura.
     */

    let nombreAsignatura =
        carpeta;


    if (
        carpeta.toLowerCase() ===
        "constitucion"
    ) {

        nombreAsignatura =
            "Constitución Española";

    }


    /*
     * Nombre del capítulo.
     */

    let nombreCapitulo =
        archivo
            .replace(
                /\.json$/i,
                ""
            )
            .replace(
                /[-_]+/g,
                " "
            );


    /*
     * Nombres especiales.
     */

    if (
        nombreCapitulo.toLowerCase() ===
        "preambulo"
    ) {

        nombreCapitulo =
            "Preámbulo";

    }


    else {

        nombreCapitulo =
            nombreCapitulo
                .replace(
                    /\b\w/g,
                    letra =>
                        letra.toUpperCase()
                );

    }


    return (
        nombreAsignatura +
        " - " +
        nombreCapitulo
    );

}


/* ========================================================
   EVENTOS
   ======================================================== */

if (botonTest) {

    botonTest.addEventListener(
        "click",
        corregirRespuesta
    );

}


if (reiniciar) {

    reiniciar.addEventListener(
        "click",
        reiniciarEstadisticas
    );

}


if (buscador) {

    buscador.addEventListener(
        "input",
        filtrarPreguntas
    );

}


/* ========================================================
   INICIAR
   ======================================================== */

/*
 * Cargar primero el historial permanente.
 *
 * Esto NO modifica el test actual.
 */

cargarHistorialRendimiento();


/*
 * Configurar listado.
 */

configurarListado();


/*
 * Cargar preguntas.
 */

cargarPreguntas();
