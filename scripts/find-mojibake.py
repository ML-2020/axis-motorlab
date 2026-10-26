from pathlib import Path
p=Path(r"src/scenarios/paddy-gltf.js")
for i,line in enumerate(p.read_text(encoding="utf-8").splitlines(),1):
    if any(x in line for x in ["鍑","鍋","娉","姘","杞","璐","闃","鏂","涓","鏃"]):
        print(i, line)
