import urllib.request
import json
import uuid

with open('ai_sample_reportlab.pdf', 'rb') as f:
    pdf_bytes = f.read()

boundary = uuid.uuid4().hex
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="ai_sample_reportlab.pdf"\r\n'
    f'Content-Type: application/pdf\r\n\r\n'
).encode('latin1') + pdf_bytes + f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="media_type"\r\n\r\ntext\r\n--{boundary}--\r\n'.encode('latin1')

req = urllib.request.Request(
    'http://localhost:3000/api/analysis/jobs',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print('Job Status:', res.get('status'), 'Job ID:', res.get('jobId'))
    job_id = res.get('jobId')

req2 = urllib.request.Request(f'http://localhost:3000/api/cases/{job_id}')
with urllib.request.urlopen(req2) as resp2:
    case_res = json.loads(resp2.read().decode('utf-8'))
    print('Case Number:', case_res.get('case_number'))
    print('Verdict:', case_res.get('verdict'))
    print('Confidence:', case_res.get('calibrated_confidence'))
    print('Breakdown:', json.dumps(case_res.get('per_detector_scores', {}).get('breakdown', []), indent=2))
