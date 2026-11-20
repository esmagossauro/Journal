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

let chaveDiaSelecionado = ''; // Guarda a chave do dia aberto no modal (ex: "2026-11-15")

// Elementos do Card de Resumo na Tela Principal
const dailyCardOriginal = document.querySelector('.daily-card'); 
const entrySummaryCard = document.getElementById('entry-summary-card'); 
const summaryMoodImg = document.getElementById('summary-mood-img');
const summaryDateText = document.getElementById('summary-date-text');
const summaryWeekdayText = document.getElementById('summary-weekday-text');
const summaryTextContent = document.getElementById('summary-text-content');
const btnEditEntry = document.getElementById('btn-edit-entry');
const btnDeleteEntry = document.getElementById('btn-delete-entry');

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

    // Dias do mês
    for (let dia = 1; dia <= totalDias; dia++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');

        const dayCircle = document.createElement('div');
        dayCircle.classList.add('day-circle');

        const chaveDia = `${anoAtual}-${mesAtual + 1}-${dia}`;
        
        const dadosDia = registros[chaveDia];
        const imagemHumor = (typeof dadosDia === 'string') ? dadosDia : (dadosDia && dadosDia.humor ? dadosDia.humor : null);

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

        // Evento de clique para o dia no calendário
        dayCell.addEventListener('click', function() {
            if (ehDiaFuturo(anoAtual, mesAtual, dia)) {
                mostrarAvisoDiaFuturo();
                return;
            }

            chaveDiaSelecionado = chaveDia;
            const regDia = registros[chaveDiaSelecionado];

            // Verifica se o dia já tem registro salvo (string antiga ou objeto novo)
            const temRegistro = regDia && (
                (typeof regDia === 'string' && regDia !== '') || 
                (typeof regDia === 'object' && (regDia.humor || regDia.texto))
            );

            if (temRegistro) {
                // --- SE JÁ TIVER REGISTRO: Mostra o cartão de resumo ---
                if (dailyCardOriginal) dailyCardOriginal.style.display = 'none';
                if (entrySummaryCard) entrySummaryCard.style.display = 'flex';

                const humor = (typeof regDia === 'string') ? regDia : regDia.humor;
                const texto = (typeof regDia === 'object') ? regDia.texto : '';

                if (summaryMoodImg) summaryMoodImg.src = humor || '';
                if (summaryTextContent) summaryTextContent.textContent = texto || 'Nenhum texto escrito.';

                // Formata a data para o card de resumo
                const nomeMes = meses[mesAtual];
                const nomeDiaSemana = diasCompletos[new Date(anoAtual, mesAtual, dia).getDay()];

                if (summaryDateText) summaryDateText.textContent = `${dia} de ${nomeMes}`;
                if (summaryWeekdayText) summaryWeekdayText.textContent = `${nomeDiaSemana.slice(0, 3)}. · ${anoAtual}`;

            } else {
                // --- SE ESTIVER VAZIO: Abre o modal para preencher ---
                if (entrySummaryCard) entrySummaryCard.style.display = 'none';
                if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
                abrirModalParaDia(anoAtual, mesAtual, dia);
            }
        });

        calendarView.appendChild(dayCell);
    }
}

// Função para abrir o modal preenchendo a data correta
function abrirModalParaDia(ano, mes, dia) {
    const overlay = document.querySelector('.overlay');
    const headerDate = document.querySelector('.entry-header-date');
    const textarea = document.getElementById('journal-text');
    
    const diaSemanaIndex = new Date(ano, mes, dia).getDay();
    if (headerDate) {
        headerDate.textContent = `${diasCompletos[diaSemanaIndex]}, ${dia} de ${mesesCompletos[mes]}`;
    }

    chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;

    // Carrega o texto salvo (se houver)
    if (registros[chaveDiaSelecionado]) {
        const reg = registros[chaveDiaSelecionado];
        textarea.value = (typeof reg === 'object' && reg.texto) ? reg.texto : '';
    } else {
        textarea.value = '';
    }

    // Atualiza a seleção visual dos rostinhos de humor no modal
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

        // Remove o registro do dia
        delete registros[chaveDiaSelecionado];
        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));

        // Atualiza a interface
        renderCalendar();
        if (entrySummaryCard) entrySummaryCard.style.display = 'none';
        if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
    });
}

// =============================== SELEÇÃO DE HUMOR NO MODAL =================================
const botoesHumorModal = document.querySelectorAll('.mood-options-row button');
let humorSelecionadoTemp = ''; 

botoesHumorModal.forEach(botao => {
    botao.addEventListener('click', function() {
        botoesHumorModal.forEach(b => b.classList.remove('active'));
        botao.classList.add('active');
        humorSelecionadoTemp = botao.getAttribute('humor-entry');
    });
});

function atualizarSelecaoHumorVisual() {
    botoesHumorModal.forEach(botao => {
        botao.classList.remove('active');
        const imgHumor = botao.getAttribute('humor-entry');
        
        const dados = registros[chaveDiaSelecionado];
        const humorSalvo = (typeof dados === 'string') ? dados : (dados ? dados.humor : '');

        if (humorSalvo === imgHumor) {
            botao.classList.add('active');
            humorSelecionadoTemp = humorSalvo;
        }
    });
    if (!registros[chaveDiaSelecionado]) {
        humorSelecionadoTemp = '';
    }
}

// =============================== SELEÇÃO DE HUMOR NA TELA PRINCIPAL (DIÁRIO) =================================
const botoesHumorPrincipal = document.querySelectorAll('.daily-card-humor button');

botoesHumorPrincipal.forEach(botao => {
    botao.addEventListener('click', function() {
        const caminhoImagem = botao.getAttribute('data-humor');

        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();
        const dia = hoje.getDate();
        
        chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;

        if (!registros[chaveDiaSelecionado] || typeof registros[chaveDiaSelecionado] !== 'object') {
            registros[chaveDiaSelecionado] = { humor: caminhoImagem, texto: '', fotos: [] };
        } else {
            registros[chaveDiaSelecionado].humor = caminhoImagem;
        }

        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));
        renderCalendar();

        abrirModalParaDia(ano, mes, dia);
    });
});

// ================== BOTÃO SALVAR DO MODAL ==================
const btnSalvar = document.querySelector('.save-btn');
const textarea = document.getElementById('journal-text');
const overlay = document.querySelector('.overlay');

if (btnSalvar) {
    btnSalvar.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;

        if (!registros[chaveDiaSelecionado] || typeof registros[chaveDiaSelecionado] !== 'object') {
            registros[chaveDiaSelecionado] = { humor: '', texto: '', fotos: [] };
        }

        if (humorSelecionadoTemp) {
            registros[chaveDiaSelecionado].humor = humorSelecionadoTemp;
        }
        registros[chaveDiaSelecionado].texto = textarea.value;

        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));

        renderCalendar();
        
        // Atualiza o card de resumo na tela principal se ele estiver ativo para esse dia
        if (entrySummaryCard && summaryTextContent && summaryMoodImg) {
            if (dailyCardOriginal) dailyCardOriginal.style.display = 'none';
            entrySummaryCard.style.display = 'flex';
            summaryMoodImg.src = registros[chaveDiaSelecionado].humor || '';
            summaryTextContent.textContent = registros[chaveDiaSelecionado].texto || 'Nenhum texto escrito.';
        }

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
const btnFecharModal = document.querySelector('.entry-header-close');

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