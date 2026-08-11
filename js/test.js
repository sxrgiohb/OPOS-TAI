let preguntas = [];
let indice = 0;


/*
 * Estado del botón del test:
 * "corregir" → todavía no hemos corregido
 * "siguiente" → ya hemos corregido y esperamos al usuario
 */

let estadoBoton = "corregir";


/* ========================================================
   ESTADÍSTICAS
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
   OBTENER PARÁMETROS DE LA URL
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
   CONFIGURAR LISTADO
======================================================== */

function configurarListado() {

    /*
     * Si no existe el listado en el HTML,
     * no hacemos nada.
     */

    if (!listaPreguntasElemento) {

        return;

    }


    const listadoCard =
        listaPreguntasElemento.closest(".card");


    if (!listadoCard) {

        return;

    }


    /*
     * SESIÓN:
     * ocultamos completamente el listado.
     */

    if (idSesion) {

        listadoCard.style.display =
            "none";

    }


    /*
     * CAPÍTULO:
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
            JSON.parse(datos);


        return Array.isArray(sesiones)
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

        console.error(error);


        if (estadoElemento) {

            estadoElemento.style.display =
                "block";


            estadoElemento.textContent =
                "❌ " + error.message;

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

    let preguntasCombinadas = [];


    /*
     * Cargar cada archivo seleccionado.
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
            await fetch(ruta);


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
        preguntas.length > numeroPreguntas
    ) {

        preguntas =
            preguntas.slice(
                0,
                numeroPreguntas
            );

    }


    /*
     * Hemos terminado de cargar.
     */

    estadoElemento.style.display =
        "none";


    /*
     * Estadísticas.
     */

    actualizarEstadisticas();


    /*
     * Primera pregunta.
     */

    indice = 0;

    mostrarPregunta();


    /*
     * IMPORTANTE:
     *
     * NO mostramos el listado en sesiones.
     */

}


/* ========================================================
   CARGAR PREGUNTAS DE UN CAPÍTULO
======================================================== */

async function cargarPreguntasAntiguo() {

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
        await fetch(ruta);


    if (!respuesta.ok) {

        throw new Error(
            `No se ha podido cargar ${ruta}`
        );

    }


    preguntas =
        await respuesta.json();


    if (
        !Array.isArray(preguntas) ||
        preguntas.length === 0
    ) {

        throw new Error(
            "El archivo JSON no contiene preguntas."
        );

    }


    estadoElemento.style.display =
        "none";


    indice = 0;


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

function mostrarPregunta() {

    if (preguntas.length === 0) {

        preguntaElemento.textContent =
            "No hay preguntas.";


        opcionesElemento.innerHTML =
            "";


        return;

    }


    const preguntaActual =
        preguntas[indice];


    preguntaElemento.textContent =
        preguntaActual.pregunta;


    opcionesElemento.innerHTML =
        "";


    /*
     * Crear opciones.
     */

    preguntaActual.opciones.forEach(
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
                    " " + opcion
                )
            );


            opcionesElemento.appendChild(
                label
            );

        }
    );


    /*
     * Limpiar cualquier mensaje anterior.
     */

    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * El botón vuelve a ser "Corregir".
     */

    estadoBoton =
        "corregir";


    botonTest.textContent =
        "Corregir";

}


/* ========================================================
   CORREGIR / SIGUIENTE
======================================================== */

function corregirRespuesta() {

    /*
     * Si ya hemos corregido,
     * el botón funciona como "Siguiente".
     */

    if (
        estadoBoton ===
        "siguiente"
    ) {

        siguientePregunta();

        return;

    }


    const seleccion =
        document.querySelector(
            'input[name="opcion"]:checked'
        );


    if (!seleccion) {

        /*
         * Mantenemos únicamente este aviso
         * porque no se ha seleccionado ninguna
         * respuesta todavía.
         */

        resultadoElemento.textContent =
            "⚠️ Selecciona una respuesta.";


        resultadoElemento.className =
            "";


        return;

    }


    const preguntaActual =
        preguntas[indice];


    const posicionSeleccionada =
        Number(
            seleccion.value
        );


    const respuestaSeleccionada =
        preguntaActual.opciones[
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
        preguntaActual.respuesta;


    if (esCorrecta) {

        /*
         * Correcta → verde.
         */

        aciertos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "correcta"
            );

    }


    else {

        /*
         * Incorrecta → rojo.
         */

        fallos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "incorrecta"
            );


        /*
         * Marcar también la correcta
         * en verde.
         */

        opciones.forEach(
            input => {

                const posicion =
                    Number(
                        input.value
                    );


                if (
                    preguntaActual.opciones[
                        posicion
                    ] ===
                    preguntaActual.respuesta
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
     * IMPORTANTE:
     *
     * No mostramos ningún texto
     * de "Correcto" o "Incorrecto".
     *
     * La información se muestra únicamente
     * mediante los colores.
     */

    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


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
     * Cambiar botón a "Siguiente".
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

    if (
        indice <
        preguntas.length - 1
    ) {

        indice++;

        mostrarPregunta();

        return;

    }


    /*
     * Fin del test.
     *
     * No mostramos "Correcto" / "Incorrecto".
     */

    resultadoElemento.textContent =
        "🎉 Has terminado el test.";


    resultadoElemento.className =
        "";


    actualizarEstadisticas();

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
   ESTADÍSTICAS
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
   REINICIAR ESTADÍSTICAS
======================================================== */

function reiniciarEstadisticas() {

    aciertos = 0;

    fallos = 0;

    respondidas = 0;


    actualizarEstadisticas();


    resultadoElemento.textContent =
        "";


    resultadoElemento.className =
        "";


    /*
     * Volver a la primera pregunta.
     */

    indice = 0;


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
     * Por seguridad:
     * jamás mostramos listado en sesiones.
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
             * Añadir pregunta y respuesta.
             */

            elemento.appendChild(
                preguntaTexto
            );


            elemento.appendChild(
                respuestaTexto
            );


            /*
             * El listado es solamente consultivo.
             */

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

configurarListado();

cargarPreguntas();
