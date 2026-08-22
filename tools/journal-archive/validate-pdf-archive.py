import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader


def main():
    folder = Path(sys.argv[1]).resolve()
    manifest_path = Path(sys.argv[2]).resolve()
    pdfs = sorted(folder.rglob("*.pdf"))
    if not pdfs:
        raise SystemExit("PDF archive is empty")

    rows = []
    failures = []
    for pdf in pdfs:
        data = pdf.read_bytes()
        try:
            reader = PdfReader(pdf)
            pages = len(reader.pages)
            text = "".join((page.extract_text() or "") for page in reader.pages).strip()
        except Exception as error:
            failures.append(f"{pdf.name}: cannot open ({error})")
            continue
        if pages < 1:
            failures.append(f"{pdf.name}: no pages")
        if len(data) < 4096:
            failures.append(f"{pdf.name}: suspiciously small ({len(data)} bytes)")
        if len(text) < 20:
            failures.append(f"{pdf.name}: no readable journal text")
        rows.append({
            "file": str(pdf.relative_to(folder)),
            "bytes": len(data),
            "pages": pages,
            "textCharacters": len(text),
            "sha256": hashlib.sha256(data).hexdigest(),
        })

    manifest = {
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "folder": str(folder),
        "pdfCount": len(rows),
        "valid": not failures,
        "failures": failures,
        "files": rows,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    if failures:
        raise SystemExit("PDF archive validation failed:\n" + "\n".join(failures))
    print(f"Validated {len(rows)} PDF files")


if __name__ == "__main__":
    main()
