let preguntas = [];
let indice = 0;

/*
 * ========================================================
 * ESTADO DEL BOTÓN DEL TEST
 * ========================================================
 *
 * "corregir"  → todavía no hemos corregido
 * "siguiente" → ya hemos corregido y esperamos al usuario
 */

let estadoBoton = "corregir";


/*
 * ========================================================
 * ESTADÍSTICAS DEL TEST ACTUAL
 * ========================================================
 */

let aciertos = 0;
let fallos = 0;
let respondidas = 0;


/*
 * ========================================================
 * CONFIGURACIÓN
 * ========================================================
 */

const CLAVE_SESIONES =
    "opos_tai_sesiones";


/*
 * ========================================================
 * HISTORIAL DE RENDIMIENTO
 * ========================================================
 *
 * Aquí se guarda el historial permanente de cada pregunta.
 *
 * IMPORTANTE:
 *
 * El historial NO pertenece al test actual.
 *
 * Es independiente de:
 *
 * - aciertos del test
 * - fallos del test
 * - preguntas mostradas
 * - repeticiones
 *
 * Por tanto, una pregunta puede acumular cientos de
 * respuestas a lo largo del tiempo.
 *
 * Ejemplo:
 *
 * {
 *     "pre-001": {
 *
 *         historial: [
 *
 *             {
 *                 correcto: true,
 *                 fecha: 1754930000000
 *             },
 *
 *             {
 *                 correcto: false,
 *                 fecha: 1754930100000
 *             }
 *
 *         ]
 *
 *     }
 * }
 */


/*
 * Clave utilizada en localStorage.
 */

const CLAVE_HISTORIAL_RENDIMIENTO =
    "opos_tai_historial_rendimiento";


/*
 * Número de respuestas que utilizaremos
 * para calcular el rendimiento reciente.
 *
 * Se puede modificar en el futuro.
 *
 * Ejemplo:
 *
 * 100 → últimas 100 respuestas
 * 50  → últimas 50 respuestas
 * 200 → últimas 200 respuestas
 */

const VENTANA_RENDIMIENTO =
    100;


/*
 * Número mínimo de intentos necesarios
 * para poder considerar una pregunta dominada.
 *
 * IMPORTANTE:
 *
 * Aunque una pregunta tenga un 100 % de aciertos,
 * NO podrá considerarse dominada antes de alcanzar
 * estos intentos mínimos.
 */

const INTENTOS_MINIMOS_DOMINIO =
    20;


/*
 * Porcentaje mínimo necesario para considerar
 * que una pregunta está dominada.
 *
 * De momento lo dejamos en 90 %.
 *
 * Podremos cambiarlo posteriormente.
 */

const PORCENTAJE_DOMINIO =
    90;


/*
 * ========================================================
 * MODO ESTUDIO
 * ========================================================
 *
 * Los tests normales que se abren mediante ?datos=
 * SIEMPRE funcionan en modo estudio.
 *
 * En las sesiones:
 *
 * modoEstudio: true  → modo estudio
 * modoEstudio: false → modo examen
 *
 *
 * Una pregunta fallada entra en el sistema de repaso.
 *
 * El criterio de dominio definitivo se modificará
 * posteriormente para utilizar el historial de rendimiento.
 */

const MODO_ESTUDIO_POR_DEFECTO =
    true;


/*
 * ========================================================
 * INTERVALOS DE REPETICIÓN
 * ========================================================
 *
 * Las preguntas de repaso nunca se muestran
 * inmediatamente después de fallarlas.
 *
 * Se espera un número aleatorio de preguntas
 * normales antes de volver a mostrarlas.
 */

const INTERVALO_REPETICION_MIN =
    3;

const INTERVALO_REPETICION_MAX =
    7;


/*
 * ========================================================
 * PARÁMETROS DE URL
 * ========================================================
 */

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


/*
 * ========================================================
 * ELEMENTOS DEL HTML
 * ========================================================
 */

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


/*
 * ========================================================
 * ESTADO DEL MODO ESTUDIO
 * ========================================================
 */

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
 *
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


/*
 * ========================================================
 * ESTADO DE LAS PREGUNTAS EN REPASO
 * ========================================================
 */

let estadoPreguntasEstudio =
    new Map();


/*
 * ========================================================
 * HISTORIAL DE RENDIMIENTO EN MEMORIA
 * ========================================================
 *
 * Contiene el historial cargado desde localStorage.
 *
 * La estructura es:
 *
 * {
 *     [idPregunta]: {
 *
 *         historial: [
 *             {
 *                 correcto: true,
 *                 fecha: 123456789
 *             }
 *         ]
 *
 *     }
 * }
 */

let historialRendimiento =
    {};


/*
 * ========================================================
 * CARGAR HISTORIAL DE RENDIMIENTO
 * ========================================================
 */

function cargarHistorialRendimiento() {

    const datos =
        localStorage.getItem(
            CLAVE_HISTORIAL_RENDIMIENTO
        );


    /*
     * Si todavía no existe historial,
     * comenzamos con un objeto vacío.
     */

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


        /*
         * Comprobamos que realmente sea
         * un objeto válido.
         */

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


/*
 * ========================================================
 * GUARDAR HISTORIAL DE RENDIMIENTO
 * ========================================================
 */

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


/*
 * ========================================================
 * OBTENER ID DE UNA PREGUNTA
 * ========================================================
 *
 * Todas las preguntas nuevas deberían tener:
 *
 * "id": "pre-001"
 *
 * Si por cualquier motivo encontramos una pregunta
 * sin ID, devolvemos null.
 */

function obtenerIdPregunta(
    pregunta
) {

    if (
        !pregunta ||
        pregunta.id === undefined ||
        pregunta.id === null
    ) {

        return null;

    }


    const id =
        String(
            pregunta.id
        ).trim();


    if (!id) {

        return null;

    }


    return id;

}


/*
 * ========================================================
 * OBTENER HISTORIAL DE UNA PREGUNTA
 * ========================================================
 */

function obtenerHistorialPregunta(
    pregunta
) {

    const id =
        obtenerIdPregunta(
            pregunta
        );


    /*
     * Sin ID no podemos asociar
     * correctamente el historial.
     */

    if (!id) {

        return [];

    }


    /*
     * Si todavía no existe historial
     * para esta pregunta, devolvemos vacío.
     */

    if (
        !historialRendimiento[id]
    ) {

        return [];

    }


    if (
        !Array.isArray(
            historialRendimiento[id].historial
        )
    ) {

        return [];

    }


    return historialRendimiento[id].historial;

}


/*
 * ========================================================
 * REGISTRAR RESPUESTA DE UNA PREGUNTA
 * ========================================================
 *
 * Cada respuesta genera una entrada permanente.
 *
 * Ejemplo:
 *
 * {
 *     correcto: true,
 *     fecha: 1754930000000
 * }
 */

function registrarRespuestaPregunta(
    pregunta,
    esCorrecta
) {

    const id =
        obtenerIdPregunta(
            pregunta
        );


    /*
     * Si no tiene ID no podemos guardar
     * el rendimiento individual.
     */

    if (!id) {

        console.warn(
            "La pregunta no tiene ID. No se puede guardar su historial:",
            pregunta
        );


        return;

    }


    /*
     * Crear estructura de la pregunta
     * si todavía no existe.
     */

    if (
        !historialRendimiento[id]
    ) {

        historialRendimiento[id] = {

            historial: []

        };

    }


    if (
        !Array.isArray(
            historialRendimiento[id].historial
        )
    ) {

        historialRendimiento[id].historial =
            [];

    }


    /*
     * Añadir la respuesta al historial.
     */

    historialRendimiento[id].historial.push({

        correcto:
            Boolean(
                esCorrecta
            ),

        fecha:
            Date.now()

    });


    /*
     * Guardar inmediatamente.
     *
     * Así no perdemos la respuesta si el usuario
     * abandona el test después.
     */

    guardarHistorialRendimiento();

}


/*
 * ========================================================
 * OBTENER ÚLTIMAS RESPUESTAS
 * ========================================================
 *
 * Devuelve como máximo las últimas
 * VENTANA_RENDIMIENTO respuestas.
 */

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

        return [];

    }


    return historial.slice(
        -VENTANA_RENDIMIENTO
    );

}


/*
 * ========================================================
 * OBTENER NÚMERO TOTAL DE INTENTOS
 * ========================================================
 */

function obtenerIntentosPregunta(
    pregunta
) {

    const historial =
        obtenerHistorialPregunta(
            pregunta
        );


    return historial.length;

}


/*
 * ========================================================
 * OBTENER NÚMERO TOTAL DE ACIERTOS
 * ========================================================
 */

function obtenerAciertosPregunta(
    pregunta
) {

    const historial =
        obtenerHistorialPregunta(
            pregunta
        );


    return historial.filter(
        respuesta =>
            respuesta.correcto === true
    ).length;

}


/*
 * ========================================================
 * OBTENER RENDIMIENTO RECIENTE
 * ========================================================
 *
 * El porcentaje se calcula únicamente
 * sobre las últimas VENTANA_RENDIMIENTO respuestas.
 *
 * Ejemplo:
 *
 * VENTANA_RENDIMIENTO = 100
 *
 * 90 aciertos de las últimas 100
 * → 90 %
 */

function calcularRendimientoReciente(
    pregunta
) {

    const historialReciente =
        obtenerRendimientoReciente(
            pregunta
        );


    if (
        historialReciente.length === 0
    ) {

        return 0;

    }


    const aciertosRecientes =
        historialReciente.filter(
            respuesta =>
                respuesta.correcto === true
        ).length;


    return Math.round(
        (
            aciertosRecientes /
            historialReciente.length
        ) * 100
    );

}


/*
 * ========================================================
 * OBTENER NÚMERO DE RESPUESTAS RECIENTES
 * ========================================================
 */

function obtenerIntentosRecientes(
    pregunta
) {

    return obtenerRendimientoReciente(
        pregunta
    ).length;

}


/*
 * ========================================================
 * COMPROBAR SI UNA PREGUNTA PUEDE ESTAR DOMINADA
 * ========================================================
 *
 * NOTA:
 *
 * Esta función ya utiliza:
 *
 * - mínimo 20 intentos
 * - rendimiento reciente
 *
 * Más adelante conectaremos esta función
 * directamente con el sistema de repaso.
 */

function estaPreguntaDominada(
    pregunta
) {

    const intentos =
        obtenerIntentosPregunta(
            pregunta
        );


    /*
     * Menos de 20 intentos:
     *
     * nunca puede estar dominada.
     */

    if (
        intentos <
        INTENTOS_MINIMOS_DOMINIO
    ) {

        return false;

    }


    const rendimiento =
        calcularRendimientoReciente(
            pregunta
        );


    return (
        rendimiento >=
        PORCENTAJE_DOMINIO
    );

}


/*
 * ========================================================
 * CONFIGURAR LISTADO
 * ========================================================
 */

function configurarListado() {

    /*
     * Si no existe el listado en el HTML,
     * no hacemos nada.
     */

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


/*
 * ========================================================
 * OBTENER SESIONES
 * ========================================================
 */

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


/*
 * ========================================================
 * BUSCAR SESIÓN ACTUAL
 * ========================================================
 */

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


/*
 * ========================================================
 * CONFIGURAR MODO ESTUDIO
 * ========================================================
 */

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


/*
 * ========================================================
 * REINICIAR ESTADO DEL MODO ESTUDIO
 * ========================================================
 */

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


/*
 * ========================================================
 * CARGAR PREGUNTAS
 * ========================================================
 */

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


/*
 * ========================================================
 * CARGAR PREGUNTAS DE UNA SESIÓN
 * ========================================================
 */

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


/*
 * ========================================================
 * CARGAR PREGUNTAS DE UN CAPÍTULO
 * ========================================================
 */

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


/*
 * ========================================================
 * MOSTRAR PREGUNTA
 * ========================================================
 */

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


/*
 * ========================================================
 * OBTENER SIGUIENTE PREGUNTA
 * ========================================================
 */

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
     * todavía podemos intercalar preguntas normales,
     * escogemos uno aleatoriamente.
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

        /*
         * Intentar evitar repetir inmediatamente
         * la misma pregunta.
         */

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


/*
 * ========================================================
 * OBTENER REPETICIONES DISPONIBLES
 * ========================================================
 */

function obtenerRepeticionesDisponibles() {

    const resultado =
        [];


    estadoPreguntasEstudio.forEach(
        (
            estado,
            pregunta
        ) => {

            /*
             * Si ya está dominada,
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


/*
 * ========================================================
 * OBTENER PREGUNTAS PENDIENTES
 * ========================================================
 */

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


/*
 * ========================================================
 * COMPROBAR SI UNA PREGUNTA ESTÁ PENDIENTE
 * ========================================================
 */

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


/*
 * ========================================================
 * CREAR ESTADO DE UNA PREGUNTA FALLADA
 * ========================================================
 */

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


/*
 * ========================================================
 * CALCULAR PRÓXIMA REPETICIÓN
 * ========================================================
 */

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


/*
 * ========================================================
 * PROCESAR RESULTADO EN MODO ESTUDIO
 * ========================================================
 */

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
         * Por ahora mantenemos la antigua
         * regla de dos aciertos consecutivos.
         *
         * En el siguiente cambio sustituiremos
         * esta regla por el sistema de dominio
         * basado en historial.
         */

        if (
            estado.aciertosConsecutivos >=
            2
        ) {

            estado.pendiente =
                false;


            return;

        }


        estado.proximaRepeticionEn =
            calcularProximaRepeticion();


        return;

    }


    /*
     * ====================================================
     * RESPUESTA INCORRECTA
     * ====================================================
     */

    estado.aciertosConsecutivos =
        0;


    estado.proximaRepeticionEn =
        calcularProximaRepeticion();

}


/*
 * ========================================================
 * CORREGIR / SIGUIENTE
 * ========================================================
 */

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
     * REGISTRAR EN EL HISTORIAL
     * ====================================================
     *
     * Esto se hace tanto si acertamos como si fallamos.
     *
     * El historial es independiente de las estadísticas
     * del test actual.
     */

    registrarRespuestaPregunta(
        preguntaQueSeCorrige,
        esCorrecta
    );


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
     */

    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * Actualizar estadísticas.
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


/*
 * ========================================================
 * SIGUIENTE PREGUNTA
 * ========================================================
 */

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


/*
 * ========================================================
 * FINALIZAR TEST
 * ========================================================
 */

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


/*
 * ========================================================
 * MEZCLAR ARRAY
 * ========================================================
 */

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


/*
 * ========================================================
 * ELEMENTO ALEATORIO
 * ========================================================
 */

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


/*
 * ========================================================
 * ESTADÍSTICAS DEL TEST
 * ========================================================
 *
 * Estas estadísticas siguen representando
 * EXCLUSIVAMENTE el test actual.
 *
 * No se mezclan con el historial permanente.
 */

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


/*
 * ========================================================
 * REINICIAR ESTADÍSTICAS
 * ========================================================
 */

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
     *
     * IMPORTANTE:
     *
     * NO borramos el historial de rendimiento.
     *
     * Reiniciar un test NO debe borrar
     * el conocimiento acumulado de las preguntas.
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


/*
 * ========================================================
 * LISTADO DE PREGUNTAS
 * ========================================================
 */

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


/*
 * ========================================================
 * BUSCADOR
 * ========================================================
 */

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


/*
 * ========================================================
 * NOMBRE DEL CAPÍTULO
 * ========================================================
 */

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


/*
 * ========================================================
 * INICIALIZAR HISTORIAL
 * ========================================================
 *
 * Lo hacemos antes de cargar las preguntas.
 */

cargarHistorialRendimiento();


/*
 * ========================================================
 * EVENTOS
 * ========================================================
 */

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


/*
 * ========================================================
 * INICIAR
 * ========================================================
 */

configurarListado();

cargarPreguntas();
