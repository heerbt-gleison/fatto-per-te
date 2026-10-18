// ============================================================================
// SCRIPT.JS FINAL — FATTO PER TE (SINCRONIZADO COM GOOGLE PLANILHAS)
// ============================================================================

const CONFIG = {
  // 👉 COLE AQUI A URL DO GOOGLE APPS SCRIPT (terminada em /exec)
  // Quando essa URL estiver preenchida, o site puxa os preços, produtos,
  // nomes das padarias e senha direto da planilha automaticamente!
  googleScriptUrl: "https://script.google.com/macros/s/AKfycbyLq8bjChkLiS0tU3qWOG62CB9IKD7x-Jqsk1YCFqU/exec",

  // Códigos de parceiro padrão (caso a planilha ainda não esteja conectada)
  codigosParceiroValidos: ["FATTO", "PADARIA", "1234"]
};

// Catálogo inicial (usado instantaneamente ao abrir e atualizado pela Planilha em seguida)
let CATALOGO = [
  {
    id: "TOP-01",
    nome: "Topper de Bolo Temático Personalizado",
    desc: "Personagens, Infantil, Futebol, Séries (Ex: One Piece, Roblox, Miraculous)",
    precoCliente: 25.00,
    precoPadaria: 16.00
  },
  {
    id: "TOP-02",
    nome: "Balloon Cake Topper & Flores 3D",
    desc: "Letras com efeito balão metalizado + flores em camadas e folhagem dourada",
    precoCliente: 38.00,
    precoPadaria: 26.00
  },
  {
    id: "TOP-03",
    nome: "Topo Especial 3D em Camadas / Com Foto",
    desc: "Cenários ricos em camadas ou foto personalizada (Ex: Fazendinha, Barbearia)",
    precoCliente: 35.00,
    precoPadaria: 24.00
  },
  {
    id: "TOP-04",
    nome: "Topper Corporativo / Empresarial",
    desc: "Personalizado com a marca da empresa para comemorações (Ex: Cymco, TranspoTech)",
    precoCliente: 32.00,
    precoPadaria: 22.00
  },
  {
    id: "CES-01",
    nome: "Cestas que Emocionam (Box + Balão)",
    desc: "Café da Manhã, Aniversário, Infantil, Maternidade, Namorados ou Corporativo",
    precoCliente: 110.00,
    precoPadaria: 88.00
  },
  {
    id: "MIM-01",
    nome: "Cone Floral / Mimos & Papelaria Criativa",
    desc: "Cones florais personalizados, lembrancinhas e artigos para festas",
    precoCliente: 45.00,
    precoPadaria: 34.00
  }
];

let estadoAtual = {
  tipoCliente: "Cliente Avulso",
  parceiroAutenticado: false,
  produtoSelecionado: CATALOGO[0]
};

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function obterPrecoAtual(item) {
  if (estadoAtual.tipoCliente === "Panificadora Parceira" && estadoAtual.parceiroAutenticado) {
    return item.precoPadaria;
  }
  return item.precoCliente;
}

// ============================================================================
// FUNÇÃO QUE BUSCA OS PREÇOS, PRODUTOS E SENHA DIRETO DA PLANILHA GOOGLE
// ============================================================================
async function carregarCatalogoDaPlanilha() {
  if (!CONFIG.googleScriptUrl) {
    return; // Se ainda estiver sem URL (modo demonstração), mantém o catálogo padrão
  }

  const badgeSync = document.getElementById("syncStatusBadge");
  if (badgeSync) {
    badgeSync.style.display = "inline-block";
    badgeSync.textContent = "🔄 Atualizando tabela de preços...";
  }

  try {
    const resposta = await fetch(CONFIG.googleScriptUrl);
    const dados = await resposta.json();

    if (dados && dados.status === "sucesso") {
      // 1. Atualiza a lista de produtos e preços vinda da aba 'Catalogo e Precos'
      if (Array.isArray(dados.catalogo) && dados.catalogo.length > 0) {
        CATALOGO = dados.catalogo;
        estadoAtual.produtoSelecionado = CATALOGO[0];
      }

      // 2. Atualiza a senha das panificadoras vinda da célula I5
      if (dados.senhaParceiro) {
        CONFIG.codigosParceiroValidos = [dados.senhaParceiro.toUpperCase(), "FATTO"];
      }

      // 3. Atualiza a lista de Panificadoras Parceiras vinda da aba 'Painel Fatto Per Te'
      if (Array.isArray(dados.panificadoras) && dados.panificadoras.length > 0) {
        atualizarSelectPadarias(dados.panificadoras);
      }

      renderProducts();
      updateSummary();

      if (badgeSync) {
        badgeSync.textContent = "✅ Preços sincronizados em tempo real";
        setTimeout(() => {
          badgeSync.style.display = "none";
        }, 3500);
      }
    }
  } catch (erro) {
    console.warn("Usando catálogo padrão (planilha offline ou não conectada):", erro);
    if (badgeSync) {
      badgeSync.style.display = "none";
    }
  }
}

function atualizarSelectPadarias(listaPadarias) {
  const select = document.getElementById("padariaSelect");
  if (!select) return;

  select.innerHTML = "";
  listaPadarias.forEach((nome) => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    select.appendChild(opt);
  });

  const optOutra = document.createElement("option");
  optOutra.value = "OUTRA";
  optOutra.textContent = "+ Outra Panificadora (Digitar nome)";
  select.appendChild(optOutra);
}

// Alternância entre Cliente Final e Área Panificadoras
function selectClientTab() {
  estadoAtual.tipoCliente = "Cliente Avulso";
  document.getElementById("btnCliente").classList.add("active");
  document.getElementById("btnPadaria").classList.remove("active");

  document.getElementById("partnerLockBox").style.display = "none";
  document.getElementById("partnerBanner").style.display = "none";

  document.getElementById("grupoNomeCliente").style.display = "block";
  document.getElementById("clienteNome").required = true;
  document.getElementById("grupoSelectPadaria").style.display = "none";
  document.getElementById("grupoOutraPadaria").style.display = "none";

  renderProducts();
  updateSummary();
}

function selectBakeryTab() {
  document.getElementById("btnCliente").classList.remove("active");
  document.getElementById("btnPadaria").classList.add("active");

  if (estadoAtual.parceiroAutenticado) {
    ativarInterfaceParceiro();
  } else {
    document.getElementById("partnerLockBox").style.display = "block";
    document.getElementById("lockErrorMsg").style.display = "none";
    document.getElementById("partnerCodeInput").focus();
  }
}

function unlockPartnerMode() {
  const input = document.getElementById("partnerCodeInput").value.trim().toUpperCase();

  if (CONFIG.codigosParceiroValidos.includes(input)) {
    estadoAtual.parceiroAutenticado = true;
    estadoAtual.tipoCliente = "Panificadora Parceira";
    document.getElementById("partnerCodeInput").value = "";
    document.getElementById("lockErrorMsg").style.display = "none";
    ativarInterfaceParceiro();
  } else {
    document.getElementById("lockErrorMsg").style.display = "block";
  }
}

function ativarInterfaceParceiro() {
  estadoAtual.tipoCliente = "Panificadora Parceira";
  document.getElementById("partnerLockBox").style.display = "none";
  document.getElementById("partnerBanner").style.display = "flex";
  document.getElementById("btnPadaria").innerHTML = "🥐 Panificadora (Ativo)";

  document.getElementById("grupoNomeCliente").style.display = "none";
  document.getElementById("clienteNome").required = false;
  document.getElementById("grupoSelectPadaria").style.display = "block";

  handleBakerySelectChange();
  renderProducts();
  updateSummary();
}

function lockPartnerMode() {
  estadoAtual.parceiroAutenticado = false;
  document.getElementById("btnPadaria").innerHTML = "🔒 Área Panificadoras";
  selectClientTab();
}

function handleBakerySelectChange() {
  const sel = document.getElementById("padariaSelect").value;
  const grupoOutra = document.getElementById("grupoOutraPadaria");
  const inputOutra = document.getElementById("outraPadariaNome");

  if (sel === "OUTRA") {
    grupoOutra.style.display = "block";
    inputOutra.required = true;
  } else {
    grupoOutra.style.display = "none";
    inputOutra.required = false;
  }
  updateSummary();
}

function obterNomeClienteOuPadaria() {
  if (estadoAtual.tipoCliente === "Panificadora Parceira" && estadoAtual.parceiroAutenticado) {
    const sel = document.getElementById("padariaSelect").value;
    if (sel === "OUTRA") {
      return document.getElementById("outraPadariaNome").value.trim() || "Nova Panificadora";
    }
    return sel;
  }
  return document.getElementById("clienteNome").value.trim() || "-";
}

function renderProducts() {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  CATALOGO.forEach((item) => {
    const isSelected = estadoAtual.produtoSelecionado.id === item.id;
    const preco = obterPrecoAtual(item);

    const card = document.createElement("div");
    card.className = "product-option" + (isSelected ? " selected" : "");
    card.onclick = () => {
      estadoAtual.produtoSelecionado = item;
      renderProducts();
      updateSummary();
    };

    card.innerHTML = `
      <div class="prod-info">
        <h3>${item.nome}</h3>
        <span>${item.desc}</span>
      </div>
      <div class="prod-price">${formatarMoeda(preco)}</div>
    `;
    container.appendChild(card);
  });
}

function updateSummary() {
  const prod = estadoAtual.produtoSelecionado;
  const preco = obterPrecoAtual(prod);
  const nomeCliente = obterNomeClienteOuPadaria();
  const tema = document.getElementById("temaFesta").value.trim() || "-";
  const nomeIdade = document.getElementById("nomeIdade").value.trim();
  const tamanho = document.getElementById("tamanhoBolo").value;
  const dataRaw = document.getElementById("dataEntrega").value;

  let dataFormatada = "A definir";
  if (dataRaw) {
    const [ano, mes, dia] = dataRaw.split("-");
    dataFormatada = `${dia}/${mes}/${ano}`;
  }

  document.getElementById("sumTipo").textContent = estadoAtual.tipoCliente;
  document.getElementById("sumCliente").textContent = nomeCliente;
  document.getElementById("sumProduto").textContent = prod.nome;
  document.getElementById("sumTema").textContent = nomeIdade ? `${tema} (${nomeIdade})` : tema;
  document.getElementById("sumEntrega").textContent = `${tamanho} • ${dataFormatada}`;
  document.getElementById("sumValor").textContent = formatarMoeda(preco);
}

async function handleOrderSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("btnSubmit");
  const prod = estadoAtual.produtoSelecionado;
  const preco = obterPrecoAtual(prod);
  const numeroEscolhido = document.getElementById("canalAtendimento").value;
  const nomeFinal = obterNomeClienteOuPadaria();

  const dadosPedido = {
    dataPedido: new Date().toLocaleDateString("pt-BR"),
    tipoCliente: estadoAtual.tipoCliente,
    clienteNome: nomeFinal,
    whatsapp: document.getElementById("clienteWhats").value.trim(),
    produto: prod.nome,
    tema: document.getElementById("temaFesta").value.trim(),
    nomeIdade: document.getElementById("nomeIdade").value.trim(),
    tamanhoBolo: document.getElementById("tamanhoBolo").value,
    dataEntrega: document.getElementById("dataEntrega").value.split("-").reverse().join("/"),
    observacoes: document.getElementById("observacoes").value.trim() || "Sem observações",
    valor: preco
  };

  btn.disabled = true;
  btn.innerHTML = "⏳ Registrando pedido na Fatto Per Te...";

  if (CONFIG.googleScriptUrl) {
    try {
      await fetch(CONFIG.googleScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosPedido)
      });
    } catch (err) {
      console.warn("Aviso ao salvar na planilha:", err);
    }
  }

  const textoWhats = [
    `✨ *NOVO PEDIDO — FATTO PER TE* ✨`,
    `_Mais que personalizados, histórias feitas para você_`,
    ``,
    `👤 *Modalidade:* ${dadosPedido.tipoCliente}`,
    `🏠 *Cliente/Parceiro:* ${dadosPedido.clienteNome}`,
    `📱 *WhatsApp:* ${dadosPedido.whatsapp}`,
    `-----------------------------------------`,
    `🎁 *Produto:* ${dadosPedido.produto}`,
    `🎨 *Tema / Ocasião:* ${dadosPedido.tema}`,
    `✨ *Nome/Idade na Arte:* ${dadosPedido.nomeIdade}`,
    `📏 *Bolo / Formato:* ${dadosPedido.tamanhoBolo}`,
    `📅 *Data de Entrega:* ${dadosPedido.dataEntrega}`,
    `📝 *Detalhes:* ${dadosPedido.observacoes}`,
    `-----------------------------------------`,
    `💰 *Valor Estimado:* ${formatarMoeda(dadosPedido.valor)}`,
    ``,
    `Olá! Preenchi meu pedido pelo catálogo digital da Fatto Per Te. Podemos confirmar?`
  ].join("\n");

  const urlWhatsApp = `https://wa.me/${numeroEscolhido}?text=${encodeURIComponent(textoWhats)}`;

  btn.disabled = false;
  btn.innerHTML = "📲 Enviar Pedido Pronto no WhatsApp";

  window.open(urlWhatsApp, "_blank");
}

window.addEventListener("DOMContentLoaded", () => {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 2);
  document.getElementById("dataEntrega").value = amanha.toISOString().split("T")[0];

  // Permite destravar a senha das padarias apertando Enter no campo de senha
  const inputSenha = document.getElementById("partnerCodeInput");
  if (inputSenha) {
    inputSenha.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        unlockPartnerMode();
      }
    });
  }

  renderProducts();
  updateSummary();

  // Busca automaticamente os preços e produtos atualizados lá na Planilha Google
  carregarCatalogoDaPlanilha();
});
