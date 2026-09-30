// Configurações do site: edite aqui.
const CONFIG = {
  // Link para candidatos(as) enviarem o compromisso (formulário, e-mail etc.).
  linkParticipe: "https://docs.google.com/forms/d/e/1FAIpQLSc5VbBBpnOGoep5oIjhkOKz3ZgR0UAmQI0UgoPVEXfleB3tqw/viewform",
  // Data do 1º turno.
  dataEleicao: "2026-10-04T08:00:00-03:00",
  // Aba "Lista pública" da planilha, publicada como CSV. Se falhar, o site usa candidatos.json.
  planilhaCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWGAe1stgGiaMhoe4ZhW-8IBej39SWvpwygJhwkUYdGroFRgudVqtDEV4mjYjVr_Ty-xzW0eeFesKR/pub?gid=1859581503&single=true&output=csv",
};

const ESTADOS = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};
const UFS = Object.keys(ESTADOS).sort((a, b) => ESTADOS[a].localeCompare(ESTADOS[b], "pt-BR"));
const ORDEM_CARGO = { "Senador(a)": 0, "Deputado(a) Federal": 1 };

const el = (id) => document.getElementById(id);
let candidatos = [];

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function formatarData(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function linkSeguro(url) {
  return /^https?:\/\//i.test(url || "") ? url : null;
}

// --- Leitura da planilha ---------------------------------------------------

// Converte o texto CSV em uma lista de objetos, usando a primeira linha como nomes das colunas.
function lerCsv(texto) {
  const linhas = [];
  let linha = [], campo = "", aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const cabecalho = (linhas.shift() || []).map((h) => h.trim().toLowerCase());
  return linhas
    .filter((l) => l.some((v) => v.trim()))
    .map((l) => Object.fromEntries(cabecalho.map((h, i) => [h, (l[i] || "").trim()])));
}

// Aceita "SP", "São Paulo", "sp - São Paulo"...
function siglaEstado(valor) {
  const v = normalizar(valor).trim();
  const direto = v.slice(0, 2).toUpperCase();
  if (v.length <= 4 && ESTADOS[direto]) return direto;
  return UFS.find((uf) => normalizar(ESTADOS[uf]) === v || v.includes(normalizar(ESTADOS[uf]))) || direto;
}

function nomeCargo(valor) {
  return normalizar(valor).includes("senad") ? "Senador(a)" : "Deputado(a) Federal";
}

// "29/09/2026 14:03:12" ou "2026-09-29" -> "2026-09-29"
function dataIso(valor) {
  const br = String(valor || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const iso = String(valor || "").match(/\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : "";
}

async function carregarPlanilha() {
  const resp = await fetch(CONFIG.planilhaCsv, { cache: "no-cache" });
  if (!resp.ok) throw new Error(`Planilha respondeu ${resp.status}`);
  const texto = await resp.text();
  if (!texto.toLowerCase().startsWith("nome_urna")) throw new Error("A planilha não tem o formato esperado");
  return lerCsv(texto)
    .filter((l) => l.nome_urna)
    .map((l) => ({
      nome_urna: l.nome_urna,
      partido: l.partido,
      uf: siglaEstado(l.uf),
      cargo: nomeCargo(l.cargo),
      data: dataIso(l.data),
      fonte: l.fonte,
      numero: l.numero || "",
    }));
}

async function carregarJson() {
  const resp = await fetch("candidatos.json", { cache: "no-cache" });
  const dados = await resp.json();
  return dados.candidatos || [];
}

function cartao(c) {
  const fonte = linkSeguro(c.fonte);
  const sen = c.cargo === "Senador(a)";
  return `
    <li class="cartao">
      <h3>${escapar(c.nome_urna || c.nome)}</h3>
      <span class="meta">${escapar(c.partido)}${c.numero ? ` · nº ${escapar(c.numero)}` : ""}</span>
      <span class="etiqueta${sen ? " sen" : ""}">${escapar(c.cargo)}</span>
      ${fonte ? `<a class="fonte" href="${escapar(fonte)}" target="_blank" rel="noopener">Ver fonte ↗</a>` : `<span class="fonte"></span>`}
    </li>`;
}

function renderizar() {
  const busca = normalizar(el("busca").value.trim());
  const uf = el("filtro-uf").value;
  const cargo = el("filtro-cargo").value;

  const filtrados = candidatos.filter((c) =>
    (!uf || c.uf === uf) &&
    (!cargo || c.cargo === cargo) &&
    (!busca || normalizar([c.nome, c.nome_urna, c.partido, c.numero].join(" ")).includes(busca))
  );

  el("grupos").innerHTML = UFS
    .map((sigla) => {
      const doEstado = filtrados.filter((c) => c.uf === sigla);
      if (!doEstado.length) return "";
      doEstado.sort((a, b) => ORDEM_CARGO[a.cargo] - ORDEM_CARGO[b.cargo]);
      return `
        <section class="grupo" id="uf-${sigla}">
          <h3 class="grupo-titulo">${ESTADOS[sigla]} <span>${sigla} · ${doEstado.length}</span></h3>
          <ul class="cartoes">${doEstado.map(cartao).join("")}</ul>
        </section>`;
    })
    .join("");

  document.querySelectorAll(".estado").forEach((b) => b.setAttribute("aria-pressed", b.dataset.uf === uf));

  el("resultado").textContent = candidatos.length
    ? `Mostrando ${filtrados.length} de ${candidatos.length}`
    : "";

  const vazio = el("vazio");
  vazio.hidden = filtrados.length > 0;
  vazio.innerHTML = candidatos.length
    ? "Nenhum nome encontrado com esses filtros."
    : 'A lista começa vazia. Peça ao seu candidato(a) que <a href="#participe">assine o compromisso</a>.';
}

function atualizarNumeros() {
  el("total-geral").textContent = candidatos.length;
  el("total-dep").textContent = candidatos.filter((c) => c.cargo === "Deputado(a) Federal").length;
  el("total-sen").textContent = candidatos.filter((c) => c.cargo === "Senador(a)").length;

  const dias = Math.ceil((new Date(CONFIG.dataEleicao) - new Date()) / 86400000);
  el("contagem").textContent =
    dias > 1 ? `Faltam ${dias} dias para a eleição, nos ajude a chegar em mais candidatos` :
    dias === 1 ? "A eleição é amanhã, nos ajude a chegar em mais candidatos" :
    dias === 0 ? "Hoje é dia de eleição. Vote consciente!" : "";
}

async function iniciar() {
  el("link-participe").href = CONFIG.linkParticipe;
  el("filtro-uf").insertAdjacentHTML("beforeend", UFS.map((uf) => `<option value="${uf}">${ESTADOS[uf]}</option>`).join(""));

  try {
    candidatos = await carregarPlanilha();
    el("atualizado").textContent = new Date().toLocaleDateString("pt-BR");
  } catch (erro) {
    console.warn("Planilha indisponível, usando candidatos.json", erro);
    try {
      candidatos = await carregarJson();
      el("atualizado").textContent = "—";
    } catch (erro2) {
      console.error("Não foi possível carregar candidatos.json", erro2);
    }
  }
  candidatos.sort((a, b) => (a.nome_urna || a.nome || "").localeCompare(b.nome_urna || b.nome || "", "pt-BR"));

  el("estados").innerHTML = UFS.map((sigla) => {
    const n = candidatos.filter((c) => c.uf === sigla).length;
    return `<button type="button" class="estado" data-uf="${sigla}" title="${ESTADOS[sigla]}" aria-pressed="false">
      <strong>${sigla}</strong><small>${n}</small></button>`;
  }).join("");
  el("estados").addEventListener("click", (e) => {
    const botao = e.target.closest(".estado");
    if (!botao) return;
    const select = el("filtro-uf");
    select.value = select.value === botao.dataset.uf ? "" : botao.dataset.uf;
    renderizar();
  });

  atualizarNumeros();
  renderizar();
  ["busca", "filtro-uf", "filtro-cargo"].forEach((id) => el(id).addEventListener("input", renderizar));
}

iniciar();
