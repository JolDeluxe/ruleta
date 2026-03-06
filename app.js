const UI = {
    pantallaInicio: document.getElementById('pantalla-inicio'),
    pantallaJuego: document.getElementById('pantalla-juego'),
    btnComenzar: document.getElementById('btn-comenzar'),
    titulo: document.getElementById('titulo-etapa'),
    nombreTurno: document.getElementById('nombre-turno'),
    subTurnoBox: document.getElementById('sub-turno-box'),
    resultadoBox: document.getElementById('resultado-box'),
    reto: document.getElementById('texto-reto'),
    btnGirar: document.getElementById('btn-girar'),
    btnReiniciar: document.getElementById('btn-reiniciar'),
    cronometroDiv: document.getElementById('contenedor-cronometro'),
    tiempoDisplay: document.getElementById('tiempo-display'),
    textoPrep: document.getElementById('texto-preparacion'),
    btnPausa: document.getElementById('btn-pausa'),
    canvas: document.getElementById('wheel'),
    modalAlerta: document.getElementById('modal-alerta'),
    modalMensaje: document.getElementById('modal-mensaje'),
    btnModalOk: document.getElementById('btn-modal-ok')
};

let estado = {
    jugadores: [],
    turnoIdx: 0,
    etapa: 1,
    nivel: 1, 
    datos: null,
    girando: false,
    esperandoSiguienteTurno: false
};

let crono = { tiempoRestante: 0, intervalo: null, pausado: false, timeoutPrep: null };
let rotacionTotal = 0;
let opcionesVisuales = []; // Todos los retos que se ven pintados
let opcionesReales = [];   // Los retos en los que de verdad puede caer

const coloresBase = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];

function mostrarAlerta(mensaje) {
    UI.modalMensaje.textContent = mensaje;
    UI.modalAlerta.classList.remove('oculto');
}

UI.btnModalOk.addEventListener('click', () => {
    UI.modalAlerta.classList.add('oculto');
});

async function inicializar() {
    const guardado = localStorage.getItem('ruletaJuego');
    if (guardado) {
        estado = JSON.parse(guardado);
        if (!estado.nivel) estado.nivel = 1; 

        UI.pantallaInicio.classList.add('oculto');
        UI.pantallaJuego.classList.remove('oculto');
        
        if (estado.esperandoSiguienteTurno) {
            avanzarTurno();
            estado.esperandoSiguienteTurno = false;
            guardar();
        }
        actualizarUI();
    } else {
        const res = await fetch('data.json');
        estado.datos = await res.json();
    }
}

UI.btnComenzar.addEventListener('click', () => {
    const n1 = document.getElementById('nombre-j1').value.trim();
    const n2 = document.getElementById('nombre-j2').value.trim();

    if (!n1 || !n2) {
        mostrarAlerta("Ingresa los nombres de ambos jugadores.");
        return;
    }

    estado.jugadores = [
        { nombre: n1, id: 'jugador1' },
        { nombre: n2, id: 'jugador2' }
    ];
    
    guardar();
    UI.pantallaInicio.classList.add('oculto');
    UI.pantallaJuego.classList.remove('oculto');
    actualizarUI();
});

const guardar = () => localStorage.setItem('ruletaJuego', JSON.stringify(estado));

function espaciarMutuos(normales, mutuos) {
    let norm = [...normales].sort(() => Math.random() - 0.5);
    let mut = [...mutuos].sort(() => Math.random() - 0.5);

    if (mut.length === 0) return norm;
    if (norm.length === 0) return mut;

    let resultado = new Array(norm.length + mut.length);
    let paso = resultado.length / mut.length;
    
    for(let i = 0; i < mut.length; i++) {
        let pos = Math.floor(i * paso);
        resultado[pos] = mut[i];
    }

    let nIdx = 0;
    for(let i = 0; i < resultado.length; i++) {
        if(resultado[i] === undefined) {
            resultado[i] = norm[nIdx++];
        }
    }
    return resultado;
}

// Junta nivel 1 y nivel 2 para pintar la ruleta entera
function obtenerOpcionesVisuales() {
    const d = estado.datos;
    const e = 'etapa' + estado.etapa;
    const jId = estado.jugadores[estado.turnoIdx].id;

    if (!d[e]) return [];

    let normalesL1 = d[e].nivel1?.[jId] || [];
    let normalesL2 = d[e].nivel2?.[jId] || [];
    let mutuosL1 = d[e].nivel1?.mutuo || [];
    let mutuosL2 = d[e].nivel2?.mutuo || [];

    let normales = [...normalesL1, ...normalesL2];
    let mutuos = [...mutuosL1, ...mutuosL2];

    if (estado.etapa === 1) {
        return [...normales].sort(() => Math.random() - 0.5);
    } else {
        return espaciarMutuos(normales, mutuos);
    }
}

// Saca solo los del nivel activo para el sorteo real
function obtenerOpcionesReales() {
    const d = estado.datos;
    const e = 'etapa' + estado.etapa;
    const n = 'nivel' + estado.nivel;
    const jId = estado.jugadores[estado.turnoIdx].id;

    if (!d[e] || !d[e][n]) return [];

    let normales = d[e][n][jId] || [];
    let mutuos = d[e][n].mutuo || [];

    return [...normales, ...mutuos];
}

function esRetoMutuo(texto) {
    if (estado.etapa === 1) return false;
    const e = 'etapa' + estado.etapa;
    const mutuosL1 = estado.datos[e].nivel1?.mutuo || [];
    const mutuosL2 = estado.datos[e].nivel2?.mutuo || [];
    return mutuosL1.some(r => r.texto === texto) || mutuosL2.some(r => r.texto === texto);
}

function dibujarRuleta() {
    const ctx = UI.canvas.getContext('2d');
    const centro = UI.canvas.width / 2;
    const total = opcionesVisuales.length;
    ctx.clearRect(0, 0, UI.canvas.width, UI.canvas.height);

    if (total === 0) return;

    const arco = (2 * Math.PI) / total;

    opcionesVisuales.forEach((opc, i) => {
        const angulo = i * arco;
        
        ctx.beginPath();
        
        if (estado.etapa === 1) {
            ctx.fillStyle = coloresBase[i % coloresBase.length];
        } else {
            if (esRetoMutuo(opc.texto)) {
                ctx.fillStyle = i % 2 === 0 ? '#6c757d' : '#495057';
            } else {
                ctx.fillStyle = i % 2 === 0 ? '#dc3545' : '#c82333';
            }
        }

        ctx.moveTo(centro, centro);
        ctx.arc(centro, centro, centro, angulo, angulo + arco);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.save();
        ctx.translate(centro, centro);
        ctx.rotate(angulo + arco / 2);
        ctx.textAlign = "right"; 
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px sans-serif";
        
        const textoCorto = opc.texto.length > 22 ? opc.texto.substring(0, 22) + '...' : opc.texto;
        ctx.fillText(textoCorto, centro - 20, 0); 
        ctx.restore();
    });
}

function eliminarReto(textoReto) {
    const d = estado.datos;
    const e = 'etapa' + estado.etapa;
    const n = 'nivel' + estado.nivel;
    const jId = estado.jugadores[estado.turnoIdx].id;

    if (d[e][n].mutuo && d[e][n].mutuo.some(r => r.texto === textoReto)) {
        d[e][n].mutuo = d[e][n].mutuo.filter(r => r.texto !== textoReto);
    } else {
        d[e][n][jId] = d[e][n][jId].filter(r => r.texto !== textoReto);
    }
}

function verificarEtapas() {
    const d = estado.datos;
    const e = 'etapa' + estado.etapa;
    const n = 'nivel' + estado.nivel;
    const j0 = estado.jugadores[0].id;
    const j1 = estado.jugadores[1].id;

    const retos0 = d[e][n][j0]?.length || 0;
    const retos1 = d[e][n][j1]?.length || 0;
    const mutuos = d[e][n].mutuo?.length || 0;

    if (retos0 === 0 && retos1 === 0 && mutuos === 0) {
        if (estado.etapa === 1 && estado.nivel === 1) {
            estado.nivel = 2; 
        } else if (estado.etapa === 1 && estado.nivel === 2) {
            estado.etapa = 2;
            estado.nivel = 1; 
            setTimeout(() => {
                mostrarAlerta("La Etapa Tranquila ha terminado. Prepárense porque ahora comienza la Etapa Intensa 🔥");
            }, 500);
        } else if (estado.etapa === 2 && estado.nivel === 1) {
            estado.nivel = 2; 
        }
    }
}

function avanzarTurno() {
    estado.turnoIdx = estado.turnoIdx === 0 ? 1 : 0;
    
    // Si el jugador ya no tiene retos reales en su turno, lo saltamos
    if (obtenerOpcionesReales().length === 0) {
        estado.turnoIdx = estado.turnoIdx === 0 ? 1 : 0;
    }
}

function actualizarUI() {
    if (!estado.jugadores.length) return;

    opcionesReales = obtenerOpcionesReales();
    
    if (opcionesReales.length === 0) {
        avanzarTurno();
        opcionesReales = obtenerOpcionesReales();
    }

    opcionesVisuales = obtenerOpcionesVisuales();
    dibujarRuleta();

    const jActual = estado.jugadores[estado.turnoIdx];
    const jObjetivo = estado.jugadores[estado.turnoIdx === 0 ? 1 : 0];

    UI.titulo.textContent = estado.etapa === 1 ? "Etapa 1: Tranquila" : "Etapa 2: Intensa 🔥";
    UI.nombreTurno.textContent = jActual.nombre;
    
    UI.subTurnoBox.innerHTML = `Acción dirigida a: <span id="nombre-objetivo" style="color: #fff; font-weight: bold;">${jObjetivo.nombre}</span>`;
    UI.resultadoBox.classList.remove('resultado-mutuo');

    if (opcionesVisuales.length === 0 && estado.etapa === 2 && estado.nivel === 2) {
        UI.reto.textContent = "¡Juego finalizado! Ya no hay más retos para nadie.";
        UI.btnGirar.disabled = true;
    } else if (!estado.girando && !estado.esperandoSiguienteTurno) {
        UI.reto.textContent = "Presiona Iniciar para girar la ruleta";
    }
}

function formatearTiempo(segs) {
    const m = Math.floor(segs / 60).toString().padStart(2, '0');
    const s = (segs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function manejarCronometro(segundos) {
    detenerCronometro();
    UI.cronometroDiv.classList.remove('oculto');
    crono.tiempoRestante = segundos;
    UI.tiempoDisplay.textContent = formatearTiempo(segundos);
    UI.btnPausa.textContent = "Pausar";
    crono.pausado = false;
    
    let prep = 5;
    UI.textoPrep.textContent = `Preparación: ${prep}s...`;
    
    crono.timeoutPrep = setInterval(() => {
        prep--;
        if (prep > 0) {
            UI.textoPrep.textContent = `Preparación: ${prep}s...`;
        } else {
            clearInterval(crono.timeoutPrep);
            UI.textoPrep.textContent = "¡Tiempo corriendo!";
            iniciarConteo();
        }
    }, 1000);
}

function iniciarConteo() {
    crono.intervalo = setInterval(() => {
        if (!crono.pausado) {
            crono.tiempoRestante--;
            UI.tiempoDisplay.textContent = formatearTiempo(crono.tiempoRestante);
            if (crono.tiempoRestante <= 0) {
                detenerCronometro();
                UI.textoPrep.textContent = "¡Tiempo terminado!";
            }
        }
    }, 1000);
}

function detenerCronometro() {
    clearInterval(crono.timeoutPrep);
    clearInterval(crono.intervalo);
}

UI.btnPausa.addEventListener('click', () => {
    crono.pausado = !crono.pausado;
    UI.btnPausa.textContent = crono.pausado ? "Reanudar" : "Pausar";
});

UI.btnGirar.addEventListener('click', () => {
    if (estado.girando) return;

    if (estado.esperandoSiguienteTurno) {
        avanzarTurno();
        estado.esperandoSiguienteTurno = false;
        actualizarUI();
        guardar();
    }

    if (opcionesReales.length === 0) return;

    detenerCronometro();
    UI.cronometroDiv.classList.add('oculto');

    estado.girando = true;
    UI.btnGirar.disabled = true;
    UI.reto.textContent = "Girando...";

    // TRAMPA: Elegimos el ganador desde las opciones "Reales" (Solo las del nivel actual)
    let retoGanador = opcionesReales[Math.floor(Math.random() * opcionesReales.length)];
    
    // Buscamos en qué rebanada de la ruleta visual quedó dibujado ese reto
    let indiceGanador = opcionesVisuales.findIndex(r => r.texto === retoGanador.texto);

    let tiempoGiro = 4000;

    if (opcionesVisuales.length === 1) {
        tiempoGiro = 1000;
        rotacionTotal += 360; 
        UI.canvas.style.transition = `transform ${tiempoGiro}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        UI.canvas.style.transform = `rotate(${rotacionTotal}deg)`;
    } else {
        // Cálculo matemático para detener la ruleta exactamente en el ganador
        UI.canvas.style.transition = `transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)`;
        
        const gradosPorRebanada = 360 / opcionesVisuales.length;
        const anguloCentroRebanada = (indiceGanador * gradosPorRebanada) + (gradosPorRebanada / 2);
        
        // 270 grados es donde está el pin indicador en la parte superior
        const rotacionRequerida = (270 - anguloCentroRebanada + 360) % 360;
        const rotacionActual = rotacionTotal % 360;
        
        let diferencia = rotacionRequerida - rotacionActual;
        if (diferencia < 0) diferencia += 360;

        // Añadimos un pequeño desvío al azar para que no caiga siempre milimétricamente al centro
        let offsetRandom = (Math.random() - 0.5) * (gradosPorRebanada * 0.7);
        diferencia += offsetRandom;

        // Sumamos 5 vueltas completas más la diferencia calculada
        rotacionTotal += (360 * 5) + diferencia;
        
        UI.canvas.style.transform = `rotate(${rotacionTotal}deg)`;
    }

    setTimeout(() => {
        finalizarGiro(retoGanador); // Usamos el ganador pre-calculado
    }, tiempoGiro);
});

function finalizarGiro(retoFinal) {
    if (esRetoMutuo(retoFinal.texto)) {
        UI.subTurnoBox.innerHTML = "<span class='mutuo-text'>¡RETO MUTUO!</span>";
        UI.resultadoBox.classList.add('resultado-mutuo');
    }

    UI.reto.textContent = retoFinal.texto;
    eliminarReto(retoFinal.texto);
    verificarEtapas(); 
    
    estado.girando = false;
    estado.esperandoSiguienteTurno = true; 
    UI.btnGirar.disabled = false;
    
    guardar();

    if (retoFinal.tiempo) manejarCronometro(retoFinal.tiempo);
}

UI.btnReiniciar.addEventListener('click', () => {
    mostrarAlerta("¿Seguro que quieres borrar el progreso y reiniciar todo?");
    
    const onConfirmRestart = () => {
        localStorage.removeItem('ruletaJuego');
        location.reload();
    };
    
    UI.btnModalOk.removeEventListener('click', btnModalOkHandler);
    UI.btnModalOk.addEventListener('click', onConfirmRestart);
});

const btnModalOkHandler = () => {
    UI.modalAlerta.classList.add('oculto');
};
UI.btnModalOk.addEventListener('click', btnModalOkHandler);

inicializar();