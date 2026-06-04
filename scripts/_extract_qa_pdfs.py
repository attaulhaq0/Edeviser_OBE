import os, sys
from pypdf import PdfReader

qa_dir = r"f:\Edeviser-Kiro\docs\pdf\QA"
extra = [r"f:\Edeviser-Kiro\docs\pdf\Student Profile - Google Docs.pdf"]
out_dir = r"f:\Edeviser-Kiro\docs\pdf\QA\_extracted"
os.makedirs(out_dir, exist_ok=True)

files = [os.path.join(qa_dir, f) for f in os.listdir(qa_dir) if f.lower().endswith(".pdf")]
files += [p for p in extra if os.path.exists(p)]

for path in files:
    try:
        reader = PdfReader(path)
        text = []
        for i, page in enumerate(reader.pages):
            text.append(page.extract_text() or "")
        base = os.path.splitext(os.path.basename(path))[0]
        out = os.path.join(out_dir, base + ".txt")
        with open(out, "w", encoding="utf-8") as fh:
            fh.write("\n".join(text))
        print(f"OK  {base}  pages={len(reader.pages)}  chars={sum(len(t) for t in text)}")
    except Exception as e:
        print(f"ERR {path}: {e}")
