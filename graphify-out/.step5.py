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
    0: 'Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)',
    1: 'Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)',
    2: 'Autorizacao (authz.js)',
    3: 'Sessao & Autenticacao (auth.js, login/logout/me)',
    4: 'Login & Senhas + Testes de Authz',
    5: 'Teste: Design System',
    6: 'Teste: Dashboard',
    7: 'Teste: Copy da UI',
    8: 'Teste: Dashboard Profundidade',
    9: 'Teste: Contraste Sistema Claro',
    10: 'Config Vercel',
}

questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding='utf-8')
print('Report updated with community labels')
