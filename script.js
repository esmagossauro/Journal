// =============================== NAVEGAÇÃO DE ABAS =================================
function switchTab(tabId, clickedButton) {
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const allButtons = document.querySelectorAll('.nav-btn');
    allButtons.forEach(button => button.classList.remove('active'));

    if (clickedButton) clickedButton.classList.add('active');
}

// =============================== CALENDÁRIO JOURNAL =================================
let dataAtual = new Date();
let mesAtual = dataAtual.getMonth(); // 0 a 11
let anoAtual = dataAtual.getFullYear(); // 2026

let registros = JSON.parse(localStorage.getItem('meuDiarioRegistros')) || {};

const meses = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const mesesCompletos = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const diasCompletos = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

let chaveDiaSelecionado = ''; // Guarda a chave do dia aberto no modal (ex: "2026-11-20")
let humorSelecionadoTemp = '';
let fotoSelecionadaTemp = '';

// Elementos da tela principal e cartão de resumo
const dailyCardOriginal = document.querySelector('.daily-card');
const entrySummaryCard = document.getElementById('entry-summary-card');
const summaryMoodImg = document.getElementById('summary-mood-img');
const summaryDateText = document.getElementById('summary-date-text');
const summaryWeekdayText = document.getElementById('summary-weekday-text');
const summaryTextContent = document.getElementById('summary-text-content');
const summaryPhotoWrapper = document.getElementById('summary-photo-wrapper');
const summaryPhotoImg = document.getElementById('summary-photo-img');
const btnEditEntry = document.getElementById('btn-edit-entry');
const btnDeleteEntry = document.getElementById('btn-delete-entry');

// Elementos do modal e da foto única
const overlay = document.querySelector('.overlay');
const btnFecharModal = document.querySelector('.entry-header-close');
const textarea = document.getElementById('journal-text');
const btnSalvar = document.querySelector('.save-btn');
const botoesHumorModal = document.querySelectorAll('.mood-options-row button');
const botoesHumorPrincipal = document.querySelectorAll('.daily-card-humor button');

const btnChoosePhoto = document.getElementById('btn-choose-photo');
const photoSlotModal = document.getElementById('photo-slot-modal');
const photoFileInput = document.getElementById('photo-file-input');

let toastTimeout = null;

function ehDiaFuturo(ano, mes, dia) {
    const agora = new Date();
    const hojeSemHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataClicadaSemHora = new Date(ano, mes, dia);
    return dataClicadaSemHora > hojeSemHora;
}

function mostrarAvisoDiaFuturo() {
    const toast = document.getElementById('future-day-toast');
    if (!toast) {
        alert("Ainda não chegou esse dia! Você só pode escrever notas de hoje ou de dias que já passaram.");
        return;
    }

    toast.style.display = 'block';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function renderizarPreviewFotoModal(fotoBase64) {
    if (!photoSlotModal) return;
    photoSlotModal.innerHTML = '';

    if (fotoBase64) {
        const img = document.createElement('img');
        img.src = fotoBase64;
        img.alt = 'Prévia da foto';
        img.className = 'photo-modal-preview';
        photoSlotModal.appendChild(img);
    } else {
        const icone = document.createElement('img');
        icone.src = 'img/camera.svg';
        icone.alt = 'Adicionar foto';
        icone.className = 'slot-icon';
        photoSlotModal.appendChild(icone);
    }
}

function renderizarFotoResumo(fotoBase64) {
    if (!summaryPhotoWrapper || !summaryPhotoImg) return;

    if (fotoBase64) {
        summaryPhotoImg.src = fotoBase64;
        summaryPhotoWrapper.style.display = 'flex';
    } else {
        summaryPhotoImg.src = '';
        summaryPhotoWrapper.style.display = 'none';
    }
}

function preencherResumoNaTela(chaveDia, regDia) {
    if (dailyCardOriginal) dailyCardOriginal.style.display = 'none';
    if (entrySummaryCard) entrySummaryCard.style.display = 'flex';

    const isObj = typeof regDia === 'object' && regDia !== null;
    const humor = isObj ? (regDia.humor || '') : (regDia || '');
    const texto = isObj ? (regDia.texto || '') : '';
    const foto = isObj ? (regDia.foto || '') : '';

    if (summaryMoodImg) summaryMoodImg.src = humor;
    if (summaryTextContent) summaryTextContent.textContent = texto || '';

    const [ano, mes, diaNum] = chaveDia.split('-');
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(diaNum));
    const nomeMes = meses[dataObj.getMonth()];
    const nomeDiaSemana = diasCompletos[dataObj.getDay()];

    if (summaryDateText) summaryDateText.textContent = `${diaNum} de ${nomeMes}`;
    if (summaryWeekdayText) summaryWeekdayText.textContent = `${nomeDiaSemana.slice(0, 3)}. · ${ano}`;

    renderizarFotoResumo(foto);
}

function renderCalendar() {
    const tituloMes = document.querySelector('.current-month');
    if (tituloMes) {
        tituloMes.textContent = meses[mesAtual] + " " + anoAtual;
    }

    const calendarView = document.querySelector('.calendar-view');
    if (!calendarView) return;
    calendarView.innerHTML = '';

    // 1. Dias da semana no topo
    const diasSemana = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    diasSemana.forEach(diaTexto => {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.classList.add('calendar-weekday');
        weekdayDiv.textContent = diaTexto;
        calendarView.appendChild(weekdayDiv);
    });

    // 2. Cálculo do mês
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

    for (let i = 0; i < primeiroDiaSemana; i++) {
        const espacoVazio = document.createElement('div');
        espacoVazio.classList.add('calendar-day', 'empty');
        calendarView.appendChild(espacoVazio);
    }

    // 3. Dias do mês
    for (let dia = 1; dia <= totalDias; dia++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');

        const dayCircle = document.createElement('div');
        dayCircle.classList.add('day-circle');

        const chaveDia = `${anoAtual}-${mesAtual + 1}-${dia}`;
        const dadosDia = registros[chaveDia];
        const imagemHumor = (typeof dadosDia === 'string')
            ? dadosDia
            : (dadosDia && dadosDia.humor ? dadosDia.humor : null);

        if (imagemHumor) {
            const img = document.createElement('img');
            img.src = imagemHumor;
            dayCircle.appendChild(img);
        }

        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = dia;

        dayCell.appendChild(dayCircle);
        dayCell.appendChild(dayNumber);

        // Destaque para o dia de hoje
        const hoje = new Date();
        if (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) {
            dayCircle.classList.add('today');
        }

        // Evento de clique no dia do calendário
        dayCell.addEventListener('click', function() {
            if (ehDiaFuturo(anoAtual, mesAtual, dia)) {
                mostrarAvisoDiaFuturo();
                return;
            }

            chaveDiaSelecionado = chaveDia;
            const regDia = registros[chaveDiaSelecionado];

            const temRegistro = regDia && (
                (typeof regDia === 'string' && regDia !== '') ||
                (typeof regDia === 'object' && (regDia.humor || regDia.texto || regDia.foto))
            );

            if (temRegistro) {
                preencherResumoNaTela(chaveDiaSelecionado, regDia);
            } else {
                if (entrySummaryCard) entrySummaryCard.style.display = 'none';
                if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
                renderizarFotoResumo('');
                abrirModalParaDia(anoAtual, mesAtual, dia);
            }
        });

        calendarView.appendChild(dayCell);
    }
}

// Função para abrir o modal preenchendo a data, texto e foto
function abrirModalParaDia(ano, mes, dia) {
    const headerDate = document.querySelector('.entry-header-date');

    const diaSemanaIndex = new Date(ano, mes, dia).getDay();
    if (headerDate) {
        headerDate.textContent = `${diasCompletos[diaSemanaIndex]}, ${dia} de ${mesesCompletos[mes]}`;
    }

    chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;
    const reg = registros[chaveDiaSelecionado];

    if (textarea) {
        textarea.value = (typeof reg === 'object' && reg && reg.texto) ? reg.texto : '';
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    fotoSelecionadaTemp = (typeof reg === 'object' && reg && reg.foto) ? reg.foto : '';
    renderizarPreviewFotoModal(fotoSelecionadaTemp);

    atualizarSelecaoHumorVisual();

    if (overlay) overlay.classList.add('active');
}

// Inicializa o calendário
renderCalendar();

// =============================== AÇÕES DO CARTÃO DE RESUMO (EDITAR / EXCLUIR) =================================
if (btnEditEntry) {
    btnEditEntry.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;
        const [ano, mes, dia] = chaveDiaSelecionado.split('-');
        abrirModalParaDia(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    });
}

if (btnDeleteEntry) {
    btnDeleteEntry.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;

        delete registros[chaveDiaSelecionado];
        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));

        renderCalendar();
        renderizarFotoResumo('');
        if (entrySummaryCard) entrySummaryCard.style.display = 'none';
        if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
    });
}

// =============================== SELEÇÃO DE HUMOR NO MODAL =================================
botoesHumorModal.forEach(botao => {
    botao.addEventListener('click', function() {
        botoesHumorModal.forEach(b => b.classList.remove('active'));
        botao.classList.add('active');
        humorSelecionadoTemp = botao.getAttribute('humor-entry');
    });
});

function atualizarSelecaoHumorVisual() {
    const dados = registros[chaveDiaSelecionado];
    const humorSalvo = (typeof dados === 'string') ? dados : (dados ? dados.humor : '');

    botoesHumorModal.forEach(botao => {
        botao.classList.remove('active');
        const imgHumor = botao.getAttribute('humor-entry');

        if (humorSalvo && humorSalvo === imgHumor) {
            botao.classList.add('active');
        }
    });

    humorSelecionadoTemp = humorSalvo || '';
}

// =============================== SELEÇÃO DE HUMOR NA TELA PRINCIPAL (DIÁRIO) =================================
botoesHumorPrincipal.forEach(botao => {
    botao.addEventListener('click', function() {
        const caminhoImagem = botao.getAttribute('data-humor');

        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();
        const dia = hoje.getDate();

        chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;

        if (!registros[chaveDiaSelecionado] || typeof registros[chaveDiaSelecionado] !== 'object') {
            registros[chaveDiaSelecionado] = { humor: caminhoImagem, texto: '', foto: '' };
        } else {
            registros[chaveDiaSelecionado].humor = caminhoImagem;
        }

        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));
        renderCalendar();

        abrirModalParaDia(ano, mes, dia);
    });
});

// ================== FOTO ÚNICA (MODAL) ==================
if (btnChoosePhoto && photoFileInput) {
    btnChoosePhoto.addEventListener('click', () => photoFileInput.click());
}

if (photoSlotModal && photoFileInput) {
    photoSlotModal.addEventListener('click', () => photoFileInput.click());
}

if (photoFileInput) {
    photoFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            fotoSelecionadaTemp = e.target.result;
            renderizarPreviewFotoModal(fotoSelecionadaTemp);
        };
        reader.readAsDataURL(file);

        photoFileInput.value = '';
    });
}

// ================== BOTÃO SALVAR DO MODAL ==================
if (btnSalvar) {
    btnSalvar.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;

        if (!registros[chaveDiaSelecionado] || typeof registros[chaveDiaSelecionado] !== 'object') {
            registros[chaveDiaSelecionado] = { humor: '', texto: '', foto: '' };
        }

        if (humorSelecionadoTemp) {
            registros[chaveDiaSelecionado].humor = humorSelecionadoTemp;
        }
        registros[chaveDiaSelecionado].texto = textarea ? textarea.value : '';
        registros[chaveDiaSelecionado].foto = fotoSelecionadaTemp;

        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));

        renderCalendar();
        preencherResumoNaTela(chaveDiaSelecionado, registros[chaveDiaSelecionado]);

        if (overlay) overlay.classList.remove('active');
    });
}

// ================== BOTÕES DE MÊS ==================
const btnAnterior = document.getElementById('previous-month-btn');
if (btnAnterior) {
    btnAnterior.addEventListener('click', function() {
        mesAtual--;
        if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual--;
        }
        renderCalendar();
    });
}

const btnProximo = document.getElementById('next-month-btn');
if (btnProximo) {
    btnProximo.addEventListener('click', function() {
        mesAtual++;
        if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
        }
        renderCalendar();
    });
}

// ================== FECHAR MODAL DO DIÁRIO ==================
if (btnFecharModal && overlay) {
    btnFecharModal.addEventListener('click', function() {
        overlay.classList.remove('active');
    });

    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) {
            overlay.classList.remove('active');
        }
    });
}

// ================== TEXTAREA EXPANSIVA ==================
if (textarea) {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// ================== PET MENU ==================
function togglePetMenu() {
    const menu = document.getElementById('pet-menu');
    if (menu) menu.classList.toggle('active');
}