# Quem torce pelo Brasil

Site que lista os candidatos e candidatas a deputado federal e senador nas eleições de 2026 que se comprometem a manter a proibição das bets e dos jogos de azar virtuais no Brasil (Medida Provisória nº 1.394, de 25 de setembro de 2026).

## Como um candidato entra na lista

1. O(a) candidato(a) preenche o formulário (botão "Quero assinar o compromisso").
2. A resposta cai na planilha do Google Sheets, aba "Respostas ao formulário 1".
3. Depois de conferir os dados, marque a caixinha da coluna **VERIFICADO** na linha do candidato.
4. A aba "Lista pública" (publicada como CSV) atualiza sozinha e o site passa a mostrar o nome em poucos minutos.

O site só lê a aba "Lista pública", que tem apenas nome de urna, partido, estado, cargo, data e link da fonte. CPF e contatos nunca saem da aba de respostas.

## Reserva: candidatos.json

Se a planilha ficar fora do ar, o site usa o arquivo `candidatos.json`. Para preenchê-lo à mão, acrescente itens à lista `candidatos` e atualize `atualizado_em`.

```json
{
  "atualizado_em": "2026-09-29",
  "candidatos": [
    {
      "nome": "Nome completo",
      "nome_urna": "Nome de urna",
      "numero": "1234",
      "partido": "SIGLA",
      "uf": "SP",
      "cargo": "Deputado(a) Federal",
      "data": "2026-09-29",
      "fonte": "https://link-para-a-declaracao"
    }
  ]
}
```

- `cargo` deve ser exatamente `Deputado(a) Federal` ou `Senador(a)`.
- `uf` é a sigla do estado, em maiúsculas.
- `data` usa o formato `AAAA-MM-DD`.
- `fonte` é o link público que comprova o compromisso.

Separe um item do outro com vírgula. O link do botão "Quero assinar o compromisso" fica no começo de `app.js`, em `linkParticipe`.

## Ver no computador

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000.
