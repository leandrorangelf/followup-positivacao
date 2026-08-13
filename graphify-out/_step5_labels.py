# -*- coding: utf-8 -*-
import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

G = build_from_json(extraction, root='.', directed=False)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

labels = {
    0: "Autorização por Papel (authz.js)",
    1: "Sessão HMAC (auth.js)",
    2: "Proxy Genérico de Tabelas",
    3: "Carregamento do Dashboard",
    4: "Segurança e Consulta GNRE",
    5: "Premiação e Profundidade Visual",
    6: "Push Notifications Backend",
    7: "Prazo com Aprovação + Totalizador ES",
    8: "Auditoria (audit.js)",
    9: "Login e Hashes de Senha",
    10: "Design Tokens Visuais",
    11: "Fluxo de Decisão de Prazo",
    12: "Paleta de Cores do Sistema",
    13: "Arquitetura de Proxy de Tabelas",
    14: "Análise de Clientes no Dashboard",
    15: "Testes: Design System",
    16: "Faturamento Parcial Operacional",
    17: "Dependências (package.json)",
    18: "Testes: Auditoria por Pedido",
    19: "Testes: Dashboard",
    20: "Testes: Histórico de Pedido",
    21: "Testes: Push Frontend",
    22: "Testes: Sino de Notificações",
    23: "Testes: Copy da UI",
    24: "Testes: Dashboard Profundidade",
    25: "Testes: Contraste Claro",
    26: "Testes: Service Worker",
    27: "Navegação GNRE/Registro",
    28: "Faturamento de Vendas",
    29: "Atualização de Status GNRE",
    30: "Skill Observations (vazio)",
    31: "Ícones SVG Inline",
    32: "Decisão de Prazo do Coordenador",
    33: "Exportação de PDF",
    34: "Upload de GNRE (Storage)",
    35: "Config Vercel (rewrites)",
    36: "Perfis de Usuário",
    37: "Carregamento de Metas",
    38: "KPIs Principais do Dashboard",
    39: "Visão Geral do Dashboard",
    40: "Permissão de Forecast",
    41: "Seleção Global de Mês",
    42: "Service Worker (sw.js)",
}

questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding='utf-8')
print('Report updated with community labels')
