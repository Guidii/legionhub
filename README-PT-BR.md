# LegionHub Data v0.2

Este pacote contém a segunda extração estruturada do mapa:

`Legion_TD_11.4b-beta1_Team_OZE.w3x`

## O que foi extraído

- 838 objetos de unidade
- 971 objetos de habilidade
- 16 builders
- 93 objetos `Deploy`
- 200 objetos `Promote`
- 76 variantes de mercenários
- 25 nomes únicos de mercenários
- 342 habilidades referenciadas

## Arquivos principais

- `data/11.4b-beta1/builders.json`
- `data/11.4b-beta1/fighters.json`
- `data/11.4b-beta1/fighter-upgrades.json`
- `data/11.4b-beta1/mercenaries.json`
- `data/11.4b-beta1/mercenary-groups.json`
- `data/11.4b-beta1/abilities-referenced.json`
- `data/11.4b-beta1/current-roll-example.json`
- `tools/extract_legion_data.py`

## Como executar novamente

No terminal:

```powershell
python tools\extract_legion_data.py "CAMINHO_DA_PASTA_EXTRAIDA" "data\11.4b-beta1"
```

O script usa somente bibliotecas padrão do Python.

## Limitações atuais

- A relação exata entre cada variante de mercenário e os modos PRCC/PHCC ainda não foi confirmada.
- Waves ainda não foram normalizadas.
- Alguns objetos especiais, como Hybrid e Altar of Heroes, aparecem junto dos objetos `Deploy`.
- Os dados são da build `11.4b-beta1`, não de uma versão final genérica chamada apenas `11.4b`.
