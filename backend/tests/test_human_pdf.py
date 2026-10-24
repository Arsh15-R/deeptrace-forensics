from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import urllib.request
import json
import uuid

c = canvas.Canvas('human_sample.pdf', pagesize=letter)
c.drawString(72, 750, 'I woke up early yesterday and grabbed a coffee down on 5th street.')
c.drawString(72, 730, 'The weather was freezing cold, honestly! My dog started barking at a squirrel near the park gate,')
c.drawString(72, 710, 'which made me spill half of the cup on my coat. I spent the next twenty minutes trying to clean it up')
c.drawString(72, 690, 'with napkins before heading over to meet Sarah at the train station.')
c.save()

with open('human_sample.pdf', 'rb') as f:
    pdf_bytes = f.read()

boundary = uuid.uuid4().hex
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="human_sample.pdf"\r\n'
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
    job_id = res.get('jobId')

req2 = urllib.request.Request(f'http://localhost:3000/api/cases/{job_id}')
with urllib.request.urlopen(req2) as resp2:
    case_res = json.loads(resp2.read().decode('utf-8'))
    print('Case Number:', case_res.get('case_number'))
    print('Verdict:', case_res.get('verdict'))
    print('Confidence:', case_res.get('calibrated_confidence'))
    print('Breakdown:', json.dumps(case_res.get('per_detector_scores', {}).get('breakdown', []), indent=2))
