# Media Reset Pro

Aplicativo desktop local em desenvolvimento. O código tem um núcleo funcional de processamento, mas ainda não cobre os 15 tópicos completos da especificação. A matriz em `outputs/matriz-funcionalidades.md` discrimina implementação, lacunas e testes restantes.

## Requisitos e execução

- Windows 10+ x64.
- `npm install`, depois `npm run dev` ou `npm run build`.
- Para processar vídeo, selecione `ffmpeg.exe` e `ffprobe.exe` em **Configurações**. Os caminhos são verificados com `-version` e persistidos. Não é necessário alterar o `PATH`.
- O instalador não redistribui FFmpeg. Obtenha uma build de acordo com a licença e codecs necessários e revise seus avisos. Consulte `outputs/THIRD-PARTY-NOTICES.md`. A equipe FFmpeg explica que a base LGPL pode virar GPL quando se habilitam partes GPL, como libx264; builds de terceiros não são endossadas pelo projeto.

## Processamento atualmente implementado

- Importação em lote, pastas recursivas opcionais, hash SHA-256 para deduplicação, concorrência configurável de 1 a 8, pause entre itens, retomar, cancelar subprocessos e recuperar estados `processing` como pendentes ao reiniciar.
- Vídeo: FFmpeg chamado sem shell, cópia de streams no modo limpeza e reencodificação H.264/H.265/AV1 na medida em que o executável escolhido forneça esses encoders. Mantém AAC por padrão ou remove áudio. Mede progresso usando `-progress`, valida streams e salva FFprobe antes/depois.
- Imagem: Sharp/libvips com decodificação, orientação EXIF aplicada aos pixels, redimensionamento opcional, reencodificação, alfa e remoção de metadata incidental. Salva relatório de metadados antes/depois. O Sharp está configurado para ser desempacotado do ASAR no NSIS.
- Saídas em `Videos`, `Imagens` e `Relatorios`; originais não são alterados. Arquivos temporários são renomeados após validação, nomes em colisão recebem sufixo e há uma checagem mínima de espaço livre.
- Estado JSON atômico, logs estruturados de sessão e bootstrap de diagnóstico em `%TEMP%\MediaResetPro-startup.log`, quando o Electron consegue executar JavaScript.

## Build, teste e instalador

```powershell
npm test
npm run build
npm run dist
```

Os testes são integrações reais de FFmpeg/FFprobe e Sharp com fixtures geradas. Eles validam os motores e arquivos, mas não testam a janela do Electron nem o fluxo da fila via IPC.

## Diagnóstico Electron neste ambiente

O Windows retornou “Uma política de Controle de Aplicativo bloqueou este arquivo” ao iniciar `release/win-unpacked/Media Reset Pro.exe`. O `electron.exe` upstream do mesmo `electron@33.4.11` recebeu a mesma política. O bootstrap JS e o log ainda não são executados. Para validar a janela, instale/execute em uma máquina de teste onde o administrador tenha autorizado o executável pela política de Controle de Aplicativo (ou use assinatura confiável conforme a política local), depois confira `%TEMP%\MediaResetPro-startup.log`. Não desative nem contorne a política. A assinatura e validação instalada não foram possíveis nesta sessão.

## Limitações remanescentes

Ainda faltam presets técnicos atuais por plataforma, controle de FPS/GOP/bitrate/GPU/streams, normalização e sincronização de áudio, escolha/preservação da árvore de pastas, filtros e miniaturas, comparação visual, histórico tabular exportável, gráficos de hardware, relatório por lote, controle de timeout, decodificação completa automática de cada vídeo no pós-processamento, detecção abrangente de metadata por stream/contêiner, e testes de pausa/cancelamento/recuperação por IPC e UI. O pause para entre arquivos e não suspende o FFmpeg ativo. A compatibilidade de codecs e contêineres varia com a build de FFmpeg selecionada. A UI ainda precisa de validação visual após autorização do Windows.

Um hash SHA-256 distinto comprova diferença binária, não originalidade editorial ou ausência de similaridade perceptual.
