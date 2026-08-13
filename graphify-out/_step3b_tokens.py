import json
from pathlib import Path

usage = {
    'graphify-out/.graphify_chunk_01.json': 114426,
    'graphify-out/.graphify_chunk_02.json': 172261,
    'graphify-out/.graphify_chunk_03.json': 125445,
}
for path, tok in usage.items():
    p = Path(path)
    d = json.loads(p.read_text(encoding='utf-8'))
    d['input_tokens'] = tok
    d['output_tokens'] = 0
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding='utf-8')
print('token counts written back')
