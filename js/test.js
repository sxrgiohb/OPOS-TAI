let preguntas = [];
let indice = 0;


/* ========================================================
ESTADO DEL BOTÓN DEL TEST

"corregir"  → todavía no hemos corregido
"siguiente" → ya hemos corregido y esperamos al usuario
"finalizado" → el test ha terminado
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

const MODO_ESTUDIO_POR_DEFECTO =
    true;


let modoEstudio =
    MODO_ESTUDIO_POR_DEFECTO;


/*
 * Pregunta actualmente mostrada.
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


/* ========================================================
ESTADO DE LAS PREGUNTAS EN REPASO
======================================================== */

let estadoPreguntasEstudio =
    new Map();


/*
 * Las preguntas falladas no aparecen inmediatamente.
 *
 * Se espera un número aleatorio de preguntas
 * normales antes de volver a mostrarlas.
 */

const INTERVALO_REPETICION_MIN =
    3;


const INTERVALO_REPETICION_MAX =
    7;


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
     * El listado es únicamente consultivo
     * para los capítulos, no para sesiones.
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
            String(sesion.id) ===
            String(idSesion)
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
            MODO_ESTUDIO_POR_DEFECTO;

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
            "Error cargando preguntas:",
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


    /*
     * Comprobar que existe la sesión.
     */

    if (!sesion) {

        throw new Error(
            "No se ha encontrado la sesión."
        );

    }


    /*
     * Obtener los contenidos seleccionados.
     */

    const capitulos =
        Array.isArray(sesion.capitulos)
            ? sesion.capitulos
            : [];


    if (capitulos.length === 0) {

        throw new Error(
            "La sesión no tiene contenidos seleccionados."
        );

    }


    /*
     * Configurar modo de estudio.
     */

    configurarModoEstudio(
        sesion
    );


    /*
     * Mostrar nombre de la sesión.
     */

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


    /*
     * Aquí se almacenarán todas las preguntas
     * procedentes de los contenidos seleccionados.
     */

    let preguntasCombinadas =
        [];


    /*
     * ====================================================
     * CARGAR CADA CONTENIDO
     * ====================================================
     */

    for (
        const capitulo of capitulos
    ) {

        /*
         * ------------------------------------------------
         * DETERMINAR LA RUTA
         * ------------------------------------------------
         *
         * Formato nuevo:
         *
         * ruta:
         * "constitucion/titulo-i/capitulo-1.json"
         *
         * Formato antiguo:
         *
         * asignatura:
         * "constitucion"
         *
         * archivo:
         * "capitulo-1.json"
         */

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


        /*
         * Comprobar ruta.
         */

        if (!ruta) {

            console.warn(
                "Contenido de sesión sin ruta válida:",
                capitulo
            );

            continue;

        }


        /*
         * Limpiar barras iniciales.
         */

        ruta =
            String(ruta)
                .trim()
                .replace(/^\/+/, "");


        /*
         * Asegurar extensión JSON.
         */

        if (
            !/\.json$/i.test(ruta)
        ) {

            ruta += ".json";

        }


        /*
         * Codificar cada parte de la ruta.
         */

        const rutaCodificada =
            ruta
                .split("/")
                .filter(
                    parte => parte !== ""
                )
                .map(
                    parte =>
                        encodeURIComponent(
                            parte
                        )
                )
                .join("/");


        /*
         * Ruta final dentro de /data.
         */

        const url =
            `data/${rutaCodificada}`;


        console.log(
            "Sesión → cargando:",
            url
        );


        /*
         * FETCH
         */

        let respuesta;

        try {

            respuesta =
                await fetch(
                    url,
                    {
                        cache: "no-store"
                    }
                );

        }

        catch (error) {

            console.error(
                "Error haciendo fetch de:",
                url,
                error
            );

            throw new Error(
                `Error al cargar ${url}. Comprueba que el archivo existe.`
            );

        }


        /*
         * Comprobar respuesta HTTP.
         */

        if (!respuesta.ok) {

            console.error(
                "Respuesta HTTP incorrecta:",
                respuesta.status,
                respuesta.statusText,
                url
            );


            throw new Error(
                `No se ha podido cargar ${url} ` +
                `(${respuesta.status}).`
            );

        }


        /*
         * Leer JSON.
         */

        let preguntasArchivo;

        try {

            preguntasArchivo =
                await respuesta.json();

        }

        catch (error) {

            console.error(
                "El archivo no contiene JSON válido:",
                url,
                error
            );

            throw new Error(
                `El archivo ${url} no contiene un JSON válido.`
            );

        }


        /*
         * Comprobar estructura.
         */

        if (
            !Array.isArray(
                preguntasArchivo
            )
        ) {

            console.error(
                `El archivo ${url} no contiene un array:`,
                preguntasArchivo
            );

            throw new Error(
                `El archivo ${url} no contiene un array de preguntas.`
            );

        }


        /*
         * Añadir preguntas.
         */

        preguntasCombinadas =
            preguntasCombinadas.concat(
                preguntasArchivo
            );

    }


    /*
     * Comprobar que hay preguntas.
     */

    if (
        preguntasCombinadas.length === 0
    ) {

        throw new Error(
            "No se han encontrado preguntas en los contenidos seleccionados."
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
     * Reiniciar estado del test.
     */

    reiniciarEstadoEstudio();


    /*
     * Reiniciar estadísticas del test.
     */

    aciertos = 0;
    fallos = 0;
    respondidas = 0;


    /*
     * Ocultar mensaje de carga.
     */

    if (estadoElemento) {

        estadoElemento.style.display =
            "none";

    }


    /*
     * Actualizar estadísticas.
     */

    actualizarEstadisticas();


    /*
     * Mostrar primera pregunta.
     */

    indice =
        0;


    mostrarPregunta();

}


/* ========================================================
OBTENER NOMBRE DE LA RUTA COMPLETA
========================================================

Ejemplo:

datos =
"test-flou/bloque-1-tema-1"

config.json:

Test FLOU
└── Bloque I
    └── Tema 1
        └── archivo: "bloque-1-tema-1"

Resultado:

"Test FLOU - Bloque I - Tema 1"

El sistema permite niveles infinitos.
======================================================== */

async function obtenerNombreRutaCompleta(
    nombreArchivo
) {

    const partes =
        String(nombreArchivo)
            .split("/")
            .filter(Boolean);


    /*
     * Primera parte:
     *
     * ID de la asignatura.
     */

    const asignatura =
        partes.shift();


    if (!asignatura) {

        return "Test";

    }


    /*
     * Las partes restantes forman
     * la ruta hasta el archivo.
     */

    const rutaArchivo =
        partes;


    /*
     * Cargar config.json.
     */

    const rutaConfig =
        `data/${encodeURIComponent(asignatura)}/config.json`;


    const respuesta =
        await fetch(
            rutaConfig,
            {
                cache: "no-store"
            }
        );


    if (!respuesta.ok) {

        throw new Error(
            `No se ha podido cargar ${rutaConfig}`
        );

    }


    const configuracion =
        await respuesta.json();


    /*
     * Buscar archivo recursivamente.
     */

    function buscarArchivo(
        elementos,
        rutaAcumulada
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

            /*
             * Documento.
             */

            if (
                elemento &&
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


                const archivoBuscado =
                    String(
                        rutaArchivo[
                            rutaArchivo.length - 1
                        ] || ""
                    )
                        .replace(
                            /\.json$/i,
                            ""
                        );


                if (
                    archivoElemento ===
                    archivoBuscado
                ) {

                    return [
                        ...rutaAcumulada,
                        elemento.nombre ||
                        elemento.id ||
                        archivoElemento
                    ];

                }

            }


            /*
             * Subcolección.
             */

            if (
                elemento &&
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


    /*
     * Buscar desde la raíz de config.json.
     */

    const nombresRuta =
        buscarArchivo(
            configuracion.contenido || [],
            []
        );


    /*
     * Construir título.
     */

    const resultado = [

        configuracion.nombre ||
        asignatura,

        ...(nombresRuta || [])

    ];


    return resultado.join(
        " - "
    );

}


/* ========================================================
CARGAR PREGUNTAS DE UN CAPÍTULO
======================================================== */

async function cargarPreguntasAntiguo() {

    /*
     * Los tests antiguos siempre utilizan
     * modo estudio.
     */

    configurarModoEstudio();


    /*
     * Mostrar asignatura y capítulo.
     */

    if (asignaturaElemento) {

        asignaturaElemento.textContent =
            await obtenerNombreRutaCompleta(
                archivoDatos
            );

    }


    /*
     * Ruta del JSON.
     */

    const ruta =
        `data/${archivoDatos}`;


    console.log(
        "Cargando capítulo:",
        ruta
    );


    const respuesta =
        await fetch(
            ruta,
            {
                cache: "no-store"
            }
        );


    if (!respuesta.ok) {

        throw new Error(
            `No se ha podido cargar ${ruta}`
        );

    }


    try {

        preguntas =
            await respuesta.json();

    }

    catch (error) {

        throw new Error(
            `El archivo ${ruta} no contiene un JSON válido.`
        );

    }


    /*
     * Comprobar preguntas.
     */

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


    /*
     * Reiniciar estadísticas del test.
     */

    aciertos = 0;
    fallos = 0;
    respondidas = 0;


    if (estadoElemento) {

        estadoElemento.style.display =
            "none";

    }


    indice =
        0;


    actualizarEstadisticas();


    mostrarPregunta();


    /*
     * Mostrar listado en capítulos.
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
     * obtenemos la siguiente.
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
     * Comprobar estructura.
     */

    if (
        !pregunta ||
        typeof pregunta !== "object"
    ) {

        console.error(
            "Pregunta inválida:",
            pregunta
        );


        throw new Error(
            "La pregunta no tiene un formato válido."
        );

    }


    if (
        typeof pregunta.pregunta !== "string" ||
        !pregunta.pregunta.trim()
    ) {

        console.error(
            "La pregunta no tiene el campo 'pregunta':",
            pregunta
        );


        throw new Error(
            "Una pregunta del JSON no contiene el campo 'pregunta'."
        );

    }


    if (
        !Array.isArray(
            pregunta.opciones
        )
    ) {

        console.error(
            "La pregunta no tiene un array 'opciones':",
            pregunta
        );


        throw new Error(
            "Una pregunta del JSON no contiene el campo 'opciones'."
        );

    }


    if (
        pregunta.opciones.length === 0
    ) {

        throw new Error(
            "Una pregunta no contiene opciones de respuesta."
        );

    }


    if (
        typeof pregunta.respuesta !== "string"
    ) {

        throw new Error(
            "Una pregunta no contiene una respuesta válida."
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

    if (preguntaElemento) {

        preguntaElemento.textContent =
            pregunta.pregunta;

    }


    if (!opcionesElemento) {

        return;

    }


    opcionesElemento.innerHTML =
        "";


    /*
     * Mezclar respuestas.
     *
     * Se utiliza una COPIA para no modificar
     * el JSON original.
     */

    const opcionesMezcladas =
        [
            ...pregunta.opciones
        ];


    mezclarArray(
        opcionesMezcladas
    );


    /*
     * Crear opciones.
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


            input.value =
                opcion;


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

    if (resultadoElemento) {

        resultadoElemento.textContent =
            "";


        resultadoElemento.className =
            "";

    }


    /*
     * Botón vuelve a "Corregir".
     */

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
CONSULTA LAS ESTADÍSTICAS PERMANENTES

La función estaPreguntaDominada()
pertenece a estadisticas.js.
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

        console.warn(
            "No se ha encontrado estaPreguntaDominada(). Comprueba que estadisticas.js se carga antes que test.js."
        );


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

    const repeticionesDisponibles =
        obtenerRepeticionesDisponibles();


    /*
     * Si existen repasos disponibles,
     * intercalarlos con preguntas normales.
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
             * Si está DOMINADA a nivel global,
             * ya no necesita aparecer como repaso.
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
             * Comprobar si ha llegado
             * su momento de repetición.
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
                !estado.pendiente
            ) {

                return;

            }


            /*
             * Una pregunta DOMINADA deja de estar
             * pendiente incluso si fue fallada
             * anteriormente en este test.
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


            resultado.push(
                pregunta
            );

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

    /*
     * Si ya está DOMINADA a nivel global,
     * no necesitamos crear un estado de repaso.
     */

    if (
        estaDominada(
            pregunta
        )
    ) {

        return null;

    }


    /*
     * Si ya existe un estado,
     * no lo sobrescribimos innecesariamente.
     */

    if (
        estadoPreguntasEstudio.has(
            pregunta
        )
    ) {

        return estadoPreguntasEstudio.get(
            pregunta
        );

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
         * no necesita repaso.
         */

        if (
            esCorrecta
        ) {

            return;

        }


        /*
         * Si falla:
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
         * La pregunta deja de estar pendiente
         * dentro de este test.
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
     */

    estado.aciertosConsecutivos =
        0;


    estado.proximaRepeticionEn =
        calcularProximaRepeticion();

}


/* ========================================================
CORREGIR / SIGUIENTE
======================================================== */

function corregirRespuesta() {

    /*
     * Si ya hemos corregido:
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
     * Si el test ya terminó, no hacemos nada.
     */

    if (
        estadoBoton ===
        "finalizado"
    ) {

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

        if (resultadoElemento) {

            resultadoElemento.textContent =
                "⚠️ Selecciona una respuesta.";


            resultadoElemento.className =
                "";

        }


        return;

    }


    /*
     * Guardar pregunta corregida.
     */

    const preguntaQueSeCorrige =
        preguntaActual;


    if (!preguntaQueSeCorrige) {

        return;

    }


    /*
     * Respuesta seleccionada.
     */

    const respuestaSeleccionada =
        seleccion.value;


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
         * Marcar también la respuesta correcta.
         */

        opciones.forEach(
            input => {

                if (
                    input.value ===
                    preguntaQueSeCorrige.respuesta
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
     * ESTADÍSTICAS GLOBALES
     * ====================================================
     */

    if (
        preguntaQueSeCorrige.id
    ) {

        if (
            typeof registrarRespuestaPregunta ===
            "function"
        ) {

            registrarRespuestaPregunta(
                preguntaQueSeCorrige.id,
                esCorrecta
            );

        }

        else {

            console.warn(
                "estadisticas.js no está cargado. No se ha podido guardar la estadística global."
            );

        }

    }

    else {

        console.warn(
            "La pregunta no tiene ID. No se puede guardar la estadística global.",
            preguntaQueSeCorrige
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
     * No mostramos "Correcto" / "Incorrecto".
     *
     * La información se muestra mediante colores.
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
ESTADÍSTICAS DEL TEST ACTUAL

Estas estadísticas NO son las estadísticas globales.

Se reinician al reiniciar el test.
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

IMPORTANTE:

Reiniciar el test NO borra las estadísticas globales.
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

    if (botonTest) {

        botonTest.disabled =
            false;

    }


    estadoBoton =
        "corregir";


    actualizarEstadisticas();


    if (resultadoElemento) {

        resultadoElemento.textContent =
            "";


        resultadoElemento.className =
            "";

    }


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
             * ====================================================
             * CABECERA DEL ESTADO
             * ====================================================
             */

            const cabeceraEstado =
                document.createElement(
                    "div"
                );


            cabeceraEstado.className =
                "pregunta-listado-cabecera";


            const estado =
                document.createElement(
                    "div"
                );


            estado.className =
                "estado-pregunta";


            /*
             * Obtener estadísticas permanentes.
             */

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


            /*
             * Valores por defecto.
             */

            const intentos =
                informacion?.intentos || 0;


            const porcentaje =
                informacion?.porcentaje || 0;


            /*
             * ====================================================
             * DETERMINAR ESTADO
             * ====================================================
             */

            let textoEstado =
                "";


            let claseEstado =
                "";


            /*
             * SIN DATOS
             */

            if (
                intentos === 0
            ) {

                textoEstado =
                    "SIN DATOS";


                claseEstado =
                    "sin-datos";

            }


            /*
             * DOMINADA
             */

            else if (
                informacion?.dominada === true
            ) {

                textoEstado =
                    "DOMINADA";


                claseEstado =
                    "dominada";

            }


            /*
             * DÉBIL
             */

            else if (
                intentos < 20 ||
                porcentaje < 50
            ) {

                textoEstado =
                    "DÉBIL";


                claseEstado =
                    "debil";

            }


            /*
             * EN PROCESO
             */

            else if (
                porcentaje < 75
            ) {

                textoEstado =
                    "EN PROCESO";


                claseEstado =
                    "en-progreso";

            }


            /*
             * CASI DOMINADA
             */

            else {

                textoEstado =
                    "CASI DOMINADA";


                claseEstado =
                    "casi-dominada";

            }


            /*
             * Aplicar clase.
             */

            estado.classList.add(
                claseEstado
            );


            /*
             * Texto del estado.
             */

            estado.appendChild(
                document.createTextNode(
                    textoEstado
                )
            );


            /*
             * Círculo.
             */

            const circulo =
                document.createElement(
                    "span"
                );


            circulo.className =
                "circulo";


            estado.appendChild(
                circulo
            );


            cabeceraEstado.appendChild(
                estado
            );


            elemento.appendChild(
                cabeceraEstado
            );


            /*
             * ====================================================
             * PREGUNTA
             * ====================================================
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
             * ====================================================
             * RESPUESTA
             * ====================================================
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
             * ====================================================
             * TEXTO PARA EL BUSCADOR
             * ====================================================
             */

            elemento.dataset.busqueda =
                (
                    String(
                        pregunta.pregunta || ""
                    ) +
                    " " +
                    String(
                        pregunta.respuesta || ""
                    )
                ).toLowerCase();


            /*
             * Añadir al listado.
             */

            listaPreguntasElemento.appendChild(
                elemento
            );

        }
    );


    /*
     * Aplicar filtro actual si existe.
     */

    filtrarPreguntas();

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


/*
 * No hace falta cargar manualmente el historial aquí.
 *
 * estadisticas.js lo obtiene directamente de localStorage
 * cada vez que registra una respuesta.
 */


/* ========================================================
INICIALIZACIÓN
======================================================== */

/*
 * Configurar listado.
 */

configurarListado();


/*
 * Cargar preguntas.
 */

cargarPreguntas();
