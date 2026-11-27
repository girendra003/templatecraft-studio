"""Fictional, reproducible sample content. No customer documents or real signatures."""
from pathlib import Path
import json
import fitz

SAMPLE_FIELDS = []
def field(key, label, page, rect, value='', kind='text'):
    SAMPLE_FIELDS.append(dict(key=key, label=label, page_no=page, rect=rect, section='Client details' if page == 1 else 'Consent & review', type=kind, description=f'Sample {label.lower()}', sample_value=value, font_size=10))

field('full_name', 'Full Name', 1, [48, 205, 292, 233], 'Alex Morgan')
field('reference', 'Reference', 1, [320, 205, 564, 233], 'DEMO-001')
field('email', 'Email Address', 1, [48, 275, 292, 303], 'alex@example.com')
field('phone', 'Phone Number', 1, [320, 275, 564, 303], '+1 202 555 0142')
field('date', 'Request Date', 1, [48, 345, 292, 373], '2026-11-26', 'date')
field('time', 'Preferred Time', 1, [320, 345, 564, 373], '10:30', 'time')
field('address', 'Mailing Address', 1, [48, 415, 564, 447], '100 Example Avenue, Sample City')
field('notes', 'Request Notes', 1, [48, 490, 564, 554], 'Please update my contact details.', 'textarea')
field('consent', 'Contact Consent', 1, [48, 590, 66, 608], 'Yes', 'checkbox')
field('applicant_signature', 'Applicant Signature', 1, [48, 660, 292, 715], '', 'signature')
field('reviewer_name', 'Reviewer Name', 2, [48, 205, 292, 233], 'Sam Taylor')
field('review_reference', 'Review Reference', 2, [320, 205, 564, 233], 'REVIEW-001')
field('review_notes', 'Review Notes', 2, [48, 290, 564, 360], 'Sample review complete.', 'textarea')
field('confirmed', 'Details Confirmed', 2, [48, 410, 66, 428], 'Yes', 'checkbox')
field('reviewer_signature', 'Reviewer Signature', 2, [48, 490, 292, 555], '', 'signature')
field('demo_stamp', 'Demo Stamp', 2, [320, 490, 564, 555], '', 'image')

def create_sample_pdf():
    doc = fitz.open()
    for number in [1, 2]:
        page = doc.new_page(width=612, height=792)
        page.insert_text((48, 45), 'TemplateCraft Studio' if number == 1 else 'TemplateCraft Review', fontsize=10, fontname='hebo', color=(.05,.35,.43))
        page.insert_text((48, 70), 'TEMPLATECRAFT SAMPLE', fontsize=8, color=(.35,.43,.48))
        page.insert_text((48, 114), 'Client Details & Consent' if number == 1 else 'Consent & Review', fontsize=25, fontname='hebo', color=(.1,.16,.21))
        page.insert_text((48, 140), 'A fictional form for exploring fields, signatures and document editing.', fontsize=10, color=(.35,.43,.48))
        page.draw_line((48,160),(564,160),color=(.1,.65,.75),width=2)
        for item in SAMPLE_FIELDS:
            if item['page_no'] != number: continue
            r=fitz.Rect(item['rect'])
            if item['type'] == 'checkbox':
                page.draw_rect(r,color=(.65,.72,.76),width=.7)
                page.insert_text((r.x1+10,r.y1-5),item['label'],fontsize=10)
            else:
                page.insert_text((r.x0,r.y0-10),item['label'].upper(),fontsize=8,color=(.35,.43,.48))
                page.draw_rect(r,color=(.7,.78,.82),fill=(.97,.985,.99),width=.6)
        page.insert_text((48,756),'Sample use only - all names, details and signatures are fictional.' if number == 1 else 'Fictional review - for demonstration purposes only.',fontsize=8,color=(.35,.43,.48))
        page.insert_text((520,756),f'{number:02d} / 02',fontsize=8)
    result=doc.tobytes();doc.close();return result

def write_sample_assets(root: Path):
    from app.engine import build_acroform_template
    target=root/'assets/forms/sample-template.pdf';target.parent.mkdir(parents=True,exist_ok=True)
    template = fitz.open(stream=build_acroform_template(create_sample_pdf(), SAMPLE_FIELDS), filetype='pdf')
    target.write_bytes(template.tobytes(garbage=4, deflate=True))
    template.close()
    (root/'examples').mkdir(exist_ok=True)
    (root/'examples/sample_data.json').write_text(json.dumps({f['key']:f['sample_value'] for f in SAMPLE_FIELDS},indent=2)+'\n')
    for filename,signature in [('demo-stamp.png',False),('demo-signature.png',True)]:
        d=fitz.open();p=d.new_page(width=180,height=65)
        if signature:
            shape=p.new_shape();shape.draw_bezier((15,48),(70,-20),(30,70),(80,28));shape.draw_bezier((80,28),(90,65),(120,5),(162,25));shape.finish(color=(.05,.3,.5),width=2);shape.commit()
        else:
            p.draw_rect(fitz.Rect(6,6,174,59),color=(.05,.4,.5),width=2)
            p.insert_text((42,35),'DEMO ONLY',fontsize=15,fontname='hebo',color=(.05,.4,.5))
            p.insert_text((45,49),'FICTIONAL SAMPLE',fontsize=7,color=(.05,.4,.5))
        out=root/'assets/stamps'/filename;out.parent.mkdir(parents=True,exist_ok=True);p.get_pixmap(matrix=fitz.Matrix(2,2),alpha=True).save(str(out));d.close()
