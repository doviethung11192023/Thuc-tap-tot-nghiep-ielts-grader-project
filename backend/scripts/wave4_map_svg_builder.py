"""Crisp, watermark-free SVG map builders matching live Listening transcripts (DATA-03)."""
from typing import Iterable

def _box(x: int, y: int, w: int, h: int, label: str, sub: str = "", accent: bool = False) -> str:
    fill, stroke, tcol = ("#fef2f2", "#932120", "#932120") if accent else ("#ffffff", "#334155", "#0f172a")
    s_html = f'<text x="{x+w/2}" y="{y+h/2+15}" text-anchor="middle" font-size="11" fill="#475569">{sub}</text>' if sub else ""
    ly = y + h / 2 - (2 if sub else -5)
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        f'<text x="{x+w/2}" y="{ly}" text-anchor="middle" font-size="16" font-weight="700" fill="{tcol}">{label}</text>{s_html}'
    )

def _compass(x: int = 775, y: int = 62) -> str:
    return (
        f'<g transform="translate({x},{y})"><circle r="24" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>'
        '<polygon points="0,-17 -5,2 0,-2 5,2" fill="#932120"/><polygon points="0,17 -5,2 0,6 5,2" fill="#94a3b8"/>'
        '<text y="-27" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">N</text>'
        '<text y="36" text-anchor="middle" font-size="10" fill="#64748b">S</text>'
        '<text x="-31" y="4" text-anchor="middle" font-size="10" fill="#64748b">W</text>'
        '<text x="31" y="4" text-anchor="middle" font-size="10" fill="#64748b">E</text></g>'
    )

def _wrap(title: str, subtitle: str, body: Iterable[str]) -> bytes:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 540" font-family="Inter,Arial,sans-serif">'
        '<rect width="840" height="540" fill="#f8fafc" rx="14"/>'
        '<rect x="16" y="16" width="808" height="508" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" rx="12"/>'
        f'<text x="42" y="48" font-size="18" font-weight="800" fill="#0f172a">{title}</text>'
        f'<text x="42" y="69" font-size="12" fill="#64748b">{subtitle}</text>'
        f'{_compass()}' + "".join(body) + "</svg>"
    )
    return svg.encode("utf-8")

def build_test1_unsw_map() -> bytes:
    """Test 1 Sec 2 (6f722d23): A=Health Centre, B=Student Centre, C=Internet Unit, D=Complaint Office, E=Cafe."""
    roads = [
        '<path d="M90 125 H735 M90 210 H735 M90 300 H735 M90 420 H735" stroke="#cbd5e1" stroke-width="14" fill="none"/>',
        '<path d="M620 92 V460 M285 125 V420 M470 92 V460" stroke="#cbd5e1" stroke-width="14" fill="none"/>',
        '<text x="640" y="258" font-size="12" font-weight="700" fill="#475569" transform="rotate(-90 640 258)">Ned Kelly Avenue</text>',
        '<text x="415" y="119" font-size="11" font-weight="600" fill="#475569">3rd Cross Street</text>',
        '<text x="355" y="294" font-size="11" font-weight="600" fill="#475569">Parker Street</text>',
        '<text x="355" y="414" font-size="11" font-weight="600" fill="#475569">Crammer Street</text>',
        '<text x="490" y="370" font-size="11" font-weight="600" fill="#475569" transform="rotate(-90 490 370)">Garden Street</text>',
    ]
    nodes = [
        _box(492, 134, 112, 62, "A", "NW 3rd Cross", accent=True),
        _box(335, 338, 118, 62, "B", "Main Opp.", accent=True),
        _box(492, 224, 112, 62, "C", "Next to Gym", accent=True),
        _box(638, 224, 92, 62, "Gym", ""),
        _box(96, 338, 128, 62, "D", "Teaching Side", accent=True),
        _box(228, 338, 92, 62, "Teaching", "Building"),
        _box(96, 134, 108, 62, "E", "Past Women's", accent=True),
        _box(96, 222, 86, 62, "Library", ""),
        _box(205, 222, 68, 28, "Women's", "Dorms"),
        _box(205, 256, 68, 28, "Men's", "Dorms"),
        _box(492, 434, 115, 52, "Recreational", "Facilities"),
        _box(345, 456, 108, 36, "Main Gate", "Start Point", accent=True),
    ]
    return _wrap("UNSW Campus Orientation Map (Q11-15)", "Match places Q11-15 to letters A-E", roads + nodes)

def build_test5_museum_map() -> bytes:
    """Test 5 Sec 2 (9eb2fdb4): E=Box Office, C=Children's, F=Cafe, B=Multimedia, A=Showroom; D,G,H distractors."""
    frame = [
        '<rect x="75" y="96" width="665" height="392" rx="10" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>',
        '<line x1="250" y1="488" x2="365" y2="488" stroke="#932120" stroke-width="6"/>',
        '<text x="308" y="510" text-anchor="middle" font-size="13" font-weight="700" fill="#932120">Entrance Doors</text>',
        '<path d="M308 482 V405 H420" stroke="#932120" stroke-width="2" stroke-dasharray="5,4" fill="none"/>',
        '<text x="415" y="395" font-size="11" fill="#932120" font-weight="600">Sharp Corner</text>',
        '<rect x="69" y="255" width="12" height="58" fill="#0ea5e9"/>',
        '<text x="58" y="288" text-anchor="end" font-size="11" font-weight="700" fill="#0369a1">Door</text>',
    ]
    nodes = [
        _box(95, 112, 165, 92, "A", "Top-Left Corner", accent=True),
        _box(320, 112, 165, 76, "G", "Hallway Room"),
        _box(550, 112, 170, 92, "B", "Top-Right Corner", accent=True),
        _box(95, 238, 165, 92, "C", "Far-Left Wall", accent=True),
        _box(282, 238, 165, 92, "D", "Centre-Left Room"),
        _box(550, 238, 170, 92, "H", "East Wing"),
        _box(95, 362, 145, 92, "E", "Left Past Corner", accent=True),
        _box(550, 362, 170, 92, "F", "Bottom-Right", accent=True),
    ]
    return _wrap("City Museum Reception Extension (Q16-20)", "Choose the correct letter A-H", frame + nodes)

def build_test6_station_map() -> bytes:
    """Test 6 Sec 2 (35fea5ea): 15:D(Cafe), 16:G(Taxi), 17:F(Car Park), 18:C(Passenger), 19:B(Wheelchair), 20:A(Tourist)."""
    frame = [
        '<rect x="115" y="175" width="610" height="260" rx="10" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>',
        '<line x1="365" y1="175" x2="475" y2="175" stroke="#0284c7" stroke-width="6"/>',
        '<text x="420" y="165" text-anchor="middle" font-size="12" font-weight="700" fill="#0284c7">Rear Entrance</text>',
        '<line x1="365" y1="435" x2="475" y2="435" stroke="#932120" stroke-width="6"/>',
        '<text x="420" y="458" text-anchor="middle" font-size="13" font-weight="700" fill="#932120">Main Entrance</text>',
        '<line x1="335" y1="305" x2="505" y2="305" stroke="#475569" stroke-width="6"/>',
        '<text x="420" y="324" text-anchor="middle" font-size="11" fill="#475569">Dividing Wall</text>',
    ]
    nodes = [
        _box(135, 92, 195, 62, "G", "Outside Rear Left", accent=True),
        _box(510, 92, 195, 62, "F", "Outside Rear Right", accent=True),
        _box(135, 195, 175, 76, "E", "Inside Rear Left"),
        _box(345, 195, 150, 82, "D", "Behind Wall / Rear", accent=True),
        _box(530, 195, 175, 76, "C", "Inside Rear Right", accent=True),
        _box(135, 338, 175, 78, "B", "Inside Front Left", accent=True),
        _box(530, 338, 175, 78, "A", "Inside Front Right", accent=True),
    ]
    return _wrap("Station Leisure Complex Plan (Q15-20)", "Match facilities Q15-20 to letters A-G", frame + nodes)

def build_test9_resort_map() -> bytes:
    """Test 9 Sec 2 (34755b41): 11=restaurant, 12=spa, 13=tennis courts, 14=swimming pool, 15=play centre, 16=conference, 17=sports."""
    coast = [
        '<rect x="38" y="96" width="88" height="398" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>',
        '<text x="82" y="295" text-anchor="middle" font-size="13" font-weight="700" fill="#92400e" transform="rotate(-90 82 295)">Private Beach (West)</text>',
        '<rect x="132" y="96" width="600" height="398" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>',
        '<text x="235" y="138" font-size="12" fill="#15803d" font-weight="700">Palm Trees Grove</text>',
    ]
    nodes = [
        _box(420, 108, 140, 48, "Heliport", "North"),
        _box(155, 154, 155, 62, "12", "Next to Palm Grove", accent=True),
        _box(155, 232, 155, 62, "11", "Green Award Display", accent=True),
        _box(155, 312, 155, 56, "Gift Shop", "West Wing"),
        _box(155, 386, 155, 66, "Info Desk", "Wi-Fi Password"),
        _box(590, 148, 128, 62, "13", "South of Heliport", accent=True),
        _box(360, 174, 175, 58, "15", "Canopy Area (N)", accent=True),
        _box(345, 250, 205, 86, "14", "Slides & Diving (Centre)", accent=True),
        _box(360, 356, 175, 64, "16", "South of Pool", accent=True),
        _box(572, 352, 145, 86, "17", "SE / Ocean View", accent=True),
    ]
    return _wrap("Mangrove Tree Resort Plan (Q11-17)", "Write NO MORE THAN TWO WORDS for each numbered location", coast + nodes)

def build_all_listening_map_svgs() -> dict[str, bytes]:
    return {
        "6f722d23-4cfe-4e1a-a348-7aa0187692f0": build_test1_unsw_map(),
        "9eb2fdb4-e33b-434f-bd09-8d8fe3c5bde7": build_test5_museum_map(),
        "35fea5ea-46c0-4f6d-8209-20878e3f0322": build_test6_station_map(),
        "34755b41-9b03-42e3-a664-7f2d771471f0": build_test9_resort_map(),
    }
