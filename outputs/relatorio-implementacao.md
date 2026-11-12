# Media Reset Pro — Fase 4: build e validação

Atualizado em 2026-11-02. O diagnóstico do cache resolveu o `EPERM` original. A compilação da pasta Windows x64 passou, mas **não foi possível concluir o instalador NSIS**: o electron-builder tenta iniciar um executável NSIS intermediário para extrair o desinstalador e o Windows retorna `spawn UNKNOWN`. Não chamo o arquivo intermediário de instalador.

## Diagnóstico do empacotamento

- Versões: Node v24.15.0, Electron 45.2.1, electron-builder 26.18.0; alvo Windows x64/NSIS.
- `%LOCALAPPDATA%`/`%TEMP%` originais estavam redirecionados para `...AppData\Local\Packages\sandbox...\AC`. O cache do `@electron/get` deriva de `LOCALAPPDATA`; `ELECTRON_CACHE` sozinho não o redireciona. O script agora define `LOCALAPPDATA`, `TEMP`, `TMP` e `ELECTRON_BUILDER_CACHE` para diretórios graváveis em `work/`.
- Com cache local, o download e extração do ZIP Electron funcionaram; o `EPERM` não voltou. As fotografias de processos não mostraram Electron ou makensis concorrentes. Não foi possível enumerar handles do sistema; o acesso ao log AppLocker foi negado.
- NSIS legado 3.0.4.1, makensis SHA-256 `E277B7378931B74392015F5AD6B1D744DCD8A347BAA4480350A75EBEAB8D8E3D`, não assinado: execução direta por PowerShell reportou “Realocação Inválida da DLL do Sistema”; o builder deu `spawn UNKNOWN` ao chamá-lo.
- Configurei o bundle NSIS 3.12 do electron-builder (toolset beta `1.2.1`, checksum upstream validado pelo próprio electron-builder). O builder conseguiu montar o pacote de aplicação e compilar um NSIS intermediário de 190.759 bytes. Em seguida falhou ao iniciar esse executável intermediário durante `WineVmManager.execWine`/extração do uninstaller (`spawn UNKNOWN`). O comando direto `/VERSION` do makensis 3.12 também mostrou a mensagem de realocação inválida pelo PowerShell.
- Tentei `npm run dist:diagnose` dentro e fora do sandbox. A tentativa fora do sandbox também falhou no lançamento do intermediário. O log de eventos AppLocker retorna “Attempted to perform an unauthorized operation”; não dá para atribuir definitivamente o bloqueio a App Control, antivírus ou a outro erro de carregador. A mesma falha ocorreu fora do sandbox. Nenhuma política ou proteção foi alterada.

## Evidências e resultados

| Ação | Resultado |
|---|---|
| `npm run build` | Passou |
| `npm test` | Passou: 33 testes em 6 arquivos |
| `npm run dist` por `npm run dist:diagnose` | Compilou o app x64 e o instalador intermediário; falhou antes de concluir o NSIS por `spawn UNKNOWN` ao iniciar o intermediário |
| `npm run verify:package` | Passou: 16 verificações estáticas do app extraído |
| Sharp empacotado | Binding nativo carregado em Node win32/x64; Sharp 0.35.5, libvips 8.18.7 |
| Electron / janela / menus | Não testados nesta fase; tentativa anterior do Electron foi bloqueada por App Control antes do bootstrap |
| Instalador novo / SHA-256 | **Não produzido**. O executável de 190.759 bytes é um artefato NSIS incompleto e foi isolado com nome explícito; não instalar |

A verificação estática cobre executável Electron, ASAR, main, preload, renderer, recursos Electron, módulos Sharp/libvips, configuração de estado e log. Ela não inicia Electron. O diretório `release/win-unpacked` foi atualizado, mas não é instalador.

## Logs de empacotamento

- `logs/dist-2026-11-02T11-49-40-814Z.log`: primeira execução, DNS `ENOTFOUND`.
- `logs/dist-2026-11-02T11-50-56-341Z.log`: cache alternativo com rede; NSIS legado falha.
- `logs/dist-2026-11-02T11-53-49-339Z.log`: NSIS 3.12 via sandbox, falha ao iniciar makensis wrapper.
- `logs/dist-2026-11-02T12-00-59-773Z.log`: tentativa com cache local fora do sandbox; build NSIS e app intermediário criados, falha no lançamento do intermediário.
- `logs/nsis-runtime-check.txt`: versões, SHA-256, assinatura e erro observado de makensis.
- `logs/packaging-integrity-2026-11-02T12-03-49-958Z.json`: resultado das 16 verificações estáticas na pasta empacotada mais recente.
- `logs/nsis-intermediate-launch.json`: estágio e alvo do `spawn UNKNOWN` identificados no traceback.

## Artefatos e instaladores

- `Media Reset Pro Setup 0.1.0 - ANTIGO - 2026-11-01.exe`: instalador antigo, 130.163.369 bytes, SHA-256 `EABFC46AE0720550E69D693E20F68D412C130B9E918E4FD19B8519DE4FFB42F1`. Não inclui esta fase.
- `Media Reset Pro Setup 0.1.0 - INCOMPLETO (nao instalar) - 2026-11-02.exe`: intermediário incompleto, 190.759 bytes, SHA-256 `521A8E585DF5E0D4C56B82D836EAB6E12BB0729A6C5CB97372DFFC4E30A5D029`. Não é um instalador funcional.
- Não há instalador final novo nem SHA-256 de instalador final.

## Pendências

1. Concluir NSIS num host Windows autorizado que possa iniciar o bootstrap de desinstalação do electron-builder; se houver bloqueio corporativo, obter liberação/assinatura com o administrador, sem desativar ou contornar políticas.
2. Instalar e validar janela/menu, importações, preset, progresso, pausa/retomada, cancelamentos, recuperação da fila e relatórios.
3. Calcular tamanho, data e SHA-256 do NSIS somente depois de a compilação final ter sucesso.
4. FFmpeg/FFprobe são dependências externas selecionadas e validadas pelo usuário por razões de licença; Electron, Sharp e libvips x64 são empacotados.
5. Esta fase não está completa e o aplicativo não é declarado 100% funcional.
