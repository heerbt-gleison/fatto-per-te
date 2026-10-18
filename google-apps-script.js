/**
 * ============================================================================
 * GOOGLE APPS SCRIPT FINAL — FATTO PER TE (@fattoperte.feitopravc)
 * ============================================================================
 * Este código faz DUAS coisas automaticamente:
 * 1. doGet(): Lê os produtos, preços, senha e panificadoras da planilha e
 *    envia para o site (assim as donas mudam o preço na planilha e o site atualiza sozinho!).
 * 2. doPost(): Recebe os pedidos feitos no site e salva na aba 'Pedidos'.
 *
 * COMO ATIVAR NO GOOGLE PLANILHAS (2 MINUTOS):
 * 1. Suba a planilha 'Controle_Pedidos_Fatto_Per_Te.xlsx' no Google Drive.
 * 2. Abra o arquivo e vá em: Arquivo > Salvar como Planilhas Google.
 * 3. Na nova aba que abrir, clique no menu: Extensões > Apps Script.
 * 4. Apague tudo que estiver lá, cole este código inteiro e clique no disquete (Salvar).
 * 5. Clique no botão azul "Implantar" > "Nova implantação".
 * 6. Em "Selecionar tipo" (ícone de engrenagem), escolha "App da Web".
 * 7. Em "Quem pode acessar", selecione "Qualquer pessoa" e clique em "Implantar".
 * 8. Autorize o acesso na sua conta Google, copie a "URL do App da Web" gerada
 *    e cole dentro da variável 'googleScriptUrl' lá no seu arquivo 'script.js'.
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetCat = ss.getSheetByName("Catalogo e Precos");
    var sheetDash = ss.getSheetByName("Painel Fatto Per Te");

    // 1. Lê todos os produtos da aba 'Catalogo e Precos' (a partir da linha 5)
    var lastRowCat = sheetCat.getLastRow();
    var catalogo = [];

    if (lastRowCat >= 5) {
      var valoresCat = sheetCat.getRange(5, 1, lastRowCat - 4, 7).getValues();
      for (var i = 0; i < valoresCat.length; i++) {
        var linha = valoresCat[i];
        var codigo = String(linha[0] || "").trim();
        var nome = String(linha[1] || "").trim();
        var desc = String(linha[2] || "").trim();
        var precoCliente = Number(linha[3]) || 0;
        var precoPadaria = Number(linha[4]) || 0;
        var mostrarNoSite = String(linha[6] || "Sim").trim().toLowerCase();

        // Só envia para o site se tiver nome e estiver marcado como "Sim" na coluna G
        if (nome !== "" && mostrarNoSite !== "não" && mostrarNoSite !== "nao") {
          catalogo.push({
            id: codigo || ("ITEM-" + (i + 1)),
            nome: nome,
            desc: desc,
            precoCliente: precoCliente,
            precoPadaria: precoPadaria
          });
        }
      }
    }

    // 2. Lê a senha das panificadoras configurada na célula I5 da aba 'Catalogo e Precos'
    var senhaPlanilha = String(sheetCat.getRange("I5").getValue() || "FATTO").trim().toUpperCase();

    // 3. Lê os nomes das Panificadoras Parceiras na aba 'Painel Fatto Per Te' (células A9 até A11)
    var panificadoras = [];
    if (sheetDash) {
      var valoresPadarias = sheetDash.getRange("A9:A11").getValues();
      for (var j = 0; j < valoresPadarias.length; j++) {
        var nomePadaria = String(valoresPadarias[j][0] || "").trim();
        if (nomePadaria !== "") {
          panificadoras.push(nomePadaria);
        }
      }
    }

    var resposta = {
      status: "sucesso",
      senhaParceiro: senhaPlanilha,
      panificadoras: panificadoras,
      catalogo: catalogo
    };

    return ContentService
      .createTextOutput(JSON.stringify(resposta))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: erro.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pedidos");
    var data = JSON.parse(e.postData.contents);

    var lastRow = sheet.getLastRow();
    var nextNum = Math.max(1, lastRow - 3);
    var idPedido = "PED-" + ("000" + nextNum).slice(-3);

    sheet.appendRow([
      idPedido,                   // Coluna A: ID Pedido
      data.dataPedido,            // Coluna B: Data Pedido
      data.tipoCliente,           // Coluna C: Modalidade (Panificadora Parceira ou Cliente Avulso)
      data.clienteNome,           // Coluna D: Cliente / Panificadora
      data.whatsapp,              // Coluna E: WhatsApp
      data.produto,               // Coluna F: Produto Escolhido
      data.tema,                  // Coluna G: Tema / Ocasião
      data.nomeIdade,             // Coluna H: Nome e Idade (Arte)
      data.tamanhoBolo,           // Coluna I: Tamanho do Bolo / Formato
      data.dataEntrega,           // Coluna J: Data de Entrega
      data.observacoes,           // Coluna K: Observações
      Number(data.valor) || 0,    // Coluna L: Valor (R$)
      "Na Fila",                  // Coluna M: Status Inicial da Produção
      "Pendente"                  // Coluna N: Status Inicial do Pagamento
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "sucesso", id: idPedido }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: erro.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
