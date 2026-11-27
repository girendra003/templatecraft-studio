"""HTTP smoke test for the documented container (stdlib only)."""
import base64
import io
import json
import os
import urllib.error
import urllib.request
import zipfile

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8020').rstrip('/')

def request(path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body, headers={'Content-Type': 'application/json'} if body else {})
    return urllib.request.urlopen(req, timeout=60)

def main():
    assert json.load(request('/api/health'))['status'] == 'ok'
    assert b'TemplateCraft Studio' in request('/').read()
    assert b'<svg' in request('/favicon.svg').read()
    sample = json.load(request('/api/sample'))
    assert sample['form_type'] == 'SAMPLE_FORM' and sample['page_count'] == 2 and sample['total_fields'] == 16
    assert len(json.load(request('/api/stamp/list'))['stamps']) == 2
    sid = sample['session_id']
    fields = sample['fields']
    fields[0]['label'] = 'Container smoke name'
    saved = json.load(request('/api/fields/replace', {'session_id': sid, 'fields': fields, 'static_texts': sample['static_texts'], 'stamp_placements': []}))
    assert saved['fields'][0]['label'] == 'Container smoke name'
    filled = json.load(request('/api/fill-test/' + sid, {'data': {'full_name': 'Alex Example', 'date': '2026-11-27'}, 'flatten': True}))
    assert base64.b64decode(filled['pdf_base64']).startswith(b'%PDF')
    assert request('/api/download/' + sid + '/template').read().startswith(b'%PDF')
    bundle = zipfile.ZipFile(io.BytesIO(request('/api/download/' + sid + '/bundle').read()))
    assert {'template.pdf', 'blank.pdf', 'sample_data.json', 'signzy_editables_schema.json'} <= set(bundle.namelist())
    for path in ['/api/sample?kind=removed', '/api/download/missing/template']:
        try:
            request(path)
        except urllib.error.HTTPError as error:
            assert error.code in [400, 404]
        else:
            raise AssertionError('Invalid request unexpectedly succeeded')
    print('Container HTTP smoke passed: health, frontend/icon, sample, stamps, save, fill, PDF/ZIP exports and invalid requests.')

if __name__ == '__main__':
    main()
