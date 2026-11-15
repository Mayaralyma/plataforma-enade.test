# Pendências do projeto

Atualizado em 14/11/2026. Este arquivo separa trabalho de produto, decisões ainda abertas e requisitos para operação contínua. Não indica que os fluxos funcionais centrais estejam faltando.

## Estado atual

O escopo funcional principal do PRD está implementado para demonstração e uso local: autenticação e perfis, importação e processamento em worker, curadoria administrativa, simulados e histórico. O cadastro, a revisão e a publicação de questões são fluxos do próprio sistema; a equipe de desenvolvimento não precisa fazer a curadoria de cada prova manualmente.

Os testes E2E dos fluxos de administrador, importação e estudante passaram em Chromium, Firefox e WebKit. A responsividade é verificada em viewports de 375×812 e 768×1024. Neste ambiente, os testes do Firefox precisam ser executados fora do sandbox restrito, que impede a criação dos subprocessos do navegador.

## Pendências

### Curadoria de conteúdo

- Administradores ainda precisam conferir e publicar ou descartar as questões que serão disponibilizadas aos estudantes. O sistema sinaliza conteúdo visual, oferece editor e acesso autenticado ao PDF original; publicar exige salvar a revisão.
- Os validadores e arquivos `corrections.json` conferem ou auxiliam a extração, mas não substituem a revisão registrada pelo administrador no sistema.

### Decisões do PRD

- **PA-01:** definir métricas de sucesso do produto.
- **PA-03:** confirmar estimativas de Story Points após Planning Poker.
- **PA-06:** confirmar quais funcionalidades permanecem adiadas e se OCR para PDFs digitalizados entra no escopo.
- **PA-08/PA-09:** confirmar equipe e responsabilidades, pois os documentos de origem divergem.
- **PA-10:** definir políticas operacionais de sessão, senha e recuperação de acesso, retenção e exclusão de dados, backup e restauração. A configuração atual e seus padrões estão auditados em [VERIFICACAO_PRD.md](VERIFICACAO_PRD.md).

### Validações antes de operação contínua

- Repetir medições de extração e curadoria com carga controlada em ambiente representativo; as medições atuais são locais e não estabelecem SLA de produção.
- Definir destino e frequência de backups, retenção e objetivos de recuperação; automatizar e testar a restauração. Volumes persistentes não são backup.
- Preparar hospedagem e armazenamento privado de PDFs antes de uma implantação remota. A configuração Docker atual é para desenvolvimento local.
- Ampliar fixtures para outros anos/áreas conforme a cobertura desejada. PDFs digitalizados/OCR dependem de confirmação de escopo em PA-06.

## Fora das pendências de implementação

- Teste em aparelho físico não é requisito para validar o layout responsivo atual: os testes automatizados cobrem os fluxos e dimensões acordados nos três motores de navegador. Testes específicos de hardware ou comportamento móvel podem ser adicionados se surgirem novos requisitos.
- A revisão humana de questões é uma atividade operacional feita por administradores no produto, não uma validação externa que a equipe de desenvolvimento precise executar para cada fixture.

## Referências

- [PRD](PRD_Plataforma_Simulados_ENADE.md)
- [Verificação de implementação contra o PRD](VERIFICACAO_PRD.md)
- [Baseline de desempenho da curadoria](BASELINE_DESEMPENHO_CURADORIA.md)
