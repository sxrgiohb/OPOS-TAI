/* ========================================================
   TEST.JS
   Sistema de tests + sesiones + modo estudio
   Compatible con:
   - test.html actual
   - estadisticas.js actual
   ======================================================== */


/* ========================================================
   VARIABLES PRINCIPALES
   ======================================================== */

let preguntas = [];

let indice = 0;


/* ========================================================
   ESTADO DEL BOTÓN
   ========================================================

   corregir  → todavía no se ha corregido
   siguiente → ya se ha corregido
   finalizado → test terminado
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
   PARÁMETROS DE URL
   ======================================================== */

const parametros =
    new URLSearchParams(
        window.location.search
    );


const idSesion =
    parametros.get("sesion");


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
   MODO ESTUDIO
   ======================================================== */

const MODO_ESTUDIO_POR_DEFECTO =
    true;


let modoEstudio =
    MODO_ESTUDIO_POR_DEFECTO;


/* ========================================================
   PREGUNTA ACTUAL
   ======================================================== */

let preguntaActual =
    null;


/*
 * Indica si la pregunta actual procede
 * del sistema de repaso.
 */

let preguntaActualEsRepeticion =
    false;


/*
 * Número de preguntas normales mostradas.
 *
 * Las repeticiones no incrementan este contador.
 */

let preguntasNormalesMostradas =
    0;


/*
 * Indica si la última pregunta fue una repetición.
 */

let ultimaPreguntaFueRepeticion =
    false;


/* ========================================================
   ESTADO DEL SISTEMA DE REPASO
   ======================================================== */

let estadoPreguntasEstudio =
    new Map();


/*
 * Número mínimo y máximo de preguntas normales
 * antes de repetir una pregunta fallada.
 */

const INTERVALO_REPETICION_MIN =
    3;


const INTERVALO_REPETICION_MAX =
    7;


/* ========================================================
   UTILIDADES
   ======================================================== */


/*
 * Normaliza una ruta.
 *
 * Ejemplos:
 *
 * constitucion/titulo-i/archivo.json
 *
 * /constitucion/titulo-i/archivo.json
 *
 * data/constitucion/titulo-i/archivo.json
 *
 * devuelven una ruta válida relativa a /data.
 */

function normalizarRutaDatos(
    ruta
) {

    if (!ruta) {

        return "";

    }


    let resultado =
        String(ruta)
            .trim()
            .replace(/\\/g, "/");


    resultado =
        resultado.replace(
            /^\/+/,
            ""
        );


    resultado =
        resultado.replace(
            /^data\//i,
            ""
        );


    if (
        !/\.json$/i.test(
            resultado
        )
    ) {

        resultado += ".json";

    }


    return resultado;

}


/*
 * Codifica cada parte de una ruta
 * sin convertir "/" en "%2F".
 */

function codificarRuta(
    ruta
) {

    return ruta
        .split("/")
        .filter(
            parte =>
                parte !== ""
        )
        .map(
            parte =>
                encodeURIComponent(
                    parte
                )
        )
        .join("/");

}


/*
 * Carga un JSON.
 */

async function cargarJSON(
    ruta
) {

    const respuesta =
        await fetch(
            ruta,
            {
                cache: "no-store"
            }
        );


    if (!respuesta.ok) {

        throw new Error(
            `No se ha podido cargar ${ruta} (${respuesta.status}).`
        );

    }


    try {

        return await respuesta.json();

    }

    catch (error) {

        throw new Error(
            `El archivo ${ruta} no contiene un JSON válido.`
        );

    }

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
        !Array.isArray(array) ||
        array.length === 0
    ) {

        return null;

    }


    return array[
        Math.floor(
            Math.random() *
            array.length
        )
    ];

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
   OBTENER SESIÓN ACTUAL
   ======================================================== */

function obtenerSesionActual() {

    if (!idSesion) {

        return null;

    }


    return obtenerSesiones().find(
        sesion =>
            String(
                sesion.id
            ) ===
            String(
                idSesion
            )
    ) || null;

}


/* ========================================================
   CONFIGURAR MODO ESTUDIO
   ======================================================== */

function configurarModoEstudio(
    sesion = null
) {

    /*
     * Los capítulos funcionan siempre
     * en modo estudio.
     */

    if (!idSesion) {

        modoEstudio = true;

        return;

    }


    /*
     * En las sesiones se respeta
     * la configuración guardada.
     */

    modoEstudio =
        sesion?.modoEstudio === true;

}


/* ========================================================
   REINICIAR ESTADO DEL REPASO
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

        if (idSesion) {

            await cargarPreguntasDeSesion();

            return;

        }


        if (archivoDatos) {

            await cargarPreguntasAntiguo();

            return;

        }


        throw new Error(
            "No se ha indicado ninguna sesión ni ningún capítulo."
        );

    }

    catch (error) {

        console.error(
            "ERROR CARGANDO EL TEST:",
            error
        );


        mostrarError(
            error.message
        );

    }

}


/* ========================================================
   MOSTRAR ERROR
   ======================================================== */

function mostrarError(
    mensaje
) {

    if (estadoElemento) {

        estadoElemento.style.display =
            "block";


        estadoElemento.textContent =
            "❌ " +
            mensaje;

    }


    if (preguntaElemento) {

        preguntaElemento.textContent =
            "No se ha podido cargar el test.";

    }


    if (opcionesElemento) {

        opcionesElemento.innerHTML =
            "";

    }


    if (botonTest) {

        botonTest.disabled =
            true;

    }

}


/* ========================================================
   CARGAR SESIÓN
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
        Array.isArray(
            sesion.capitulos
        )
            ? sesion.capitulos
            : [];


    if (capitulos.length === 0) {

        throw new Error(
            "La sesión no tiene contenidos seleccionados."
        );

    }


    configurarModoEstudio(
        sesion
    );


    if (asignaturaElemento) {

        asignaturaElemento.textContent =
            sesion.nombre ||
            "Sesión personalizada";

    }


    if (estadoElemento) {

        estadoElemento.style.display =
            "block";

        estadoElemento.textContent =
            "Cargando preguntas...";

    }


    let preguntasCombinadas =
        [];


    /*
     * ====================================================
     * CARGAR TODOS LOS CAPÍTULOS
     * ====================================================
     */

    for (
        const capitulo of capitulos
    ) {

        let ruta =
            capitulo?.ruta;


        /*
         * Compatibilidad con sesiones antiguas.
         */

        if (
            !ruta &&
            capitulo?.asignatura &&
            capitulo?.archivo
        ) {

            ruta =
                `${capitulo.asignatura}/${capitulo.archivo}`;

        }


        if (!ruta) {

            console.warn(
                "Contenido sin ruta:",
                capitulo
            );

            continue;

        }


        ruta =
            normalizarRutaDatos(
                ruta
            );


        const rutaCodificada =
            codificarRuta(
                ruta
            );


        const url =
            `data/${rutaCodificada}`;


        console.log(
            "Sesión → cargando:",
            url
        );


        const preguntasArchivo =
            await cargarJSON(
                url
            );


        if (
            !Array.isArray(
                preguntasArchivo
            )
        ) {

            throw new Error(
                `El archivo ${url} no contiene un array de preguntas.`
            );

        }


        preguntasCombinadas =
            preguntasCombinadas.concat(
                preguntasArchivo
            );

    }


    if (
        preguntasCombinadas.length === 0
    ) {

        throw new Error(
            "No se han encontrado preguntas en la sesión."
        );

    }


    preguntas =
        preguntasCombinadas;


    /*
     * Mezclar sesión.
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


    prepararTest();

}


/* ========================================================
   OBTENER NOMBRE DE RUTA COMPLETA
   ======================================================== */

async function obtenerNombreRutaCompleta(
    nombreArchivo
) {

    const rutaNormalizada =
        normalizarRutaDatos(
            nombreArchivo
        );


    const partes =
        rutaNormalizada
            .split("/")
            .filter(Boolean);


    const asignatura =
        partes.shift();


    if (!asignatura) {

        return "Test";

    }


    const archivoBuscado =
        partes[
            partes.length - 1
        ];


    const archivoSinExtension =
        String(
            archivoBuscado || ""
        )
        .replace(
            /\.json$/i,
            ""
        );


    const rutaConfig =
        `data/${encodeURIComponent(
            asignatura
        )}/config.json`;


    let configuracion;


    try {

        configuracion =
            await cargarJSON(
                rutaConfig
            );

    }

    catch (error) {

        console.warn(
            "No se pudo cargar config.json:",
            error
        );


        return asignatura;

    }


    function buscarArchivo(
        elementos,
        rutaAcumulada = []
    ) {

        if (
            !Array.isArray(
                elementos
            )
        ) {

            return null;

        }


        for (
            const elemento of elementos
        ) {

            if (
                !elemento ||
                typeof elemento !==
                    "object"
            ) {

                continue;

            }


            /*
             * Si encontramos un archivo,
             * comprobar si coincide.
             */

            if (
                elemento.archivo
            ) {

                const archivoElemento =
                    String(
                        elemento.archivo
                    )
                    .replace(
                        /\.json$/i,
                        ""
                    );


                if (
                    archivoElemento ===
                    archivoSinExtension
                ) {

                    return [

                        ...rutaAcumulada,

                        elemento.nombre ||
                        elemento.titulo ||
                        elemento.id ||
                        archivoElemento

                    ];

                }

            }


            /*
             * Buscar en contenido.
             */

            if (
                Array.isArray(
                    elemento.contenido
                )
            ) {

                const resultado =
                    buscarArchivo(
                        elemento.contenido,
                        [
                            ...rutaAcumulada,

                            elemento.nombre ||
                            elemento.titulo ||
                            elemento.id ||
                            "Sin nombre"

                        ]
                    );


                if (resultado) {

                    return resultado;

                }

            }

        }


        return null;

    }


    const nombresRuta =
        buscarArchivo(
            configuracion.contenido ||
            configuracion.capitulos ||
            [],
            []
        );


    return [

        configuracion.nombre ||
        configuracion.titulo ||
        asignatura,

        ...(nombresRuta || [])

    ].join(
        " - "
    );

}


/* ========================================================
   CARGAR CAPÍTULO
   ======================================================== */

async function cargarPreguntasAntiguo() {

    configurarModoEstudio();


    if (asignaturaElemento) {

        try {

            asignaturaElemento.textContent =
                await obtenerNombreRutaCompleta(
                    archivoDatos
                );

        }

        catch (error) {

            console.warn(
                "No se pudo obtener el nombre:",
                error
            );


            asignaturaElemento.textContent =
                "Test";

        }

    }


    const ruta =
        normalizarRutaDatos(
            archivoDatos
        );


    const rutaCodificada =
        codificarRuta(
            ruta
        );


    const url =
        `data/${rutaCodificada}`;


    console.log(
        "Capítulo → cargando:",
        url
    );


    preguntas =
        await cargarJSON(
            url
        );


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


    prepararTest();


    /*
     * El listado solamente se muestra
     * en capítulos.
     */

    mostrarListado();

}


/* ========================================================
   PREPARAR TEST
   ======================================================== */

function prepararTest() {

    reiniciarEstadoEstudio();


    indice =
        0;


    aciertos =
        0;


    fallos =
        0;


    respondidas =
        0;


    estadoBoton =
        "corregir";


    if (botonTest) {

        botonTest.disabled =
            false;

        botonTest.textContent =
            "Corregir";

    }


    if (estadoElemento) {

        estadoElemento.style.display =
            "none";

    }


    actualizarEstadisticas();


    mostrarPregunta();

}


/* ========================================================
   VALIDAR PREGUNTA
   ======================================================== */

function validarPregunta(
    pregunta
) {

    if (
        !pregunta ||
        typeof pregunta !==
            "object"
    ) {

        throw new Error(
            "Una pregunta no tiene un formato válido."
        );

    }


    if (
        typeof pregunta.pregunta !==
            "string"
    ) {

        throw new Error(
            "Una pregunta no contiene el campo 'pregunta'."
        );

    }


    if (
        !Array.isArray(
            pregunta.opciones
        )
    ) {

        throw new Error(
            "Una pregunta no contiene el campo 'opciones'."
        );

    }


    if (
        pregunta.opciones.length === 0
    ) {

        throw new Error(
            "Una pregunta no contiene opciones."
        );

    }


    if (
        typeof pregunta.respuesta ===
            "undefined"
    ) {

        throw new Error(
            "Una pregunta no contiene el campo 'respuesta'."
        );

    }


    return true;

}


/* ========================================================
   MOSTRAR PREGUNTA
   ======================================================== */

function mostrarPregunta(
    pregunta = null,
    esRepeticion = false
) {

    /*
     * Si no se proporciona pregunta,
     * obtener la siguiente.
     */

    if (!pregunta) {

        pregunta =
            obtenerSiguientePregunta();


        if (!pregunta) {

            finalizarTest();

            return;

        }


        esRepeticion =
            preguntaActualEsRepeticion;

    }


    validarPregunta(
        pregunta
    );


    preguntaActual =
        pregunta;


    preguntaActualEsRepeticion =
        Boolean(
            esRepeticion
        );


    /*
     * Mostrar pregunta.
     */

    if (preguntaElemento) {

        preguntaElemento.textContent =
            pregunta.pregunta;

    }


    if (!opcionesElemento) {

        throw new Error(
            "No se ha encontrado #opciones en test.html."
        );

    }


    opcionesElemento.innerHTML =
        "";


    /*
     * Copiar y mezclar opciones.
     */

    const opcionesMezcladas =
        [
            ...pregunta.opciones
        ];


    mezclarArray(
        opcionesMezcladas
    );


    /*
     * Crear radios.
     */

    opcionesMezcladas.forEach(
        opcion => {

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


            /*
             * MUY IMPORTANTE:
             *
             * El valor es el texto de la opción.
             *
             * Tu JSON utiliza:
             *
             * "respuesta": "..."
             *
             * y "opciones": ["...", "..."]
             */

            input.value =
                String(
                    opcion
                );


            label.appendChild(
                input
            );


            label.appendChild(
                document.createTextNode(
                    " " +
                    String(
                        opcion
                    )
                )
            );


            opcionesElemento.appendChild(
                label
            );

        }
    );


    /*
     * Limpiar resultado.
     */

    if (resultadoElemento) {

        resultadoElemento.textContent =
            "";

        resultadoElemento.className =
            "";

    }


    estadoBoton =
        "corregir";


    if (botonTest) {

        botonTest.disabled =
            false;

        botonTest.textContent =
            "Corregir";

    }

}


/* ========================================================
   ESTADÍSTICAS GLOBALES
   ======================================================== */

function estaDominada(
    pregunta
) {

    if (
        !pregunta ||
        !pregunta.id
    ) {

        return false;

    }


    if (
        typeof estaPreguntaDominada !==
            "function"
    ) {

        return false;

    }


    return estaPreguntaDominada(
        pregunta.id
    );

}


/* ========================================================
   OBTENER SIGUIENTE PREGUNTA
   ======================================================== */

function obtenerSiguientePregunta() {

    /*
     * ====================================================
     * MODO EXAMEN
     * ====================================================
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


        preguntaActualEsRepeticion =
            false;


        return siguiente;

    }


    /*
     * ====================================================
     * MODO ESTUDIO
     * ====================================================
     */

    const repeticiones =
        obtenerRepeticionesDisponibles();


    /*
     * No poner dos repeticiones consecutivas
     * si todavía quedan preguntas normales.
     */

    if (
        repeticiones.length > 0 &&
        !(
            ultimaPreguntaFueRepeticion &&
            indice <
                preguntas.length
        )
    ) {

        let candidatos =
            repeticiones.filter(
                pregunta =>
                    pregunta !==
                    preguntaActual
            );


        if (
            candidatos.length === 0
        ) {

            candidatos =
                repeticiones;

        }


        const repeticion =
            obtenerElementoAleatorio(
                candidatos
            );


        ultimaPreguntaFueRepeticion =
            true;


        preguntaActualEsRepeticion =
            true;


        return repeticion;

    }


    /*
     * ====================================================
     * PREGUNTA NORMAL
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


        preguntaActualEsRepeticion =
            false;


        return siguiente;

    }


    /*
     * ====================================================
     * YA NO QUEDAN NORMALES
     * ====================================================
     */

    const pendientes =
        obtenerPreguntasPendientes();


    if (
        pendientes.length > 0
    ) {

        let candidatos =
            pendientes.filter(
                pregunta =>
                    pregunta !==
                    preguntaActual
            );


        if (
            candidatos.length === 0
        ) {

            candidatos =
                pendientes;

        }


        const repeticion =
            obtenerElementoAleatorio(
                candidatos
            );


        ultimaPreguntaFueRepeticion =
            true;


        preguntaActualEsRepeticion =
            true;


        return repeticion;

    }


    /*
     * No queda nada.
     */

    return null;

}


/* ========================================================
   REPETICIONES DISPONIBLES
   ======================================================== */

function obtenerRepeticionesDisponibles() {

    const resultado =
        [];


    estadoPreguntasEstudio.forEach(
        (
            estado,
            pregunta
        ) => {

            if (
                !estado ||
                !estado.pendiente
            ) {

                return;

            }


            /*
             * Si ya está dominada globalmente,
             * eliminarla del repaso.
             */

            if (
                estaDominada(
                    pregunta
                )
            ) {

                estado.pendiente =
                    false;


                return;

            }


            /*
             * ¿Ha llegado su momento?
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
   PREGUNTAS PENDIENTES
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
                !estado ||
                !estado.pendiente
            ) {

                return;

            }


            if (
                estaDominada(
                    pregunta
                )
            ) {

                estado.pendiente =
                    false;


                return;

            }


            resultado.push(
                pregunta
            );

        }
    );


    return resultado;

}


/* ========================================================
   CREAR ESTADO DE PREGUNTA FALLADA
   ======================================================== */

function crearEstadoPregunta(
    pregunta
) {

    /*
     * Si ya está dominada,
     * no necesita repaso.
     */

    if (
        estaDominada(
            pregunta
        )
    ) {

        return null;

    }


    /*
     * Si ya existe estado,
     * no lo sobrescribimos.
     */

    const existente =
        estadoPreguntasEstudio.get(
            pregunta
        );


    if (existente) {

        return existente;

    }


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
   PROCESAR RESULTADO DEL MODO ESTUDIO
   ======================================================== */

function procesarResultadoEstudio(
    pregunta,
    esCorrecta,
    eraRepeticion
) {

    /*
     * Primera aparición.
     */

    if (!eraRepeticion) {

        if (esCorrecta) {

            return;

        }


        crearEstadoPregunta(
            pregunta
        );


        return;

    }


    /*
     * Repetición.
     */

    const estado =
        estadoPreguntasEstudio.get(
            pregunta
        );


    if (!estado) {

        return;

    }


    /*
     * Correcta.
     */

    if (esCorrecta) {

        estado.aciertosConsecutivos++;


        /*
         * Dos aciertos consecutivos:
         * deja de estar pendiente.
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
     * Incorrecta:
     * romper la racha.
     */

    estado.aciertosConsecutivos =
        0;


    estado.proximaRepeticionEn =
        calcularProximaRepeticion();

}


/* ========================================================
   CORREGIR RESPUESTA
   ======================================================== */

function corregirRespuesta() {

    /*
     * El botón ya está en Siguiente.
     */

    if (
        estadoBoton ===
        "siguiente"
    ) {

        siguientePregunta();

        return;

    }


    /*
     * Si terminó el test,
     * no hacer nada.
     */

    if (
        estadoBoton ===
        "finalizado"
    ) {

        return;

    }


    if (!preguntaActual) {

        return;

    }


    /*
     * Buscar respuesta seleccionada.
     */

    const seleccion =
        document.querySelector(
            'input[name="opcion"]:checked'
        );


    if (!seleccion) {

        if (resultadoElemento) {

            resultadoElemento.textContent =
                "⚠️ Selecciona una respuesta.";

        }


        return;

    }


    const pregunta =
        preguntaActual;


    const respuestaSeleccionada =
        String(
            seleccion.value
        );


    const respuestaCorrecta =
        String(
            pregunta.respuesta
        );


    const esCorrecta =
        respuestaSeleccionada ===
        respuestaCorrecta;


    const opciones =
        document.querySelectorAll(
            'input[name="opcion"]'
        );


    /*
     * ====================================================
     * CORRECTA
     * ====================================================
     */

    if (esCorrecta) {

        aciertos++;


        respondidas++;


        if (
            seleccion.parentElement
        ) {

            seleccion
                .parentElement
                .classList.add(
                    "correcta"
                );

        }

    }


    /*
     * ====================================================
     * INCORRECTA
     * ====================================================
     */

    else {

        fallos++;


        respondidas++;


        if (
            seleccion.parentElement
        ) {

            seleccion
                .parentElement
                .classList.add(
                    "incorrecta"
                );

        }


        /*
         * Marcar la correcta.
         */

        opciones.forEach(
            input => {

                if (
                    String(
                        input.value
                    ) ===
                    respuestaCorrecta
                ) {

                    if (
                        input.parentElement
                    ) {

                        input
                            .parentElement
                            .classList.add(
                                "correcta"
                            );

                    }

                }

            }
        );

    }


    /*
     * ====================================================
     * ESTADÍSTICAS PERMANENTES
     * ====================================================
     */

    if (
        pregunta.id &&
        typeof registrarRespuestaPregunta ===
            "function"
    ) {

        registrarRespuestaPregunta(
            pregunta.id,
            esCorrecta
        );

    }


    /*
     * ====================================================
     * MODO ESTUDIO
     * ====================================================
     */

    if (
        modoEstudio
    ) {

        procesarResultadoEstudio(
            pregunta,
            esCorrecta,
            preguntaActualEsRepeticion
        );

    }


    /*
     * No mostrar "Correcto" / "Incorrecto".
     *
     * El resultado se muestra mediante colores.
     */

    if (resultadoElemento) {

        resultadoElemento.textContent =
            "";

        resultadoElemento.className =
            "";

    }


    /*
     * Actualizar estadísticas.
     */

    actualizarEstadisticas();


    /*
     * Desactivar radios.
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


    if (botonTest) {

        botonTest.textContent =
            "Siguiente";

    }

}


/* ========================================================
   SIGUIENTE PREGUNTA
   ======================================================== */

function siguientePregunta() {

    const siguiente =
        obtenerSiguientePregunta();


    if (!siguiente) {

        finalizarTest();

        return;

    }


    mostrarPregunta(
        siguiente,
        preguntaActualEsRepeticion
    );

}


/* ========================================================
   FINALIZAR TEST
   ======================================================== */

function finalizarTest() {

    if (resultadoElemento) {

        resultadoElemento.textContent =
            "🎉 Has terminado el test.";

        resultadoElemento.className =
            "";

    }


    actualizarEstadisticas();


    estadoBoton =
        "finalizado";


    if (botonTest) {

        botonTest.textContent =
            "Terminado";

        botonTest.disabled =
            true;

    }

}


/* ========================================================
   ESTADÍSTICAS DEL TEST ACTUAL
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
   REINICIAR TEST
   ======================================================== */

function reiniciarEstadisticas() {

    aciertos =
        0;


    fallos =
        0;


    respondidas =
        0;


    reiniciarEstadoEstudio();


    indice =
        0;


    estadoBoton =
        "corregir";


    if (botonTest) {

        botonTest.disabled =
            false;

        botonTest.textContent =
            "Corregir";

    }


    if (resultadoElemento) {

        resultadoElemento.textContent =
            "";

        resultadoElemento.className =
            "";

    }


    /*
     * En sesiones aleatorias,
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


    actualizarEstadisticas();


    mostrarPregunta();

}


/* ========================================================
   LISTADO DE PREGUNTAS
   ======================================================== */

function mostrarListado() {

    /*
     * Las sesiones NO muestran listado.
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
             * =================================================
             * ESTADO
             * =================================================
             */

            const cabecera =
                document.createElement(
                    "div"
                );


            cabecera.className =
                "pregunta-listado-cabecera";


            const estado =
                document.createElement(
                    "div"
                );


            estado.className =
                "estado-pregunta";


            let informacion =
                null;


            if (
                pregunta.id &&
                typeof obtenerEstadoDominioPregunta ===
                    "function"
            ) {

                informacion =
                    obtenerEstadoDominioPregunta(
                        pregunta.id
                    );

            }


            const intentos =
                Number(
                    informacion?.intentos
                ) || 0;


            const porcentaje =
                Number(
                    informacion?.porcentaje
                ) || 0;


            let textoEstado;

            let claseEstado;


            if (
                intentos === 0
            ) {

                textoEstado =
                    "SIN DATOS";

                claseEstado =
                    "sin-datos";

            }

            else if (
                informacion?.dominada === true
            ) {

                textoEstado =
                    "DOMINADA";

                claseEstado =
                    "dominada";

            }

            else if (
                intentos < 20 ||
                porcentaje < 50
            ) {

                textoEstado =
                    "DÉBIL";

                claseEstado =
                    "debil";

            }

            else if (
                porcentaje < 75
            ) {

                textoEstado =
                    "EN PROGRESO";

                claseEstado =
                    "en-progreso";

            }

            else {

                textoEstado =
                    "BUEN DOMINIO";

                claseEstado =
                    "buen-dominio";

            }


            estado.classList.add(
                claseEstado
            );


            estado.appendChild(
                document.createTextNode(
                    textoEstado
                )
            );


            /*
             * IMPORTANTE:
             *
             * El HTML utiliza .circulo-estado.
             */

            const circulo =
                document.createElement(
                    "span"
                );


            circulo.className =
                "circulo-estado";


            estado.appendChild(
                circulo
            );


            cabecera.appendChild(
                estado
            );


            elemento.appendChild(
                cabecera
            );


            /*
             * =================================================
             * PREGUNTA
             * =================================================
             */

            const preguntaTexto =
                document.createElement(
                    "div"
                );


            preguntaTexto.className =
                "pregunta-listado-texto";


            preguntaTexto.textContent =
                pregunta.pregunta;


            elemento.appendChild(
                preguntaTexto
            );


            /*
             * =================================================
             * RESPUESTA
             * =================================================
             */

            const respuestaTexto =
                document.createElement(
                    "div"
                );


            respuestaTexto.className =
                "respuesta-listado";


            respuestaTexto.textContent =
                pregunta.respuesta;


            elemento.appendChild(
                respuestaTexto
            );


            /*
             * =================================================
             * BUSCADOR
             * =================================================
             */

            elemento.dataset.busqueda =
                (
                    String(
                        pregunta.pregunta
                    ) +
                    " " +
                    String(
                        pregunta.respuesta
                    )
                ).toLowerCase();


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

    if (
        !buscador ||
        !listaPreguntasElemento
    ) {

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


            elemento.style.display =
                contenido.includes(
                    texto
                )
                    ? ""
                    : "none";

        }
    );

}


/* ========================================================
   CONFIGURAR VISIBILIDAD DEL LISTADO
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
     * En sesiones se oculta completamente.
     */

    if (idSesion) {

        listadoCard.style.display =
            "none";

    }

    else {

        listadoCard.style.display =
            "";

    }

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
   INICIALIZACIÓN
   ======================================================== */

configurarListado();


cargarPreguntas();
