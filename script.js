function switchTab(tabId, clickedButton) {
    // 1. Esconde todas as abas
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 2. Mostra apenas a aba clicada
    const targetTab = document.getElementById(tabId);
    targetTab.classList.add('active');

    // 3. Remove o destaque de todos os botões da barra
    const allButtons = document.querySelectorAll('.nav-btn');
    allButtons.forEach(button => {
        button.classList.remove('active');
    });

    // 4. Destaca apenas o botão que foi clicado
    clickedButton.classList.add('active');
}


// =============================== CALWNDARIO JOURNAL =================================

// Variáveis para controlar o mês e o ano atuais
let dataAtual = new Date();
let mesAtual = dataAtual.getMonth(); // 0 a 11 (Janeiro a Dezembro)
let anoAtual = dataAtual.getFullYear(); // Ano atual (ex: 2026)
let registros = JSON.parse(localStorage.getItem('meuDiarioRegistros')) || {};  // salva os arquivos
const meses = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function renderCalendar() {

    const tituloMes = document.querySelector('.current-month');
    tituloMes.textContent = meses[mesAtual] + " " + anoAtual;

    const calendarView = document.querySelector('.calendar-view');
    calendarView.innerHTML = ''; // Limpa o calendário antigo

    // 1. Adiciona os dias da semana no topo (dom. a sáb.)
    const diasSemana = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    diasSemana.forEach(diaTexto => {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.classList.add('calendar-weekday');
        weekdayDiv.textContent = diaTexto;
        calendarView.appendChild(weekdayDiv);
    });

    // 2. O restante do cálculo do mês
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

    // Espaços vazios iniciais para alinhar o dia 1
    for (let i = 0; i < primeiroDiaSemana; i++) {
        const espacoVazio = document.createElement('div');
        espacoVazio.classList.add('calendar-day', 'empty');
        calendarView.appendChild(espacoVazio);
    }

    // Dias do mês (bolinha + número)
    for (let dia = 1; dia <= totalDias; dia++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');

        const dayCircle = document.createElement('div');
        dayCircle.classList.add('day-circle');

        const chaveDia = `${anoAtual}-${mesAtual + 1}-${dia}`;
        if (registros[chaveDia]) {
            const img = document.createElement('img');
            img.src = registros[chaveDia];
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

        calendarView.appendChild(dayCell);
    }
}
// Executa a função assim que o app carrega
renderCalendar()

// ===============

const botoesHumor = document.querySelectorAll('.daily-card-humor button');

botoesHumor.forEach(botao => {
    botao.addEventListener('click', function() {
        // 1. Pega o caminho da imagem que está no atributo data-humor do botão clicado
        const caminhoImagem = botao.getAttribute('data-humor');

        // 2. Monta a etiqueta da data de hoje (ex: "2026-11-15")
        const hoje = new Date();
        const chaveHoje = `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;

        // 3. Guarda no nosso caderno e salva no navegador
        registros[chaveHoje] = caminhoImagem;
        localStorage.setItem('meuDiarioRegistros', JSON.stringify(registros));

        // 4. Redesenha o calendário para o rostinho aparecer na hora!
        renderCalendar();
    });
});



// ================== BOTOES DO CALENDARIO MES ==================
const btnAnterior = document.getElementById('previous-month-btn');
btnAnterior.addEventListener('click', function() {
    mesAtual = mesAtual - 1; 
    // Se passar de janeiro (0), volta para dezembro (11) e diminui 1 ano:
    if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual = anoAtual - 1;
    }
    renderCalendar(); // Redesenha o calendário na tela!
});

const btnProximo = document.getElementById('next-month-btn');
btnProximo.addEventListener('click', function() {
    mesAtual = mesAtual + 1; 
    // Se passar de dezembro (11), volta para janeira (0) e soma 1 ano:
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual = anoAtual + 1;
    }
    renderCalendar(); // Redesenha o calendário na tela!
});






// pet menu

function togglePetMenu() {
    const menu = document.getElementById('pet-menu');
    menu.classList.toggle('active');
}


