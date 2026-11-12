# Media Reset Pro — Relatório Fase 5

Data: 2026-11-02. Objetivo: estabilização e entrega verificável. Esta fase preparou build reprodutível e diagnóstico; **não está aprovada como entrega final**, pois não existe instalador novo nem validação desktop nesta sessão.

## Diagnóstico `spawn UNKNOWN`

Fonte: `outputs/logs/dist-2026-11-02T12-00-59-773Z.log` e `outputs/logs/nsis-failure-forensics.json`.

- A etapa foi `NsisTarget.computeScriptAndSignUninstaller -> WineVmManager.execWine -> builder-util execFile`.
- Executável chamado: `<workspace>\release\Media Reset Pro Setup 0.1.0.exe`; cópia preservada localmente em `outputs/Media Reset Pro Setup 0.1.0 - INCOMPLETO (nao instalar) - 2026-11-02.exe`.
- Argumentos passados: nenhum (`[]`); ambiente incluiu `__COMPAT_LAYER=RunAsInvoker`.
- Erro observado: `spawn UNKNOWN`. O log não contém errno do Node nem código numérico Win32, então o código nativo exato não é recuperável da evidência disponível.
- O arquivo preservado tem 190.759 bytes, SHA-256 `521A8E585DF5E0D4C56B82D836EAB6E12BB0729A6C5CB97372DFFC4E30A5D029`, PE32 x86/GUI, imports apenas DLLs padrão de Windows. Authenticode indicou não assinado.
- ACL observada concede leitura/execução a `Vitor\CodexSandboxUsers` e controle total a SYSTEM/Administradores/usuário atual. Isso foi lido após a falha e não comprova token/permissões exatas do processo histórico.
- A consulta ao log AppLocker foi negada por acesso não autorizado. Não há evento de política confirmatório para este erro. Portanto App Control, antivírus, permissões e incompatibilidade do loader não podem ser distinguidos conclusivamente. Nenhuma proteção foi modificada e o arquivo não foi executado pelo diagnóstico.
- O problema antigo de rename EPERM do cache foi mitigado na Fase 4 redirecionando LOCALAPPDATA/TEMP/TMP/electron-builder cache para diretórios graváveis. O novo bloqueio observado é uma etapa diferente; não repetimos o build NSIS local nesta Fase 5.

## Reprodutibilidade preparada

- Dependências diretas fixadas em `package.json` e `package-lock.json`; `.nvmrc` fixa Node `24.15.0`, npm `11.12.1`. Electron `45.2.1`, electron-builder `26.18.0` e toolset NSIS `1.2.1` explícitos.
- Workflow `.github/workflows/windows-build.yml`: GitHub-hosted Windows x64 `windows-2025`, permissões `contents: read`, ações oficiais em versões fixas, `npm ci`, verificações nativas, build, testes, empacotamento NSIS, integridade e SHA-256. Preserva logs em falha. Faz upload por sete dias somente quando o repositório é privado; não publica Release.
- FFmpeg de teste é obtido por helper separado e verificado por SHA-256; o build GPL é usado somente para testes e não entra no app. O runtime da aplicação ainda requer FFmpeg/FFprobe externos selecionados pelo usuário; esses binários não são incluídos no instalador.
- Não há checkout Git nesta pasta (`.git` ausente), credencial/remote de repositório nem execução Actions registrada. O workflow foi preparado, não executado.
- Sintaxe do YAML do workflow foi analisada com `js-yaml`; a verificação local passou.

## Verificações executadas nesta sessão

| Verificação | Resultado | Evidência/escopo |
|---|---|---|
| `npm run build` | PASS | TypeScript, Vite e Electron renderer/main compilados |
| `npm test` | PASS | 33 testes em 6 arquivos; execução real desta sessão |
| `npm run verify:native` | PASS | Windows x64, Node/npm pins, Electron/builder pins, Sharp 0.35.5 + libvips 8.18.7 e addon x64 carregado |
| `npm run verify:package` | PASS estático | 18 verificações em `release/win-unpacked`: Electron x64, ASAR/main/preload/renderer, recursos, Sharp x64/libvips, estado/configuração/log |
| `npm run dist` / NSIS nesta fase | NÃO EXECUTADO | Repetir no host local seria a mesma falha sem hipótese nova. Workflow Windows limpo é o próximo teste técnico |
| Integridade do instalador atualizado | PENDENTE | Nenhum novo instalador; sem tamanho/data/SHA-256 atual |
| Instalação, abertura da janela, menus/UI | PENDENTE | Não executado; verificações estáticas não equivalem a runtime |
| Processamento real pela UI / fila | PENDENTE | Testes automatizados de mídia já preservados, mas fluxo desktop não foi validado |

## Pendências de conclusão

1. Integrar esta pasta num repositório Git privado e executar workflow Windows x64. Confirmar NSIS fresco, manifesto, logs e SHA-256.
2. Se NSIS falhar, coletar `dist-workflow.log`, relatório de integridade e evidência autorizada do Windows; administrador deve verificar eventos de política para horário/hash exatos. Sem evento, encaminhar `spawn`/loader ao mantenedor de electron-builder/NSIS.
3. Instalar o artefato numa máquina Windows autorizada e concluir cada passo em `outputs/VALIDACAO-WINDOWS.md`, incluindo fluxo de vídeo/imagem mistos e controles de fila.
4. Atualizar esta matriz/relatório apenas com evidência observada. O projeto não satisfaz ainda o critério final desktop do usuário.

## Entregáveis desta fase

- Código fonte e workflow: `README-BUILD-WINDOWS-CI.md`, `.github/workflows/windows-build.yml`, scripts de verificação e lockfile.
- Matriz: `outputs/matriz-funcionalidades.md`.
- Roteiro de validação: `outputs/VALIDACAO-WINDOWS.md`.
- Avisos: `outputs/THIRD-PARTY-NOTICES.md`.
- Forense, histórico de empacotamento e verificações estão em `outputs/logs/` (logs gerados ignorados pelo git por padrão; anexá-los como artefatos do job).
- Logs capturados nesta sessão: `outputs/logs/phase5-build.log`, `phase5-tests.log`, `phase5-native.log` e `phase5-package.log`.
- ZIP fonte atualizado: `outputs/media-reset-pro-source.zip`; tamanho/hash registrados no resumo de entrega da sessão.
- Não há novo instalador para entregar. Arquivos rotulados `ANTIGO` e `INCOMPLETO` não são builds válidos desta fase.
