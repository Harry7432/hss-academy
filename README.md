# HSS Academy

> **Aplicativo desktop offline para organizar videoaulas locais, acompanhar o progresso e continuar de onde parou.**

---

## 📌 1. Apresentação

O **HSS Academy** é um aplicativo desktop open source de alta performance, projetado para estudantes, desenvolvedores e autodidatas que organizam seus estudos em arquivos de vídeo locais no computador. Com uma interface moderna, navegação fluida e foco em produtividade, ele transforma pastas comuns do Windows em uma academia estruturada de estudos.

---

## 🎯 2. Objetivo

Eliminar o atrito de gerenciar videoaulas baixadas localmente: você aponta uma pasta do seu computador, o aplicativo organiza automaticamente os módulos e as aulas em ordem natural, memoriza o ponto exato de cada vídeo e permite continuar seus estudos no dia seguinte com um único clique.

---

## ✨ 3. Principais Funcionalidades

- **100% Offline e Privado**: Nenhum login, sem telemetria, sem APIs na nuvem e sem tráfego de rede.
- **Detecção Inteligente de Pastas**: Subpastas são mapeadas automaticamente como **módulos**, arquivos de vídeo como **aulas**, e vídeos na raiz são reunidos em **"Aulas gerais"**.
- **Ordenação Natural Numérica**: Ordena pastas e vídeos por lógica humana (`1, 2, 10` em vez de `1, 10, 2`), com suporte a caracteres acentuados.
- **Player de Vídeo Nativo com Streaming por Demanda**:
  - Suporte a reprodução de arquivos `.mp4`, `.webm`, `.mkv`, `.mov`, `.m4v`, `.avi` e `.ts`.
  - Navegação contínua na barra de tempo (seek suave e responsivo via protocolo local com suporte a Range requests HTTP 206).
  - Velocidade de reprodução ajustável (0.75x, 1x, 1.25x, 1.5x e 2x).
  - Atalhos de teclado produtivos (`Espaço` para Play/Pause, `Setas ←/→` para saltar ±5 segundos, `F` para Tela Cheia, `M` para Mudo).
  - Fallback para abrir o arquivo no player padrão do Windows caso o formato utilize codecs proprietários externos.
- **Retomada Automática do Ponto Salvo**: Card *"Continuar estudando"* em destaque na tela inicial, retomando a reprodução com recuo suave de 2 segundos para dar contexto.
- **Salvamento Silencioso e Resiliente**: O progresso é registrado atomicamente sem popups ou interrupções visuais que atrapalhem o estudo.
- **Sincronização Não-Destrutiva**: Botão *"Atualizar aulas"* para reconhecer novas aulas e módulos sem apagar o histórico anterior.
- **Suporte a Cursos Movidos**: Botão *"Alterar pasta"* para remapear o diretório do curso mantendo o histórico de aulas intacto.
- **Instalador Tradicional Windows**: Criação automática de atalhos na Área de Trabalho e Menu Iniciar, com suporte a desinstalação pelo painel de configurações do Windows.

---

## 💻 4. Tecnologias Utilizadas

- **[Electron](https://www.electronjs.org/)**: Shell desktop seguro e desacoplado com isolamento de contexto (`contextIsolation: true`, `sandbox: true`, protocolo seguro customizado `hss-media://`).
- **[React 19](https://react.dev/)**: Biblioteca para interface declarativa, reativa e componentes modulares.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estrita de ponta a ponta para processo principal, preload IPC e renderer.
- **[Vite](https://vite.dev/)**: Ferramenta de build de alta velocidade para o frontend.
- **[Vitest](https://vitest.dev/)**: Suíte de testes unitários e de integração ultrarrápida.
- **[Lucide React](https://lucide.dev/)**: Conjunto de ícones vetoriais modernos e consistentes.
- **[electron-builder](https://www.electron.build/)**: Pipeline de empacotamento para Windows (instalador NSIS).

---

## 📋 5. Requisitos para Desenvolvimento

- **Sistema Operacional**: Windows 10/11 (ou Linux/macOS para desenvolvimento do frontend)
- **Node.js**: v20.x ou superior (testado com Node v24.x)
- **npm**: v10.x ou superior

---

## 📦 6. Instalação de Dependências

Clone o repositório e instale as dependências com o npm:

```bash
git clone https://github.com/Harry7432/hss-academy.git
cd hss-academy
npm install
```

---

## 🚀 7. Execução em Desenvolvimento

Para rodar a interface em modo de desenvolvimento com hot-reload:

```bash
npm run dev
```

---

## 🧪 8. Execução dos Testes Automatizados

O projeto conta com testes cobrindo ordenação natural, scanner de pastas, reconciliação de dados, persistência atômica, protocolo Range 206, busca (seek) e regressão de notificações silenciosas:

```bash
# Executar a suíte de testes (Vitest)
npm test

# Executar a verificação estrita de tipagem (Typecheck)
npm run typecheck
```

---

## 🔨 9. Compilação e Geração do Instalador Windows

Para compilar o código e gerar o instalador oficial do Windows:

```bash
# Compilar renderer e processo principal
npm run build

# Gerar o instalador executável (NSIS) na pasta release/
npm run package
```

O instalador será gerado em:
```text
release/HSS Academy Setup 1.0.2.exe
```

---

## 📂 10. Como Importar uma Pasta de Curso

1. Abra o **HSS Academy**.
2. Na tela inicial, clique em **"Adicionar curso / Localizar pasta"**.
3. Selecione a pasta que representa o curso no seu computador.
4. Estrutura recomendada para pastas locais:

```text
Meu Curso/
  ├── 01 - Introdução/
  │   ├── 01 - Boas-vindas.mp4
  │   └── 02 - Ambiente.mp4
  ├── 02 - Fundamentos/
  │   ├── 01 - Variáveis.mp4
  │   └── 02 - Funções.mp4
  └── 00 - Apresentação Geral.mp4  (Vídeos na raiz vão para "Aulas gerais")
```

---

## 🔄 11. Como Atualizar Módulos e Aulas

Se você adicionar novos vídeos, criar novas subpastas ou renomear arquivos no seu computador:

1. Clique no botão **"Atualizar aulas"** (ícone circular de sincronização) no card do curso ou no topo da tela do player.
2. O aplicativo realizará uma varredura comparativa inteligente:
   - Aulas novas são adicionadas automaticamente.
   - Aulas com caminhos inalterados mantêm seu histórico e posição.
   - Aulas cujo arquivo não estiver acessível são sinalizadas como indisponíveis sem apagar seu progresso.

---

## ⏱️ 12. Como Funciona o Salvamento e a Retomada

- **Salvamento Automático**: A posição do vídeo (`currentTime`) é registrada automaticamente no disco a cada 5 segundos de reprodução contínua, ao pausar, ao saltar na barra de tempo, ao trocar de aula e antes do fechamento da janela.
- **Operação Silenciosa**: O salvamento ocorre em segundo plano sem notificações ou interrupções visuais na tela.
- **Retomada com Recuo**: Ao abrir uma aula anteriormente assistida, o player posiciona o vídeo no ponto salvo com um recuo de 2 segundos, facilitando a retomada da linha de raciocínio.
- **Conclusão Automática e Manual**: Aulas podem ser marcadas como concluídas pelo botão manual ou automaticamente ao atingir 95% do vídeo.

---

## 💾 13. Onde Ficam os Dados Locais do Usuário

Por segurança e para nunca alterar os arquivos de vídeo do usuário, o histórico de progresso e as configurações ficam armazenados exclusivamente na pasta de dados do usuário do sistema operacional:

```text
%APPDATA%\hss-academy\hss_academy_data.json
```

- **Escrita Atômica**: Os dados são salvos em arquivo temporário `.tmp` e substituídos de forma atômica, evitando corrupção de dados em caso de desligamento abrupto.
- **Cópia de Segurança (.bak)**: Uma cópia de backup automático `hss_academy_data.json.bak` é mantida para recuperação automática em caso de inconsistência.
- **Desinstalação Segura**: Atualizações ou desinstalações do programa não apagam essa pasta, garantindo que você nunca perca seu histórico de estudos.

---

## 🤝 14. Como Contribuir com o Projeto

Contribuições da comunidade são muito bem-vindas! Para colaborar:

1. Faça um Fork do repositório.
2. Crie uma branch para sua funcionalidade ou correção:
   ```bash
   git checkout -b feat/minha-melhoria
   ```
3. Garanta que os testes e a verificação de tipagem passem:
   ```bash
   npm test
   npm run typecheck
   ```
4. Envie seus commits:
   ```bash
   git commit -m "feat: implementa nova funcionalidade"
   ```
5. Envie para o seu fork e abra um **Pull Request**.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo de configuração [`package.json`](package.json) para mais detalhes.
