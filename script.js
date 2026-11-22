// =============================== NAVEGAÇÃO DE ABAS =================================
function switchTab(tabId, clickedButton) {
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (tabId === 'tab-tasks' && typeof atualizarPeriodoCeuTarefas === 'function') {
        atualizarPeriodoCeuTarefas();
    }

    const allButtons = document.querySelectorAll('.nav-btn');
    allButtons.forEach(button => button.classList.remove('active'));

    if (clickedButton) clickedButton.classList.add('active');
}

// =============================== DADOS E ESTADO DO DIÁRIO =================================
const CHAVE_STORAGE = 'meuDiarioRegistros';

const meses = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const mesesCompletos = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const diasCompletos = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const diasSemanaCurtos = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

let dataAtual = new Date();
let mesAtual = dataAtual.getMonth();
let anoAtual = dataAtual.getFullYear();

function carregarRegistros() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
        return (salvo && typeof salvo === 'object') ? salvo : {};
    } catch {
        return {};
    }
}

function salvarRegistros() {
    try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(registros));
    } catch (erro) {
        console.warn('Não foi possível salvar no localStorage (talvez por limite de espaço):', erro);
    }
}

let registros = carregarRegistros();

let chaveDiaSelecionado = '';
let humorSelecionadoTemp = '';
let fotoSelecionadaTemp = '';
let estadoInicialModal = { humor: '', texto: '', foto: '' };
let acaoConfirmacaoAtual = null;
let acaoCancelamentoAtual = null;
let toastTimeout = null;
let modoVisualizacao = 'calendar'; // 'calendar' | 'list'
let ordemListaRecentePrimeiro = true; // true: mais recentes primeiro | false: mais antigos primeiro

// =============================== REFERÊNCIAS DO DOM =================================
const dailyCardOriginal = document.querySelector('.daily-card:not(.list-daily-card)');
const listDailyCard = document.getElementById('list-daily-card');
const entrySummaryCard = document.getElementById('entry-summary-card');
const summaryMoodImg = document.getElementById('summary-mood-img');
const summaryDateText = document.getElementById('summary-date-text');
const summaryWeekdayText = document.getElementById('summary-weekday-text');
const summaryTextContent = document.getElementById('summary-text-content');
const summaryPhotoWrapper = document.getElementById('summary-photo-wrapper');
const summaryPhotoImg = document.getElementById('summary-photo-img');
const btnEditEntry = document.getElementById('btn-edit-entry');
const btnDeleteEntry = document.getElementById('btn-delete-entry');

const calendarViewEl = document.querySelector('.calendar-view');
const listViewEl = document.querySelector('.list-view');
const btnChangeMode = document.querySelector('.header-change-mode');
const btnSortOrder = document.getElementById('btn-sort-order');

const overlay = document.querySelector('.overlay');
const btnFecharModal = document.querySelector('.entry-header-close');
const textarea = document.getElementById('journal-text');
const btnSalvar = document.querySelector('.save-btn');
const botoesHumorModal = document.querySelectorAll('.mood-options-row button');
const botoesHumorPrincipal = document.querySelectorAll('.daily-card-humor:not(.list-card-humor) button');
const botoesHumorLista = document.querySelectorAll('.list-card-humor button');

const btnChoosePhoto = document.getElementById('btn-choose-photo');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const photoSlotModal = document.getElementById('photo-slot-modal');
const photoFileInput = document.getElementById('photo-file-input');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmTitle = document.getElementById('confirm-title');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmOkBtn = document.getElementById('confirm-ok-btn');

const btnAnterior = document.getElementById('previous-month-btn');
const btnProximo = document.getElementById('next-month-btn');

// =============================== HELPERS DE DATA E REGISTRO =================================
function obterChaveHoje() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;
}

function ehMesAtualReal() {
    const hoje = new Date();
    return anoAtual === hoje.getFullYear() && mesAtual === hoje.getMonth();
}

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

function extrairDadosRegistro(regDia) {
    if (!regDia) return { humor: '', texto: '', foto: '' };
    if (typeof regDia === 'string') return { humor: regDia, texto: '', foto: '' };
    return {
        humor: regDia.humor || '',
        texto: regDia.texto || '',
        foto: regDia.foto || ''
    };
}

function temConteudoValido(regDia) {
    const { humor, texto, foto } = extrairDadosRegistro(regDia);
    return Boolean(humor || texto.trim() || foto);
}

function chavePertenceAoMesExibido(chaveDia) {
    if (!chaveDia) return false;
    const [ano, mes] = chaveDia.split('-').map(Number);
    return ano === anoAtual && mes === (mesAtual + 1);
}

function obterRegistrosOrdenados() {
    return Object.entries(registros)
        .filter(([chaveDia, regDia]) => {
            if (!temConteudoValido(regDia)) return false;

            const [ano, mes] = chaveDia.split('-').map(Number);
            return ano === anoAtual && mes === (mesAtual + 1);
        })
        .sort(([chaveA], [chaveB]) => {
            const [anoA, mesA, diaA] = chaveA.split('-').map(Number);
            const [anoB, mesB, diaB] = chaveB.split('-').map(Number);
            const dataA = new Date(anoA, mesA - 1, diaA);
            const dataB = new Date(anoB, mesB - 1, diaB);
            return ordemListaRecentePrimeiro ? (dataB - dataA) : (dataA - dataB);
        });
}

function atualizarBotaoOrdemLista() {
    if (!btnSortOrder) return;
    btnSortOrder.textContent = ordemListaRecentePrimeiro ? 'Mais recentes ↓' : 'Mais antigos ↑';
}

function atualizarCartaoHumorLista() {
    if (!listDailyCard) return;

    const hojeJaTemRegistro = temConteudoValido(registros[obterChaveHoje()]);
    const deveMostrar = (modoVisualizacao === 'list') && ehMesAtualReal() && !hojeJaTemRegistro;

    listDailyCard.style.display = deveMostrar ? 'block' : 'none';
}

function sincronizarCartoesComMesAtual() {
    if (modoVisualizacao === 'list') {
        if (entrySummaryCard) entrySummaryCard.style.display = 'none';
        if (dailyCardOriginal) dailyCardOriginal.style.display = 'none';
        atualizarCartaoHumorLista();
        return;
    }

    if (listDailyCard) listDailyCard.style.display = 'none';

    const regSelecionado = chaveDiaSelecionado ? registros[chaveDiaSelecionado] : null;
    const aindaExiste = regSelecionado && temConteudoValido(regSelecionado);

    if (aindaExiste && chavePertenceAoMesExibido(chaveDiaSelecionado)) {
        preencherResumoNaTela(chaveDiaSelecionado, regSelecionado);
    } else {
        if (entrySummaryCard) entrySummaryCard.style.display = 'none';
        if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
    }
}

function atualizarVisualizacoesSalvas() {
    renderCalendar();
    if (modoVisualizacao === 'list') {
        renderListView();
    }
    atualizarCartaoHumorLista();
}

// =============================== MODAL DE CONFIRMAÇÃO =================================
function abrirConfirmacao({
    mensagem,
    textoConfirmar,
    textoCancelar = 'Cancelar',
    tipoBotao = 'danger',
    aoConfirmar,
    aoCancelar = null
}) {
    if (!confirmOverlay || !confirmTitle || !confirmOkBtn || !confirmCancelBtn) {
        const textoPuro = mensagem.replace(/<[^>]*>/g, '');
        if (window.confirm(textoPuro) && typeof aoConfirmar === 'function') {
            aoConfirmar();
        }
        return;
    }

    confirmTitle.innerHTML = mensagem;
    confirmOkBtn.textContent = textoConfirmar;
    confirmCancelBtn.textContent = textoCancelar;

    confirmOkBtn.classList.remove('danger', 'confirm');
    confirmOkBtn.classList.add(tipoBotao);

    acaoConfirmacaoAtual = aoConfirmar;
    acaoCancelamentoAtual = aoCancelar;

    confirmOverlay.classList.add('active');
}

function fecharConfirmacao() {
    if (confirmOverlay) confirmOverlay.classList.remove('active');
    acaoConfirmacaoAtual = null;
    acaoCancelamentoAtual = null;
}

function capturarEstadoAtualModal() {
    return {
        humor: humorSelecionadoTemp || '',
        texto: textarea ? textarea.value : '',
        foto: fotoSelecionadaTemp || ''
    };
}

function houveAlteracaoNoModal() {
    const atual = capturarEstadoAtualModal();
    return (
        atual.humor !== estadoInicialModal.humor ||
        atual.texto !== estadoInicialModal.texto ||
        atual.foto !== estadoInicialModal.foto
    );
}

function fecharModalDiarioDireto() {
    if (overlay) overlay.classList.remove('active');
}

function tentarFecharModalDiario() {
    if (!overlay || !overlay.classList.contains('active')) return;

    if (!houveAlteracaoNoModal()) {
        fecharModalDiarioDireto();
        return;
    }

    // Botão verde ("Ficar") mantém no modal; botão cinza ("Sair") descarta e fecha
    abrirConfirmacao({
        mensagem: 'Quase lá! Quer sair sem salvar?',
        textoConfirmar: 'Ficar',
        textoCancelar: 'Sair',
        tipoBotao: 'confirm',
        aoConfirmar: function() {},
        aoCancelar: fecharModalDiarioDireto
    });
}

// =============================== RENDERIZAÇÃO (FOTO, RESUMO, CALENDÁRIO E LISTA) =================================
function renderizarPreviewFotoModal(fotoBase64) {
    if (!photoSlotModal) return;
    photoSlotModal.innerHTML = '';

    if (fotoBase64) {
        const img = document.createElement('img');
        img.src = fotoBase64;
        img.alt = 'Prévia da foto';
        img.className = 'photo-modal-preview';
        photoSlotModal.appendChild(img);
        if (btnRemovePhoto) btnRemovePhoto.style.display = 'inline-flex';
    } else {
        const icone = document.createElement('img');
        icone.src = 'img/camera.svg';
        icone.alt = 'Adicionar foto';
        icone.className = 'slot-icon';
        photoSlotModal.appendChild(icone);
        if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';
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

    const { humor, texto, foto } = extrairDadosRegistro(regDia);

    if (summaryMoodImg) summaryMoodImg.src = humor;
    if (summaryTextContent) summaryTextContent.textContent = texto;

    const [ano, mes, diaNum] = chaveDia.split('-');
    const dataObj = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(diaNum, 10));
    const nomeMes = meses[dataObj.getMonth()];
    const nomeDiaSemana = diasCompletos[dataObj.getDay()];

    if (summaryDateText) summaryDateText.textContent = `${diaNum} de ${nomeMes}`;
    if (summaryWeekdayText) summaryWeekdayText.textContent = `${nomeDiaSemana.slice(0, 3)}. ${ano}`;

    renderizarFotoResumo(foto);
}

function renderCalendar() {
    const tituloMes = document.querySelector('.current-month');
    if (tituloMes) {
        tituloMes.textContent = `${meses[mesAtual]} ${anoAtual}`;
    }

    if (!calendarViewEl) return;
    calendarViewEl.innerHTML = '';

    diasSemanaCurtos.forEach(diaTexto => {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.classList.add('calendar-weekday');
        weekdayDiv.textContent = diaTexto;
        calendarViewEl.appendChild(weekdayDiv);
    });

    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

    for (let i = 0; i < primeiroDiaSemana; i++) {
        const espacoVazio = document.createElement('div');
        espacoVazio.classList.add('calendar-day', 'empty');
        calendarViewEl.appendChild(espacoVazio);
    }

    const hoje = new Date();

    for (let dia = 1; dia <= totalDias; dia++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');

        const dayCircle = document.createElement('div');
        dayCircle.classList.add('day-circle');

        const chaveDia = `${anoAtual}-${mesAtual + 1}-${dia}`;
        const { humor } = extrairDadosRegistro(registros[chaveDia]);

        if (humor) {
            const img = document.createElement('img');
            img.src = humor;
            dayCircle.appendChild(img);
        }

        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = dia;

        dayCell.appendChild(dayCircle);
        dayCell.appendChild(dayNumber);

        if (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) {
            dayCircle.classList.add('today');
        }

        dayCell.addEventListener('click', function() {
            if (ehDiaFuturo(anoAtual, mesAtual, dia)) {
                mostrarAvisoDiaFuturo();
                return;
            }

            chaveDiaSelecionado = chaveDia;
            const regDia = registros[chaveDiaSelecionado];
            const dados = extrairDadosRegistro(regDia);
            const temRegistro = Boolean(dados.humor || dados.texto || dados.foto);

            if (temRegistro) {
                preencherResumoNaTela(chaveDiaSelecionado, regDia);
            } else {
                if (entrySummaryCard) entrySummaryCard.style.display = 'none';
                if (dailyCardOriginal) dailyCardOriginal.style.display = 'block';
                renderizarFotoResumo('');
                abrirModalParaDia(anoAtual, mesAtual, dia);
            }
        });

        calendarViewEl.appendChild(dayCell);
    }
}

function renderListView() {
    if (!listViewEl) return;
    listViewEl.innerHTML = '';

    const itens = obterRegistrosOrdenados();

    if (itens.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'list-empty-state';
        vazio.textContent = 'Não há nenhum registro por aqui!';
        listViewEl.appendChild(vazio);
        return;
    }

    itens.forEach(([chaveDia, regDia]) => {
        const { humor, texto, foto } = extrairDadosRegistro(regDia);
        const [ano, mes, diaNum] = chaveDia.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, diaNum);
        const nomeMes = meses[dataObj.getMonth()];
        const nomeDiaSemana = diasCompletos[dataObj.getDay()];

        const card = document.createElement('article');
        card.className = 'list-entry-card';

        const header = document.createElement('div');
        header.className = 'list-entry-header';

        if (humor) {
            const imgHumor = document.createElement('img');
            imgHumor.src = humor;
            imgHumor.alt = 'Humor do dia';
            imgHumor.className = 'list-entry-mood';
            header.appendChild(imgHumor);
        }

        const infoData = document.createElement('div');
        const dataPrincipal = document.createElement('div');
        dataPrincipal.className = 'list-entry-date-main';
        dataPrincipal.textContent = `${diaNum} de ${nomeMes}`;

        const dataSub = document.createElement('div');
        dataSub.className = 'list-entry-weekday';
        dataSub.textContent = `${nomeDiaSemana.slice(0, 3)}. ${ano}`;

        infoData.appendChild(dataPrincipal);
        infoData.appendChild(dataSub);
        header.appendChild(infoData);
        card.appendChild(header);

        if (foto) {
            const photoWrapper = document.createElement('div');
            photoWrapper.className = 'list-entry-photo-wrapper';

            const imgFoto = document.createElement('img');
            imgFoto.src = foto;
            imgFoto.alt = 'Foto do dia';
            imgFoto.className = 'list-entry-photo';

            photoWrapper.appendChild(imgFoto);
            card.appendChild(photoWrapper);
        }

        if (texto) {
            const textDiv = document.createElement('div');
            textDiv.className = 'list-entry-text';
            textDiv.textContent = texto;
            card.appendChild(textDiv);
        }

        // Na visão em lista, clicar no registro abre o modal para editar sem puxar para o topo
        card.addEventListener('click', function() {
            chaveDiaSelecionado = chaveDia;
            abrirModalParaDia(ano, mes - 1, diaNum);
        });

        listViewEl.appendChild(card);
    });
}

function atualizarModoVisualizacao() {
    const estaEmLista = modoVisualizacao === 'list';

    if (calendarViewEl) {
        calendarViewEl.style.display = estaEmLista ? 'none' : 'grid';
    }

    if (btnSortOrder) {
        btnSortOrder.style.display = estaEmLista ? 'inline-flex' : 'none';
    }

    if (listViewEl) {
        listViewEl.classList.toggle('active', estaEmLista);
        if (estaEmLista) {
            renderListView();
        }
    }

    sincronizarCartoesComMesAtual();
}

function iniciarRegistroHumorHoje(caminhoImagem) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();

    chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;
    const dadosAtuais = extrairDadosRegistro(registros[chaveDiaSelecionado]);

    registros[chaveDiaSelecionado] = {
        humor: caminhoImagem,
        texto: dadosAtuais.texto,
        foto: dadosAtuais.foto
    };

    salvarRegistros();
    atualizarVisualizacoesSalvas();
    abrirModalParaDia(ano, mes, dia);
}

// =============================== MODAL DE ENTRADA E HUMOR =================================
function atualizarSelecaoHumorVisual() {
    const { humor: humorSalvo } = extrairDadosRegistro(registros[chaveDiaSelecionado]);

    botoesHumorModal.forEach(botao => {
        const imgHumor = botao.getAttribute('humor-entry');
        botao.classList.toggle('active', Boolean(humorSalvo && humorSalvo === imgHumor));
    });

    humorSelecionadoTemp = humorSalvo;
}

function abrirModalParaDia(ano, mes, dia) {
    const headerDate = document.querySelector('.entry-header-date');
    const diaSemanaIndex = new Date(ano, mes, dia).getDay();

    if (headerDate) {
        headerDate.textContent = `${diasCompletos[diaSemanaIndex]}, ${dia} de ${mesesCompletos[mes]}`;
    }

    chaveDiaSelecionado = `${ano}-${mes + 1}-${dia}`;
    const dados = extrairDadosRegistro(registros[chaveDiaSelecionado]);

    if (textarea) {
        textarea.value = dados.texto;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    fotoSelecionadaTemp = dados.foto;
    renderizarPreviewFotoModal(fotoSelecionadaTemp);
    atualizarSelecaoHumorVisual();

    estadoInicialModal = capturarEstadoAtualModal();

    if (overlay) overlay.classList.add('active');
}

// =============================== EVENTOS =================================
if (btnChangeMode) {
    btnChangeMode.addEventListener('click', function() {
        modoVisualizacao = (modoVisualizacao === 'calendar') ? 'list' : 'calendar';
        atualizarModoVisualizacao();
    });
}

if (btnSortOrder) {
    btnSortOrder.addEventListener('click', function() {
        ordemListaRecentePrimeiro = !ordemListaRecentePrimeiro;
        atualizarBotaoOrdemLista();
        if (modoVisualizacao === 'list') {
            renderListView();
        }
    });
}

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', function() {
        const callbackCancelar = acaoCancelamentoAtual;
        fecharConfirmacao();
        if (typeof callbackCancelar === 'function') callbackCancelar();
    });
}

if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', function() {
        const callbackConfirmar = acaoConfirmacaoAtual;
        fecharConfirmacao();
        if (typeof callbackConfirmar === 'function') callbackConfirmar();
    });
}

if (confirmOverlay) {
    confirmOverlay.addEventListener('click', function(event) {
        if (event.target === confirmOverlay) {
            fecharConfirmacao();
        }
    });
}

if (btnEditEntry) {
    btnEditEntry.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;
        const [ano, mes, dia] = chaveDiaSelecionado.split('-');
        abrirModalParaDia(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
    });
}

if (btnDeleteEntry) {
    btnDeleteEntry.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;

        abrirConfirmacao({
            mensagem: 'Excluir esse registro? Ele some para sempre <span class="confirm-subnote">(Isso é muito tempo)</span>',
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar',
            tipoBotao: 'danger',
            aoConfirmar: function() {
                delete registros[chaveDiaSelecionado];
                salvarRegistros();

                atualizarVisualizacoesSalvas();
                renderizarFotoResumo('');
                if (entrySummaryCard) entrySummaryCard.style.display = 'none';
                if (dailyCardOriginal && modoVisualizacao === 'calendar') {
                    dailyCardOriginal.style.display = 'block';
                }
            }
        });
    });
}

botoesHumorModal.forEach(botao => {
    botao.addEventListener('click', function() {
        botoesHumorModal.forEach(b => b.classList.remove('active'));
        botao.classList.add('active');
        humorSelecionadoTemp = botao.getAttribute('humor-entry') || '';
    });
});

botoesHumorPrincipal.forEach(botao => {
    botao.addEventListener('click', function() {
        const caminhoImagem = botao.getAttribute('data-humor') || '';
        iniciarRegistroHumorHoje(caminhoImagem);
    });
});

botoesHumorLista.forEach(botao => {
    botao.addEventListener('click', function() {
        const caminhoImagem = botao.getAttribute('data-humor') || '';
        iniciarRegistroHumorHoje(caminhoImagem);
    });
});

if (btnChoosePhoto && photoFileInput) {
    btnChoosePhoto.addEventListener('click', () => photoFileInput.click());
}

if (photoSlotModal && photoFileInput) {
    photoSlotModal.addEventListener('click', () => photoFileInput.click());
}

if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', function() {
        fotoSelecionadaTemp = '';
        renderizarPreviewFotoModal('');
        if (photoFileInput) photoFileInput.value = '';
    });
}

if (photoFileInput) {
    photoFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            fotoSelecionadaTemp = e.target.result || '';
            renderizarPreviewFotoModal(fotoSelecionadaTemp);
        };
        reader.readAsDataURL(file);

        photoFileInput.value = '';
    });
}

if (btnSalvar) {
    btnSalvar.addEventListener('click', function() {
        if (!chaveDiaSelecionado) return;

        const dadosAtuais = extrairDadosRegistro(registros[chaveDiaSelecionado]);
        const humorFinal = humorSelecionadoTemp || dadosAtuais.humor || 'img/feliz.png';

        registros[chaveDiaSelecionado] = {
            humor: humorFinal,
            texto: textarea ? textarea.value : '',
            foto: fotoSelecionadaTemp
        };

        salvarRegistros();
        atualizarVisualizacoesSalvas();

        if (modoVisualizacao === 'calendar') {
            preencherResumoNaTela(chaveDiaSelecionado, registros[chaveDiaSelecionado]);
        } else if (entrySummaryCard) {
            entrySummaryCard.style.display = 'none';
        }

        fecharModalDiarioDireto();
    });
}

if (btnAnterior) {
    btnAnterior.addEventListener('click', function() {
        mesAtual--;
        if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual--;
        }
        renderCalendar();
        sincronizarCartoesComMesAtual();
        if (modoVisualizacao === 'list') renderListView();
    });
}

if (btnProximo) {
    btnProximo.addEventListener('click', function() {
        mesAtual++;
        if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
        }
        renderCalendar();
        sincronizarCartoesComMesAtual();
        if (modoVisualizacao === 'list') renderListView();
    });
}

if (btnFecharModal && overlay) {
    btnFecharModal.addEventListener('click', tentarFecharModalDiario);

    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) {
            tentarFecharModalDiario();
        }
    });
}

if (textarea) {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = `${this.scrollHeight}px`;
    });
}

function togglePetMenu() {
    const menu = document.getElementById('pet-menu');
    if (menu) menu.classList.toggle('active');
}

// =============================== TAREFAS POR TURNO + ARRASTAR + CÉU DO DIA =================================
const CHAVE_TAREFAS_STORAGE = 'sapinhoTarefasTurnos';
const TURNOS_TAREFAS = ['manha', 'tarde', 'noite'];
const SAUDACOES_TAREFAS = {
    manha: 'bom dia!',
    tarde: 'boa tarde!',
    noite: 'boa noite!'
};
let periodoManualCeu = null;

function obterPeriodoAtualPelaHora() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
}

function atualizarSaudacaoTarefas(periodo) {
    const tituloEl = document.getElementById('tasks-greeting-title');
    if (!tituloEl) return;
    tituloEl.textContent = SAUDACOES_TAREFAS[periodo] || 'bom dia!';
}

function atualizarPeriodoCeuTarefas(periodoForcado) {
    const tabTasks = document.getElementById('tab-tasks');
    if (!tabTasks) return;

    if (periodoForcado && ['manha', 'tarde', 'noite'].includes(periodoForcado)) {
        periodoManualCeu = periodoForcado;
    }

    const periodoFinal = periodoManualCeu || obterPeriodoAtualPelaHora();
    tabTasks.setAttribute('data-periodo', periodoFinal);
    atualizarSaudacaoTarefas(periodoFinal);
}


function resetarPeriodoCeuAutomatico() {
    periodoManualCeu = null;
    atualizarPeriodoCeuTarefas();
}

function criarEstadoTarefasVazio() {
    return {
        manha: [],
        tarde: [],
        noite: []
    };
}

function carregarTarefasTurnos() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_TAREFAS_STORAGE));
        if (!salvo || typeof salvo !== 'object') return criarEstadoTarefasVazio();

        const base = criarEstadoTarefasVazio();
        TURNOS_TAREFAS.forEach(turno => {
            if (Array.isArray(salvo[turno])) {
                base[turno] = salvo[turno].filter(item => item && typeof item.texto === 'string');
            }
        });
        return base;
    } catch {
        return criarEstadoTarefasVazio();
    }
}

function salvarTarefasTurnos() {
    try {
        localStorage.setItem(CHAVE_TAREFAS_STORAGE, JSON.stringify(tarefasTurnos));
    } catch (erro) {
        console.warn('Não foi possível salvar as tarefas no localStorage:', erro);
    }
}

let tarefasTurnos = carregarTarefasTurnos();
let estadoArrasteTarefa = null;

function adicionarTarefaTurno(turno, textoBruto) {
    if (!TURNOS_TAREFAS.includes(turno)) return;
    const texto = (textoBruto || '').trim();
    if (!texto) return;

    tarefasTurnos[turno].push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        texto,
        concluida: false
    });

    salvarTarefasTurnos();
    renderizarTurnoTarefas(turno);
}

function alternarTarefaTurno(turno, idTarefa) {
    if (!TURNOS_TAREFAS.includes(turno)) return;
    const lista = tarefasTurnos[turno];
    const alvo = lista.find(item => item.id === idTarefa);
    if (!alvo) return;

    alvo.concluida = !alvo.concluida;
    salvarTarefasTurnos();
    renderizarTurnoTarefas(turno);
}

function removerTarefaTurno(turno, idTarefa) {
    if (!TURNOS_TAREFAS.includes(turno)) return;
    tarefasTurnos[turno] = tarefasTurnos[turno].filter(item => item.id !== idTarefa);
    salvarTarefasTurnos();
    renderizarTurnoTarefas(turno);
}

function limparTarefasConcluidas() {
    TURNOS_TAREFAS.forEach(turno => {
        tarefasTurnos[turno] = tarefasTurnos[turno].filter(item => !item.concluida);
    });
    salvarTarefasTurnos();
    renderizarTodasTarefasTurnos();
}

function moverTarefaPorPosicao(turnoOrigem, idTarefa, turnoDestino, indiceDestino) {
    if (!TURNOS_TAREFAS.includes(turnoOrigem) || !TURNOS_TAREFAS.includes(turnoDestino)) return;

    const listaOrigem = tarefasTurnos[turnoOrigem];
    const indiceAtual = listaOrigem.findIndex(item => item.id === idTarefa);
    if (indiceAtual === -1) return;

    const [itemMovido] = listaOrigem.splice(indiceAtual, 1);
    const listaDestino = tarefasTurnos[turnoDestino];

    let alvoIndice = typeof indiceDestino === 'number' ? indiceDestino : listaDestino.length;
    if (turnoOrigem === turnoDestino && indiceAtual < alvoIndice) {
        alvoIndice = Math.max(0, alvoIndice - 1);
    }
    alvoIndice = Math.max(0, Math.min(alvoIndice, listaDestino.length));

    listaDestino.splice(alvoIndice, 0, itemMovido);

    salvarTarefasTurnos();
    renderizarTodasTarefasTurnos();
}

function configurarArrasteItem(li, turno, idTarefa, handleEl) {
    li.draggable = true;

    li.addEventListener('dragstart', function(event) {
        estadoArrasteTarefa = { turnoOrigem: turno, idTarefa };
        li.classList.add('dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', idTarefa);
        }
    });

    li.addEventListener('dragend', function() {
        li.classList.remove('dragging');
        document.querySelectorAll('.task-item-row.drag-over').forEach(el => el.classList.remove('drag-over'));
        estadoArrasteTarefa = null;
    });

    li.addEventListener('dragover', function(event) {
        if (!estadoArrasteTarefa) return;
        event.preventDefault();
        li.classList.add('drag-over');
    });

    li.addEventListener('dragleave', function() {
        li.classList.remove('drag-over');
    });

    li.addEventListener('drop', function(event) {
        event.preventDefault();
        li.classList.remove('drag-over');
        if (!estadoArrasteTarefa) return;

        const listaEl = li.parentElement;
        const turnoDestino = listaEl ? listaEl.getAttribute('data-turno') : turno;
        const filhos = listaEl ? Array.from(listaEl.querySelectorAll('.task-item-row')) : [];
        const rect = li.getBoundingClientRect();
        const depoisDoMeio = event.clientY > rect.top + rect.height / 2;
        const indiceBase = filhos.indexOf(li);
        const indiceDestino = depoisDoMeio ? indiceBase + 1 : indiceBase;

        moverTarefaPorPosicao(
            estadoArrasteTarefa.turnoOrigem,
            estadoArrasteTarefa.idTarefa,
            turnoDestino,
            indiceDestino
        );
        estadoArrasteTarefa = null;
    });

    if (handleEl) {
        handleEl.addEventListener('touchstart', function() {
            estadoArrasteTarefa = { turnoOrigem: turno, idTarefa };
            li.classList.add('dragging');
        }, { passive: true });

        handleEl.addEventListener('touchmove', function(event) {
            if (!estadoArrasteTarefa || !event.touches.length) return;
            event.preventDefault();

            const toque = event.touches[0];
            const elementoSobToque = document.elementFromPoint(toque.clientX, toque.clientY);
            const alvoLinha = elementoSobToque ? elementoSobToque.closest('.task-item-row') : null;

            document.querySelectorAll('.task-item-row.drag-over').forEach(el => el.classList.remove('drag-over'));
            if (alvoLinha && alvoLinha !== li) {
                alvoLinha.classList.add('drag-over');
            }
        }, { passive: false });

        handleEl.addEventListener('touchend', function(event) {
            li.classList.remove('dragging');
            const linhaSobre = document.querySelector('.task-item-row.drag-over');
            document.querySelectorAll('.task-item-row.drag-over').forEach(el => el.classList.remove('drag-over'));

            if (!estadoArrasteTarefa) return;

            if (linhaSobre) {
                const listaEl = linhaSobre.parentElement;
                const turnoDestino = listaEl ? listaEl.getAttribute('data-turno') : turno;
                const filhos = listaEl ? Array.from(listaEl.querySelectorAll('.task-item-row')) : [];
                const indiceDestino = filhos.indexOf(linhaSobre);

                moverTarefaPorPosicao(
                    estadoArrasteTarefa.turnoOrigem,
                    estadoArrasteTarefa.idTarefa,
                    turnoDestino,
                    indiceDestino
                );
            } else if (event.changedTouches.length) {
                const toque = event.changedTouches[0];
                const elAlvo = document.elementFromPoint(toque.clientX, toque.clientY);
                const listaAlvo = elAlvo ? elAlvo.closest('.task-items-list') : null;
                if (listaAlvo) {
                    const turnoDestino = listaAlvo.getAttribute('data-turno');
                    const totalDestino = (tarefasTurnos[turnoDestino] || []).length;
                    moverTarefaPorPosicao(
                        estadoArrasteTarefa.turnoOrigem,
                        estadoArrasteTarefa.idTarefa,
                        turnoDestino,
                        totalDestino
                    );
                }
            }

            estadoArrasteTarefa = null;
        });
    }
}

function configurarDropEmListasVazias() {
    document.querySelectorAll('.task-items-list').forEach(listaEl => {
        listaEl.addEventListener('dragover', function(event) {
            if (!estadoArrasteTarefa) return;
            event.preventDefault();
        });

        listaEl.addEventListener('drop', function(event) {
            if (!estadoArrasteTarefa) return;
            event.preventDefault();
            if (event.target.closest('.task-item-row')) return;

            const turnoDestino = listaEl.getAttribute('data-turno');
            const totalDestino = (tarefasTurnos[turnoDestino] || []).length;
            moverTarefaPorPosicao(
                estadoArrasteTarefa.turnoOrigem,
                estadoArrasteTarefa.idTarefa,
                turnoDestino,
                totalDestino
            );
            estadoArrasteTarefa = null;
        });
    });
}

function renderizarTurnoTarefas(turno) {
    const ul = document.getElementById(`list-${turno}`);
    const contador = document.getElementById(`count-${turno}`);
    if (!ul) return;

    const itens = tarefasTurnos[turno] || [];
    const feitas = itens.filter(item => item.concluida).length;

    if (contador) {
        contador.textContent = `${feitas}/${itens.length}`;
    }

    ul.innerHTML = '';

    itens.forEach(item => {
        const li = document.createElement('li');
        li.className = 'task-item-row';

        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'task-drag-handle';
        handle.setAttribute('aria-label', 'Arrastar para reordenar');
        handle.textContent = '⋮⋮';

        const label = document.createElement('label');
        label.className = 'task-item-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-item-checkbox';
        checkbox.checked = Boolean(item.concluida);
        checkbox.addEventListener('change', () => alternarTarefaTurno(turno, item.id));

        const spanTexto = document.createElement('span');
        spanTexto.className = 'task-item-text';
        if (item.concluida) spanTexto.classList.add('concluida');
        spanTexto.textContent = item.texto;

        label.appendChild(checkbox);
        label.appendChild(spanTexto);

        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.className = 'task-delete-btn';
        btnExcluir.setAttribute('aria-label', 'Apagar tarefa');
        btnExcluir.textContent = '×';
        btnExcluir.addEventListener('click', () => removerTarefaTurno(turno, item.id));

        li.appendChild(handle);
        li.appendChild(label);
        li.appendChild(btnExcluir);

        configurarArrasteItem(li, turno, item.id, handle);
        ul.appendChild(li);
    });
}

function renderizarTodasTarefasTurnos() {
    TURNOS_TAREFAS.forEach(renderizarTurnoTarefas);
}

document.querySelectorAll('.task-add-form').forEach(form => {
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const turno = form.getAttribute('data-turno');
        const input = form.querySelector('.task-add-input');
        if (!input) return;

        adicionarTarefaTurno(turno, input.value);
        input.value = '';
        input.focus();
    });
});

const btnLimparFeitas = document.getElementById('btn-clear-done-tasks');
if (btnLimparFeitas) {
    btnLimparFeitas.addEventListener('click', limparTarefasConcluidas);
}

atualizarPeriodoCeuTarefas();
setInterval(() => atualizarPeriodoCeuTarefas(), 60000);
configurarDropEmListasVazias();
renderizarTodasTarefasTurnos();

// =============================== INICIALIZAÇÃO =================================
atualizarBotaoOrdemLista();
renderCalendar();
atualizarModoVisualizacao();