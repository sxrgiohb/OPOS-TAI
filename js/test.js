
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
 * Mantenemos también la posibilidad de utilizar
 * el sistema antiguo mediante ?datos=
 *
 * Esto nos permite no perder compatibilidad.
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
         * Si venimos desde una sesión personalizada,
         * usamos la nueva lógica.
         */

        if (idSesion) {

            await cargarPreguntasDeSesion();

            return;

        }


        /*
         * Compatibilidad con el sistema anterior.
         */

        if (archivoDatos) {

            await cargarPreguntasAntiguo();

            return;

        }


        throw new Error(
            "No se ha indicado ninguna sesión."
        );

    }


    catch (error) {

        console.error(error);


        estadoElemento.style.display =
            "block";


        estadoElemento.textContent =
            "❌ " + error.message;

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
     * Aquí almacenaremos todas las preguntas
     * procedentes de todos los capítulos.
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
         * La ruta se construye a partir de:
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
         * Añadimos las preguntas al conjunto.
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
     * Guardamos todas las preguntas.
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
     * Limitar al número de preguntas
     * configurado en la sesión.
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
     * Ya hemos terminado de cargar.
     */

    estadoElemento.style.display =
        "none";


    /*
     * Actualizar estadísticas.
     */

    actualizarEstadisticas();


    /*
     * Mostrar primera pregunta.
     */

    indice = 0;

    mostrarPregunta();


    /*
     * Mostrar listado.
     */

    mostrarListado();

}


/* ========================================================
   SISTEMA ANTIGUO
======================================================== */

async function cargarPreguntasAntiguo() {

    try {

        asignaturaElemento.textContent =
            obtenerNombreAsignatura(
                archivoDatos
            );


        const respuesta =
            await fetch(
                `datos/${archivoDatos}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `No se ha podido cargar ${archivoDatos}`
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


        mostrarListado();

    }


    catch (error) {

        throw error;

    }

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
        `${indice + 1}. ${preguntaActual.pregunta}`;


    opcionesElemento.innerHTML =
        "";


    /*
     * Crear las opciones
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
     * Limpiar resultado
     */

    resultadoElemento.textContent =
        "";

    resultadoElemento.className =
        "";


    /*
     * El botón vuelve a ser "Corregir"
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
     * Si ya hemos corregido la pregunta,
     * el botón funciona como "Siguiente".
     */

    if (estadoBoton === "siguiente") {

        siguientePregunta();

        return;

    }


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
     * Todas las opciones
     */

    const opciones =
        document.querySelectorAll(
            'input[name="opcion"]'
        );


    /*
     * Comprobar respuesta
     */

    const esCorrecta =
        respuestaSeleccionada ===
        preguntaActual.respuesta;


    if (esCorrecta) {

        /*
         * CORRECTA → verde
         */

        aciertos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "correcta"
            );


        resultadoElemento.textContent =
            "✅ ¡Correcto!";

        resultadoElemento.className =
            "correcto";

    }


    else {

        /*
         * INCORRECTA → rojo
         */

        fallos++;

        respondidas++;


        seleccion
            .parentElement
            .classList.add(
                "incorrecta"
            );


        /*
         * Además marcamos en verde
         * la respuesta correcta.
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


        resultadoElemento.textContent =
            `❌ Incorrecto. La respuesta correcta es: ${preguntaActual.respuesta}`;

        resultadoElemento.className =
            "incorrecto";

    }


    actualizarEstadisticas();


    /*
     * Desactivar las opciones.
     */

    opciones.forEach(
        input => {

            input.disabled =
                true;

        }
    );


    /*
     * Ahora el botón pasa a ser
     * "Siguiente".
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
     * Hemos llegado al final.
     */

    resultadoElemento.textContent =
        "🎉 Has terminado el test.";


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


    /*
     * Volver a la primera pregunta.
     */

    indice = 0;


    /*
     * Si la sesión es aleatoria, podemos
     * volver a mezclar para empezar otra vez.
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

    if (!listaPreguntasElemento) {

        return;

    }


    listaPreguntasElemento.innerHTML = "";


    preguntas.forEach(
        (pregunta) => {

            const elemento =
                document.createElement("div");


            elemento.className =
                "pregunta-listado";


            /*
             * Pregunta
             */

            const preguntaTexto =
                document.createElement("div");


            preguntaTexto.className =
                "pregunta-listado-texto";


            preguntaTexto.textContent =
                pregunta.pregunta;


            /*
             * Respuesta
             */

            const respuestaTexto =
                document.createElement("div");


            respuestaTexto.className =
                "respuesta-listado";


            respuestaTexto.innerHTML =
                `<strong>✅ Respuesta:</strong> ${
                    escaparHTML(
                        pregunta.respuesta
                    )
                }`;


            /*
             * Texto utilizado por el buscador.
             * Busca tanto en pregunta como en respuesta.
             */

            elemento.dataset.busqueda =
                `${pregunta.pregunta} ${pregunta.respuesta}`
                    .toLowerCase();


            /*
             * Añadir pregunta + respuesta
             */

            elemento.appendChild(
                preguntaTexto
            );


            elemento.appendChild(
                respuestaTexto
            );


            /*
             * IMPORTANTE:
             * No añadimos ningún evento "click".
             *
             * El listado es exclusivamente consultivo.
             */

            listaPreguntasElemento.appendChild(
                elemento
            );

        }
    );

}


/* ========================================================
   MARCAR PREGUNTA ACTUAL EN EL LISTADO
======================================================== */

function actualizarPreguntaSeleccionada() {

    if (!listaPreguntasElemento) {

        return;

    }


    const elementos =
        listaPreguntasElemento
            .querySelectorAll(
                ".pregunta-listado"
            );


    elementos.forEach(
        elemento => {

            elemento.classList.remove(
                "activa"
            );

        }
    );


    const actual =
        listaPreguntasElemento
            .querySelector(
                `[data-indice="${indice}"]`
            );


    if (actual) {

        actual.classList.add(
            "activa"
        );

    }

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
   NOMBRE DE LA ASIGNATURA
======================================================== */

function obtenerNombreAsignatura(
    nombreArchivo
) {

    return nombreArchivo

        .replace(
            /\.json$/i,
            ""
        )

        .replace(
            /[-_]+/g,
            " "
        )

        .replace(
            /\b\w/g,
            letra =>
                letra.toUpperCase()
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

cargarPreguntas();
