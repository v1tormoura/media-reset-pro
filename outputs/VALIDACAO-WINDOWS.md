# Procedimento de validação Windows autorizada — Fase 5

## Estado agora

Build de fonte e os 33 testes foram executados nesta sessão. O verificador nativo foi corrigido e será rerodado. Não foi gerado instalador novo nesta fase e a UI não foi validada: o workspace não possui checkout Git ligado ao GitHub Actions, e o host anterior não conseguiu iniciar o stub NSIS/Electron. O instalador antigo e o stub incompleto devem ser ignorados. Não altere políticas, antivírus ou App Control.

## Gerar um instalador novo

Use o workflow `.github/workflows/windows-build.yml` num repositório privado, ou um Windows x64 autorizado com [README-BUILD-WINDOWS-CI.md](../README-BUILD-WINDOWS-CI.md). Só considere artefato atual quando o job completo passar e `release-integrity.json` declarar `PASS`, com data posterior ao início do job. O workflow preserva logs mesmo em falha e não cria publicação pública.

## Teste de instalação e interface

Na máquina autorizada, baixar o artefato do workflow e anotar SHA-256 do manifesto antes de instalar. Depois:

1. Instalar em diretório de teste e abrir o atalho. Capturar versão Windows, usuário/contexto de execução, horário UTC, log completo e resultado visual.
2. Confirmar a janela principal e navegação por Processar, Fila, Histórico e Configurações.
3. Importar individualmente um vídeo e uma imagem; importar também pasta com subpastas e arquivos de tipos mistos. Guardar lista/quantidade e hashes dos originais.
4. Selecionar preset e destino, iniciar processamento, conferir progresso, pausar, retomar e cancelar item e lote. Capturar os resultados de cada comando.
5. Reiniciar com uma fila pendente/interrompida e conferir recuperação conforme status persistido.
6. Verificar saídas em `ffprobe`/decodificação integral e Sharp; confirmar codec, dimensões, duração/streams, hash, leitura completa e ausência dos metadados escolhidos para remoção. Conferir os relatórios before/after e provar que os originais não mudaram.
7. Preservar screenshots, log `%TEMP%\MediaResetPro-startup.log`, relatórios before/after, hashes, saída de `ffprobe -show_format -show_streams -show_chapters -of json`, versões das ferramentas e uma tabela PASS/FAIL por passo.

## Se o executable falhar

Não desative controles. Registre linha de comando, caminho, SHA-256, horário UTC, usuário e mensagem integral. Peça ao administrador que correlacione Code Integrity/App Control/Defender eventos com o horário e hash. Se houver evento explícito de política, classifique como bloqueio de política; se não houver, classifique como causa desconhecida de loader/compatibilidade e encaminhe o stack de `spawn` ao mantenedor do empacotador. Não atribuir App Control sem evento confirmatório.

## Evidência local atual

O relatório `outputs/logs/nsis-failure-forensics.json` descreve o intermediário sem executá-lo. O log disponível contém `spawn UNKNOWN`, mas não `errno` numérico ou status nativo Win32. O objeto analisado é um stub NSIS PE32 x86, sem assinatura Authenticode, 190.759 bytes, SHA-256 `521A8E585DF5E0D4C56B82D836EAB6E12BB0729A6C5CB97372DFFC4E30A5D029`; não é instalador utilizável. Permissões ACL lidas no contexto atual não provam a identidade/permissão do processo no evento histórico. Consulta de logs de política não estava autorizada; portanto a causa final permanece inconclusiva.
