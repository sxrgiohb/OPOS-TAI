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
 * ESTADÍSTICAS
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
 * MODO ESTUDIO
 * ========================================================
 *
 * Los tests normales que se abren mediante ?datos=
 * SIEMPRE funcionan en modo estudio.
 *
 * En las sesiones:
 *
 *   modoEstudio: true  → modo estudio
 *   modoEstudio: false → modo examen
 *
 *
 * Una pregunta fallada entra en el sistema de repaso.
 *
 * Para considerar que una pregunta está dominada
 * debe conseguir DOS ACIERTOS CONSECUTIVOS.
 *
 * Si falla durante el repaso:
 *
 *   aciertos consecutivos → 0
 *
 * y vuelve a necesitar dos aciertos consecutivos.
 */


/*
 * Por defecto:
 *
 * Los tests que NO son sesiones utilizan
 * siempre modo estudio.
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
 *
 * Ejemplo:
 *
 *   P1 ❌
 *   P2
 *   P3
 *   P4
 *   P5
 *   P1 🔁
 *
 * El intervalo concreto es aleatorio.
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


/*
 * Indica si el test actual utiliza modo estudio.
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
 *
 * Por tanto, si el test tiene 50 preguntas:
 *
 *   preguntasNormalesMostradas = 50
 *
 * aunque se hayan mostrado 70 preguntas
 * contando los repasos.
 */

let preguntasNormalesMostradas =
    0;


/*
 * Indica si la última pregunta mostrada
 * fue una repetición.
 *
 * Sirve para impedir que dos preguntas
 * de repaso aparezcan consecutivamente
 * mientras todavía quedan preguntas normales.
 */

let ultimaPreguntaFueRepeticion =
    false;


/*
 * ========================================================
 * ESTADO DE LAS PREGUNTAS EN REPASO
 * ========================================================
 *
 * Cada pregunta fallada tendrá un objeto como:
 *
 * {
 *     aciertosConsecutivos: 0,
 *     pendiente: true,
 *     proximaRepeticionEn: 8
 * }
 *
 *
 * "aciertosConsecutivos":
 *
 *   0 → no ha conseguido ningún acierto consecutivo
 *   1 → ha acertado una vez
 *   2 → DOMINADA
 *
 *
 * Cuando se alcanza 2:
 *
 *   pendiente = false
 *
 *
 * Si falla:
 *
 *   aciertosConsecutivos = 0
 *
 * y vuelve a necesitar dos aciertos seguidos.
 */

let estadoPreguntasEstudio =
    new Map();


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
     *
     * true  → modo estudio
     * false → modo examen
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
     *
     * IMPORTANTE:
     *
     * Este número representa las preguntas
     * DIFERENTES del test.
     *
     * Las repeticiones no se añaden al array.
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
     *
     * Nunca mostramos dos repeticiones seguidas
     * mientras queden preguntas normales.
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
     *
     * Aquí cambia la regla:
     *
     * Si ya no quedan preguntas normales,
     * mostramos las preguntas pendientes aunque
     * todavía no hayan alcanzado su intervalo.
     *
     * Si hay varias, se escoge aleatoriamente.
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
 *
 * Primera vez que se falla:
 *
 *   aciertosConsecutivos = 0
 *   pendiente = true
 *
 * Se programa su primera repetición.
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
         *
         * Necesitará dos aciertos consecutivos.
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
         * Pregunta dominada.
         *
         * Se elimina del sistema de repaso.
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
         *
         * Hay que conseguir otro acierto
         * consecutivo.
         *
         * Por tanto, programamos otra aparición.
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
     * CONSECUTIVOS desde cero.
     *
     * Por tanto, programamos una nueva
     * repetición.
     */

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
     *
     * La información se muestra mediante colores.
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
 * ESTADÍSTICAS
 * ========================================================
 *
 * NO SE MODIFICA LA LÓGICA EXISTENTE.
 *
 * "Total" continúa representando:
 *
 *   número de preguntas DIFERENTES
 *
 * y no el número total de apariciones.
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
