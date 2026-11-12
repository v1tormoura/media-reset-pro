# Media Reset Pro — matriz de funcionalidades (15 tópicos)

Atualizada em 2026-11-02. Situação dos testes automatizados: `npm run build` passou; `npm test` passou com 33 testes em 6 arquivos. O Electron e o instalador não puderam ser executados graficamente devido a Controle de Aplicativo e falha de cache do electron-builder.

| # | Funcionalidade solicitada | Implementação atual | O que falta / limite conhecido | Prioridade | Teste necessário |
|---|---|---|---|---|---|
| 1 | Objetivo, privacidade e preservação de originais | Processamento local; saídas separadas; hash SHA-256 antes/depois; nunca sobrescreve nome existente | Validar fluxo dentro da janela instalada; codecs com perdas não preservam pixels/amostras idênticas | P0 | UI instalada, originais por hash e saída por inspeção |
| 2 | Arquitetura desktop e inicialização | Electron + React/TS; preload isolado; caminhos `app.getAppPath`; bootstrap registra exceções, preload, renderer, crash e ciclo da janela em JSONL | Runtime foi bloqueado antes do bootstrap; nenhum resultado de janela/menu no Windows desta sessão | P0 | Instalação autorizada; validar sequência em `%TEMP%\\MediaResetPro-startup.log` |
| 3 | Importação em massa | Arquivos, pastas e recursão; tipos de mídia por extensão; deduplicação de caminhos e SHA-256; unicode | Sem filtro na lista, miniaturas e pastas de origem preservadas; varredura grande ainda é sequencial | P1 | 1.000 itens, duplicatas, diretórios aninhados, arquivos inválidos |
| 4 | Motor de vídeo | FFmpeg via `spawn`; H.264/H.265/AV1 configuráveis, AAC, áudio opcional, progresso real, saída temporária e transcodificação/cópia | Não cobre seleção de faixas, FPS/GOP, rotação HDR complexa, GPU/fallback, timeout configurável ou todos os contêineres/codecs | P1 | Matriz de codecs, dimensões, áudio, múltiplas trilhas, container e falhas |
| 5 | Metadados de vídeo | FFprobe antes/depois; remoção opcional de tags mapeáveis/capítulos; relatório JSON | Anexos, GPS semântico, todas as tags por stream e metadados privados do container não são exaustivamente classificados | P1 | Fixtures com tags globais/stream, capítulos, anexos e metadados sensíveis |
| 6 | Motor de imagens | Sharp/libvips; correção EXIF de orientação; redimensionamento; alfa; relatório ICC/EXIF/XMP/IPTC; decodificação final completa | GIF animado/HEIF e metadados de todos os formatos ainda exigem validação específica; GIF pode achatar conforme codificador | P1 | HEIF, GIF animado, ICC/XMP/IPTC, transparência e orientação em mais formatos |
| 7 | Modos e presets | Limpeza, reencodificação, combinado e MP4 H.264/AAC; 9 perfis selecionáveis e controles ajustáveis | Perfis Instagram/TikTok são orientações conservadoras, não especificações garantidas; feed não força 1:1; proporção de origem é preservada | P1 | Verificar parâmetros efetivos por arquivo e compatibilidade nas plataformas autorizadas |
| 8 | Lotes e fila | Controlador comum com concorrência 1–8, pausa entre itens ativos, retomada, cancelamento individual/lote, retry, progresso e recuperação de `processing` para `pending` | Fechamento abrupto, persistência em falha de disco, lote com 1.000 itens e controles IPC/UI não testados graficamente | P0 | 1.000 itens, interrupção no meio da gravação, restart e cancelamento em cada estágio |
| 9 | Qualidade e compressão | CRF vídeo e qualidade de imagem; presets máxima/equilibrada/compacta; controles editáveis após selecionar perfil | Sem métrica perceptual/estimativa de tamanho; compressão com perdas não garante qualidade visual idêntica | P2 | Comparação visual e medida de bitrate/tamanho em conjunto de imagens e vídeos |
| 10 | Integridade da saída | Hash, tamanho, probe de streams e áudio; agora decodifica integralmente os vídeos finais e Sharp decodifica a imagem inteira | Não valida sincronismo por tolerância, cor HDR, áudio perceptual, nem reconstrói conteúdo esperado | P0 | Saída truncada, codec, stream, duração, áudio, hash e arquivos corrompidos |
| 11 | Destino e colisões | Pastas Videos/Imagens/Relatorios; nomes reservados com criação exclusiva; temporários no destino; rename atômico | Árvore de diretórios da origem não é mantida; limpeza de arquivos órfãos após encerramento forçado pendente | P1 | Colisões simultâneas, caracteres especiais, falta de espaço e temporários antigos |
| 12 | Interface e métricas | Páginas Processar/Fila/Histórico/Configurações; progresso agregado real; cancelar/retry/abrir relatório; configurar ferramentas e concorrência | Não foi possível confirmar menus nativos/fluxo visual; faltam CPU/RAM/GPU, filtros, busca e relatório exportável | P0 | Fluxo integral por janela Electron autorizada e revisão de responsividade |
| 13 | Distribuição e dependências | NSIS x64; Sharp configurado para asarUnpack; FFmpeg/FFprobe podem ser escolhidos e validados sem PATH | Esta rodada não conseguiu gerar novo instalador: electron-builder falhou com EPERM ao mover o ZIP Electron no cache. FFmpeg não é redistribuído; não assinado | P0 | Build NSIS em ambiente de empacotamento autorizado, instalar, validar binários nativos |
| 14 | Testes | 33 passaram: fila (pausa, cancelamentos, concorrência, retry/recuperação), lote de 100 via Sharp e 100 via FFmpeg, lote misto real com dois vídeos + imagem, metadata, alfa, orientação, codecs e entradas corrompidas | Sem teste visual/IPC instalado; falta matriz extensa de trilhas, HDR e 1.000 itens | P0 | Reexecutar no Windows liberado e anexar logs de sessão/resultados |
| 15 | Entrega verificável | Código atualizado e ZIP fonte; matriz, relatório e roteiro de Windows; build TypeScript/Vite/Electron passa | Instalador em `outputs` é anterior à rodada e não deve ser usado como build atualizado; novo pacote bloqueado por EPERM | P0 | Instalar somente o novo NSIS quando produzido e concluir roteiro abaixo |

## Interpretação do encerramento anterior

Na tentativa anterior, o PowerShell reportou literalmente “Uma política de Controle de Aplicativo bloqueou este arquivo”; não houve log de bootstrap, consistente com bloqueio antes de executar JavaScript. Não contornei a política. Nesta rodada, a execução de `npm run dist` montou o build, mas a distribuição parou ao renomear o arquivo Electron no cache (`EPERM`). São bloqueios distintos: App Control impede executar a aplicação, e a falha de cache impede criar o novo instalador.

# Complemento da matriz — Fase 4 (2026-11-02)

A matriz dos 15 tópicos acima continua válida para a implementação funcional. Atualização do build e validação desta fase:

| Requisito | Estado verificado nesta fase | Evidência / pendência | Prioridade |
|---|---|---|---|
| Diagnóstico EPERM/cache | Corrigida a causa do caminho de cache no sandbox | `dist-diagnostic.cjs` redireciona LOCALAPPDATA/TEMP/caches para `work`; EPERM deixou de ocorrer e Electron foi extraído | P0 |
| Processes/locks | Sem Electron ou makensis ativos nas fotografias pré-build; dois Node no host | O script grava fotografia. Não foi possível consultar handles/antivírus; eventos AppLocker negados pelo sistema | P0 |
| NSIS | Bloqueado | NSIS legado falha ao iniciar; bundle 3.12 compila o intermediário, mas Windows retorna `spawn UNKNOWN` ao executá-lo para extrair o uninstaller | P0 |
| Instalador x64 atualizado | Não produzido | O arquivo de mesmo nome em `outputs` foi renomeado `... - ANTIGO - 2026-11-01.exe`; SHA-256 antigo no relatório. Sem hash novo | P0 |
| Integridade estática empacotada | Passou | 16 checks em `logs/packaging-integrity-2026-11-02T12-03-49-958Z.json`; main, preload, renderer, Sharp, libvips, arquivos Electron, caminhos de estado/configuração/log | P0 |
| Sharp nativo | Passou em Node x64 | Importação do binding empacotado e retorno das versões Sharp/libvips | P0 |
| Inicialização desktop | Pendente | App Control bloqueou Electron em tentativa anterior; nenhuma janela/menu testada nesta fase | P0 |
| Fluxo ponta a ponta instalado | Pendente | Aguardar novo NSIS e Windows autorizado; passos em `VALIDACAO-WINDOWS.md` | P0 |

# Complemento — Fase 5: estabilidade reprodutível

| Requisito | Implementação/estado nesta fase | O que falta | Prioridade | Teste/evidência |
|---|---|---|---|---|
| Diagnóstico `spawn UNKNOWN` | `diagnose:nsis` extraiu etapa `NsisTarget.computeScriptAndSignUninstaller -> WineVmManager.execWine`, caminho absoluto do stub, argumentos vazios, erro textual e hash/PE/ACL/AuthentiCode sem executar o stub | O log original não contém `errno` numérico/Win32 status e não há prova de App Control/antivírus; correlação de token/permissão com o evento histórico não foi possível | P0 | `outputs/logs/nsis-failure-forensics.json`; revisar eventos do host autorizado para uma nova tentativa |
| Reprodutibilidade | Versões diretas fixas, lockfile v3, Node/npm pin, verificações x64/Sharp e workflow `windows-2025` com permissões mínimas | Workflow ainda precisa ser executado num repositório privado | P0 | `npm ci`, checks locais e execução Actions |
| Integração de mídia em CI | Helper fixa e valida por SHA-256 FFmpeg/FFprobe de teste e expõe no PATH somente ao job | A procedência/termos GPL do build devem continuar explícitos; nenhum FFmpeg runtime é instalado no app | P1 | 33 testes no Windows x64 CI |
| NSIS x64 e integridade | Pipeline executa build, testes, `dist:diagnose`, `verify:package`, freshness/PE/size/hash; artifact privado e logs com retenção 7 dias | Sem novo instalador nesta sessão; `release` não deve ser tratado como entrega da fase | P0 | Workflow; `outputs/build-manifest.json` e `outputs/SHA256SUMS.txt` só surgem após sucesso |
| Validação desktop instalada | Procedimento detalhado em `outputs/VALIDACAO-WINDOWS.md` | Instalação, inicialização, menus, importação, lote misto, limpeza, controles e retomada continuam pendentes em Windows autorizado | P0 | Evidências de cada etapa no roteiro; nunca inferir UI a partir de CI/build |
| Build/testes de fonte | Passou | `npm run build`; `npm test`: 33 testes em 6 arquivos | P0 |

## Atualização Fase 4 — resultado do empacotamento

A ocorrência de `EPERM` foi removida usando cache e diretório temporário locais em `work/`. O processo então revelou um bloqueio posterior: o Windows não inicia o executável NSIS intermediário do electron-builder (`spawn UNKNOWN`) durante a criação do desinstalador. A pasta x64 extraída passou por 16 verificações estáticas e o binding Sharp carregou no Node win32/x64. O instalador NSIS final, seu SHA-256 e o fluxo visual continuam pendentes. Logs: `outputs/logs/dist-2026-11-02T12-00-59-773Z.log`, `outputs/logs/nsis-runtime-check.txt`, `outputs/logs/packaging-integrity-2026-11-02T12-03-49-958Z.json`, `outputs/logs/nsis-intermediate-launch.json`.
