import json
import os
import server
from aiohttp import web

# ── Chemin du fichier de sauvegarde ──────────────────────────────────────────
DATA_FILE = os.path.join(os.path.dirname(__file__), "my_prompt_data.json")

# ── Données par défaut ───────────────────────────────────────────────────────
DEFAULT_DATA = {
    "categories": [
        {
            "id": "lighting",
            "label": "Lumière",
            "words": [
                {"en": "ambient light",      "fr": "lumière ambiante"},
                {"en": "backlit",            "fr": "contre-jour"},
                {"en": "candlelight",        "fr": "lumière de bougie"},
                {"en": "cinematic lighting", "fr": "éclairage cinématique"},
                {"en": "dramatic lighting",  "fr": "éclairage dramatique"},
                {"en": "golden hour",        "fr": "heure dorée"},
                {"en": "natural light",      "fr": "lumière naturelle"},
                {"en": "neon light",         "fr": "lumière néon"},
                {"en": "rim light",          "fr": "lumière de contour"},
                {"en": "soft lighting",      "fr": "éclairage doux"},
                {"en": "studio lighting",    "fr": "éclairage studio"},
                {"en": "volumetric light",   "fr": "lumière volumétrique"}
            ]
        },
        {
            "id": "decor",
            "label": "Décors",
            "words": [
                {"en": "abandoned building", "fr": "bâtiment abandonné"},
                {"en": "beach",              "fr": "plage"},
                {"en": "city street",        "fr": "rue urbaine"},
                {"en": "desert",             "fr": "désert"},
                {"en": "fantasy landscape",  "fr": "paysage fantastique"},
                {"en": "forest",             "fr": "forêt"},
                {"en": "futuristic city",    "fr": "ville futuriste"},
                {"en": "interior",           "fr": "intérieur"},
                {"en": "japanese garden",    "fr": "jardin japonais"},
                {"en": "medieval castle",    "fr": "château médiéval"},
                {"en": "mountain",           "fr": "montagne"},
                {"en": "ocean",              "fr": "océan"},
                {"en": "space station",      "fr": "station spatiale"},
                {"en": "urban",              "fr": "urbain"}
            ]
        },
        {
            "id": "colors",
            "label": "Couleurs",
            "words": [
                {"en": "black and white",  "fr": "noir et blanc"},
                {"en": "colorful",         "fr": "coloré"},
                {"en": "cool tones",       "fr": "tons froids"},
                {"en": "dark palette",     "fr": "palette sombre"},
                {"en": "desaturated",      "fr": "désaturé"},
                {"en": "high contrast",    "fr": "fort contraste"},
                {"en": "monochromatic",    "fr": "monochromatique"},
                {"en": "muted tones",      "fr": "tons atténués"},
                {"en": "pastel palette",   "fr": "palette pastel"},
                {"en": "sepia",            "fr": "sépia"},
                {"en": "vibrant colors",   "fr": "couleurs vives"},
                {"en": "warm tones",       "fr": "tons chauds"}
            ]
        },
        {
            "id": "style",
            "label": "Style",
            "words": [
                {"en": "anime",          "fr": "animé japonais"},
                {"en": "baroque",        "fr": "baroque"},
                {"en": "comic book",     "fr": "bande dessinée"},
                {"en": "concept art",    "fr": "art conceptuel"},
                {"en": "cyberpunk",      "fr": "cyberpunk"},
                {"en": "digital art",    "fr": "art numérique"},
                {"en": "illustration",   "fr": "illustration"},
                {"en": "impressionist",  "fr": "impressionniste"},
                {"en": "minimalist",     "fr": "minimaliste"},
                {"en": "oil painting",   "fr": "peinture à l'huile"},
                {"en": "photorealistic", "fr": "photoréaliste"},
                {"en": "sketch",         "fr": "esquisse"},
                {"en": "surrealist",     "fr": "surréaliste"},
                {"en": "watercolor",     "fr": "aquarelle"}
            ]
        },
        {
            "id": "mood",
            "label": "Ambiance",
            "words": [
                {"en": "dark",        "fr": "sombre"},
                {"en": "dramatic",    "fr": "dramatique"},
                {"en": "dreamlike",   "fr": "onirique"},
                {"en": "eerie",       "fr": "inquiétant"},
                {"en": "epic",        "fr": "épique"},
                {"en": "ethereal",    "fr": "éthéré"},
                {"en": "joyful",      "fr": "joyeux"},
                {"en": "melancholic", "fr": "mélancolique"},
                {"en": "mysterious",  "fr": "mystérieux"},
                {"en": "nostalgic",   "fr": "nostalgique"},
                {"en": "peaceful",    "fr": "paisible"},
                {"en": "romantic",    "fr": "romantique"},
                {"en": "serene",      "fr": "serein"},
                {"en": "tense",       "fr": "tendu"}
            ]
        },
        {
            "id": "camera",
            "label": "Caméra",
            "words": [
                {"en": "35mm",            "fr": "35mm"},
                {"en": "aerial view",     "fr": "vue aérienne"},
                {"en": "bird's eye view", "fr": "vue plongeante"},
                {"en": "bokeh",           "fr": "bokeh"},
                {"en": "close-up",        "fr": "gros plan"},
                {"en": "depth of field",  "fr": "profondeur de champ"},
                {"en": "fish-eye",        "fr": "œil de poisson"},
                {"en": "low angle",       "fr": "contre-plongée"},
                {"en": "macro",           "fr": "macro"},
                {"en": "panoramic",       "fr": "panoramique"},
                {"en": "portrait",        "fr": "portrait"},
                {"en": "telephoto",       "fr": "téléobjectif"},
                {"en": "wide angle",      "fr": "grand angle"}
            ]
        },
        {
            "id": "quality",
            "label": "Qualité",
            "words": [
                {"en": "4k",                       "fr": "4K"},
                {"en": "8k",                       "fr": "8K"},
                {"en": "award winning",            "fr": "primé"},
                {"en": "best quality",             "fr": "meilleure qualité"},
                {"en": "detailed",                 "fr": "détaillé"},
                {"en": "high resolution",          "fr": "haute résolution"},
                {"en": "intricate details",        "fr": "détails fins"},
                {"en": "masterpiece",              "fr": "chef-d'œuvre"},
                {"en": "professional",             "fr": "professionnel"},
                {"en": "sharp focus",              "fr": "mise au point nette"},
                {"en": "trending on artstation",   "fr": "tendance sur Artstation"},
                {"en": "ultra detailed",           "fr": "ultra détaillé"}
            ]
        }
    ],
    "presets": []
}


def migrate_words(data):
    """Migre les mots string vers des objets {en, fr}."""
    changed = False
    for cat in data.get("categories", []):
        new_words = []
        for w in cat.get("words", []):
            if isinstance(w, str):
                new_words.append({"en": w, "fr": ""})
                changed = True
            else:
                new_words.append(w)
        cat["words"] = new_words
    return data, changed


def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            data, changed = migrate_words(data)
            if changed:
                save_data(data)
            return data
        except Exception:
            pass
    return DEFAULT_DATA.copy()


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Routes API ───────────────────────────────────────────────────────────────
@server.PromptServer.instance.routes.get("/my_prompt/data")
async def get_data(request):
    return web.json_response(load_data())


@server.PromptServer.instance.routes.post("/my_prompt/data")
async def post_data(request):
    data = await request.json()
    save_data(data)
    return web.json_response({"status": "ok"})


@server.PromptServer.instance.routes.post("/my_prompt/reset")
async def reset_data(request):
    save_data(DEFAULT_DATA.copy())
    return web.json_response(DEFAULT_DATA)


# ── Node ─────────────────────────────────────────────────────────────────────
class My_Prompt:
    """
    My_Prompt — Constructeur de prompt visuel avec catégories de mots cliquables,
    sauvegarde persistante et interface modale interactive.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "prompt": ("STRING", {"default": "", "multiline": True}),
            }
        }

    RETURN_TYPES  = ("STRING",)
    RETURN_NAMES  = ("prompt",)
    FUNCTION      = "run"
    CATEGORY      = "My_Nodes/text"
    OUTPUT_NODE   = False

    def run(self, prompt=""):
        return (prompt,)


NODE_CLASS_MAPPINGS        = {"My_Prompt": My_Prompt}
NODE_DISPLAY_NAME_MAPPINGS = {"My_Prompt": "My Prompt 📝"}
