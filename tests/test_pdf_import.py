"""Public-release regressions: import real widgets and preserve generic PDF content."""
import sys
from pathlib import Path
import fitz
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.engine import analyze_and_process_pdf, fill_template_pdf


def main():
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((48, 60), 'Generic document artwork must survive.')
    page.insert_image(fitz.Rect(48, 300, 228, 365), filename=str(ROOT / 'assets/stamps/demo-stamp.png'))
    widget = fitz.Widget()
    widget.field_name = 'customer_name'
    widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
    widget.rect = fitz.Rect(48, 100, 292, 130)
    widget.field_value = 'Private test value'
    page.add_widget(widget)
    data = doc.tobytes()
    doc.close()
    session = analyze_and_process_pdf(data)
    assert session['form_type'] == 'PDF_FORM'
    assert [field['key'] for field in session['fields']] == ['customer_name']
    assert session['sample_data'] == {'customer_name': ''}
    with fitz.open(stream=session['clean_blank_pdf'], filetype='pdf') as cleaned:
        assert 'Generic document artwork must survive.' in cleaned[0].get_text()
        assert len(cleaned[0].get_image_info()) == 1
        assert not list(cleaned[0].widgets())
    plain = fitz.open()
    plain.new_page().insert_text((48, 60), 'An ordinary non-form PDF.')
    result = analyze_and_process_pdf(plain.tobytes())
    plain.close()
    assert result['fields'] == []  # never insert unrelated customer/template fields
    sample = analyze_and_process_pdf((ROOT / 'assets/forms/sample-template.pdf').read_bytes())
    filled = fill_template_pdf(sample['editable_template_pdf'], {'date': '2026-11-27'}, fields_def=sample['fields'])
    with fitz.open(stream=filled, filetype='pdf') as document:
        matches = document[0].search_for('2026-11-27')
        assert len(matches) == 1 and 345 <= matches[0].y0 <= 373
    print('Generic PDF import passed: actual widgets, no private sample values, preserved artwork, no invented fields, correct date position.')


if __name__ == '__main__':
    main()
