# Relatório de extração v0.2

## Avanço principal

Descobrimos que o mapa contém dois conjuntos complementares de dados de unidade:

- `File00000003.xxx`: dados de gameplay, como custo, HP, dano, cooldown, armadura e upgrades.
- `File00000735.xxx`: nomes, ícones, modelos e tooltips mostrados ao jogador.

Ao unir os dois arquivos, conseguimos criar registros completos e utilizáveis pelo LegionHub.

## Relações confirmadas no roll analisado

| Unidade base | Custo | Upgrade direto | Custo do upgrade | Valor total |
|---|---:|---|---:|---:|
| Frost Wolf | 45 | Pandaren | 115 | 160 |
| Tribesman | 60 | Alpha Male | 110 | 170 |
| Wyvern | 150 | Wind Rider | 190 | 340 |
| Tempest | 130 | Leviathan | 200 | 330 |
| Goblin Scientist | 30 | Dwarven Engineer | 130 | 160 |
| Spawn of Dragon | 265 | Dragon Aspect | 350 | 615 |

## Correções importantes

Os dados reais do mapa mostram que:

- Pandaren é upgrade direto do Frost Wolf.
- Dragon Aspect é upgrade do Spawn of Dragon.
- Wyvern construída e Wyvern enviada são objetos diferentes.
- Tribesman é ranged, com alcance 325.
- O mapa possui várias variantes de alguns mercenários, com custos e atributos diferentes.

Isso confirma por que não devemos montar o Coach usando memória ou dicas genéricas.

## Próximo objetivo

A próxima etapa deve ser:

1. normalizar as waves;
2. identificar as variantes de mercenários por modo;
3. definir o primeiro esquema de banco do LegionHub;
4. importar builders, fighters, upgrades e habilidades no site;
5. criar os primeiros testes de regressão do Coach.
