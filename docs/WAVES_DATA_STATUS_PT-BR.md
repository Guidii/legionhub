# Estado dos dados de waves — Legion TD 11.4b-beta1

## Objetivo e escopo

`waves-preliminary.json` é uma base provisória orientada por evidências. Ela preserva separadamente:

- a associação entre número da wave e rawcode;
- os atributos da unidade existentes no object data;
- o nível de confiança da associação;
- os campos ainda desconhecidos.

Esta base não é o `waves.json` definitivo e ainda não deve alimentar automaticamente o Legion Coach, recomendações, scores ou matchups.

## Níveis de confiança

Somente estes níveis são usados:

- `confirmed-directly`: existe evidência explícita na fonte indicada;
- `inferred-from-sequence`: a posição vem da sequência candidata, sem confirmação direta;
- `unknown`: a informação não foi determinada.

Os stats de uma unidade podem estar confirmados diretamente no object data mesmo quando sua associação com um número de wave é apenas inferida. O campo `numberConfidence` classifica especificamente a associação wave → rawcode.

## Associações confirmadas diretamente

Exatamente oito associações possuem `numberConfidence: "confirmed-directly"`:

| Wave | Creep | Rawcode | Evidência |
|---:|---|---|---|
| 2 | Murloc | `h000` | `extendedTooltip` contém `LEVEL 2` |
| 9 | Zombie | `h008` | `extendedTooltip` contém `LEVEL 9` |
| 11 | Clockwerk Goblin | `h00A` | `extendedTooltip` contém `LEVEL 11` |
| 12 | Siren | `h00B` | `extendedTooltip` contém `LEVEL 12` |
| 15 | Centaur | `h00E` | `extendedTooltip` contém `LEVEL 15` |
| 18 | Sludge Flinger | `h00H` | `extendedTooltip` contém `LEVEL 18` |
| 19 | Giant Spider | `h00J` | `extendedTooltip` contém `LEVEL 19` |
| 31 | Pit Lord | `h05L` | `extendedTooltip` contém `LEVEL 31` |

O Pit Lord também possui a habilidade `A04Y` (`Boss Unit`) no object data. Isso confirma a classificação da unidade como boss, mas não confirma que a wave 31 faça parte do fluxo normal de waves.

## Associações inferidas

As demais posições candidatas das waves 1–30 usam `numberConfidence: "inferred-from-sequence"`.

Elas preservam a sequência de rawcodes identificada na investigação, porém não possuem um `LEVEL n` explícito no object data nem um vínculo recuperado do payload Luraph. Nenhuma dessas associações deve ser exibida ou descrita como fato.

Os nomes e atributos dessas unidades vêm diretamente de `all-units.json`; isso não eleva a confiança de sua associação com a wave.

## Campos ausentes

Os campos abaixo permanecem `null` em todas as waves porque não foram comprovados:

- `quantity`;
- `spawnInterval`;
- `modeOverrides`;
- `bounty`;
- `income`;
- velocidade e tipo de movimento;
- condição `air`.

`boss` permanece `null` em todas as waves exceto no Pit Lord, cuja habilidade `Boss Unit` é evidência direta. Não foi inferida nenhuma boss wave adicional.

Quando o object data não fornece um atributo de stats ou ataque, o valor correspondente também permanece `null`. Nenhum dano, alcance ou tipo ausente foi derivado de conhecimento genérico do Warcraft III.

## Bloqueio do payload Luraph

A desserialização estática recuperou apenas o bootstrap do payload:

- 24.870 de 1.426.368 bytes foram consumidos;
- restaram 1.401.498 bytes;
- o estágio seguinte depende de uma closure virtual auxiliar;
- os opcodes da VM não foram executados;
- tokens de modo, rawcodes das waves e quantidades não foram recuperados nesse primeiro estágio.

Por isso, quantidade, regras de spawn, overrides e a gramática completa dos modos continuam desconhecidos. A investigação foi interrompida antes de devirtualizar ou executar a VM.

## Modos observados

Os seguintes textos foram relatados como exemplos observados por jogador:

- `PRCCx3`;
- `PHCCx3`;
- `PRCCx3EZ`;
- `PRCCx3LG`.

Eles são exemplos de entrada, não uma gramática confirmada. Este documento não atribui significado técnico a `PR`, `PH`, `x3`, `EZ` ou `LG`.

`CC` foi confirmado diretamente somente no sentido de habilitar **Challenge a Champion**. Essa confirmação isolada não determina como `CC` se combina com os demais tokens nem se altera stats, quantidade ou comportamento das waves.

## Integração futura com a matriz de dano

O dataset preserva `defenseTypeRaw` e `attackTypeRaw` conforme extraídos. Isso permite uma futura integração controlada com `damage-matrix.json`.

Nesta etapa não são calculados:

- multiplicadores de matchup;
- score;
- melhor unidade;
- recomendação estratégica;
- vencedor ou counter automático.

Especialmente, `chaos` continua fora da matriz confirmada do mapa e não recebe multiplicadores inventados.

## Evolução e correções futuras

A estrutura é deliberadamente corrigível. Novas evidências podem:

1. promover uma associação de `inferred-from-sequence` para `confirmed-directly`;
2. corrigir ou remover uma posição candidata;
3. preencher quantidade, spawn e variações por modo;
4. confirmar outras boss waves ou unidades aéreas;
5. separar stats base de modificadores aplicados em runtime.

Até que essas evidências existam, associações inferidas devem permanecer claramente rotuladas e a base não deve orientar automaticamente o Legion Coach.

