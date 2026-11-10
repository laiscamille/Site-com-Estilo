# PhatosHub

CRM para corretoras de planos de saúde: funil de vendas, gestão da equipe, financeiro de comissionamento e Inteligência Artificial.

## Páginas

| Arquivo | O que é |
|---|---|
| `index.html` | Site de vendas do SaaS: módulos, simulador de comissão, planos, dúvidas e formulário de teste grátis |
| `app.html` | Demonstração do sistema funcionando (dados fictícios, salvos no navegador) |

## Módulos da demonstração (`app.html`)

- **Dashboard**: KPIs, vidas implantadas por mês, funil de conversão, ranking e insights da IA.
- **Funil de vendas**: Kanban com arrastar e soltar. Ao mover para *Implantado*, o contrato é criado e as comissões são programadas.
- **Clientes e contratos**: carteira com filtros, alerta de reajuste (aniversário do contrato) e cancelamento com estorno automático.
- **Equipe e metas**: meta de vidas e % de repasse editáveis por corretor.
- **Financeiro e comissões**: lançamentos por competência (agenciamento em parcelas, vitalício e estornos), repasse por corretor com registro de pagamento, grade por operadora editável e exportação em CSV.
- **Assistente IA**: chat que prioriza leads, resume o mês, calcula comissões, sugere planos, avisa reajustes e prevê faturamento, além do lead scoring.

> A IA da demonstração é simulada por regras no navegador. Para produção, ela deve ser ligada a um modelo de linguagem através de um backend (nunca coloque chaves de API no front-end).

## Como rodar

Basta abrir `index.html` no navegador. Não há build nem dependências.
