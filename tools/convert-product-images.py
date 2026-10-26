"""Convierte los originales a WebP. Requiere Pillow; ejecutar desde cualquier carpeta."""
import csv
import json
from pathlib import Path
from PIL import Image, ImageOps

FRONTEND = Path(__file__).resolve().parents[1]
ROOT = FRONTEND.parent
SOURCE = ROOT / 'Productos-img'
OUTPUT = FRONTEND / 'assets' / 'productos'

# Asociación explícita revisada con los nombres entregados; nunca depende del ID SQL.
FILES = {
    1: 'leche-gloria-azul-400g',
    2: 'leche-gloria-roja-400g',
    3: 'chorizo-braedt-500g',
    4: 'chorizo-san-fernando-unidad-40-g',
    5: 'tuyo-costa-22g',
    6: 'beso-de-moza',
    7: 'gaseosa-inca-kola-1.5l',
    8: 'gaseosa-coca-cola-sin-azucar-500ml',
    9: 'galletas-gretel-32-g',
    10: 'papas-lays-clasicas-36-g',
    11: 'duraznos-dos-caballos-lata-820-g',
    12: 'arroz-costeno-extra-750g',
    13: 'azucar-rubia-1-kg',
    14: 'fideos-spaghetti-500-g',
    15: 'fideos-tallarin-500-g',
    16: 'aceite-primor-900ml',
    17: 'aceite-vegetal-900-ml',
    18: 'sal-yodada-1-kg',
    19: 'harina-sin-preparar-1-kg',
    20: 'avena-tradicional-500-g',
    21: 'leche-ideal-390g',
    22: 'yogur-fresa-946-g',
    23: 'queso-fresco-250-g',
    24: 'mantequilla-con-sal-180-g',
    25: 'jamonada-de-pollo-san-fernando-paquete-200-g',
    26: 'hot-dog-de-pollo-san-fernando-paquete-250-g',
    27: 'trozos-de-atun-florida-en-aceite-vegetal-lata-140-g',
    29: 'salsa-de-tomate-200-g',
    30: 'mayonesa-clasica-235-g',
    31: 'agua-sin-gas-750-ml.',
    32: 'agua-sin-gas-1-l',
    33: 'nectar-de-durazno-1-l',
    34: 'bebida-rehidratante-500-ml',
    35: 'gaseosa-pepsi-500-ml',
    36: 'galletas-soda-field-sixpack-6-paquetes',
    37: 'galletas-oreo-36g',
    38: 'galletas-chomp-42-g',
    39: 'galletas-vainilla-field-sixpack-6-paquetes',
    40: 'chizitos-35-g',
    41: 'cheetos-61-g',
    42: 'chocolate-sublime-clasico-26-g',
    43: 'gomitas-dulces-ambrosoli-bolsa-430-g.',
    44: 'chupetines-globo-pop-paquete-24-unidades',
    45: 'detergente-en-polvo-ariel-con-downy-bolsa-800-g',
    46: 'lejia-clorox-tradicional-botella-1-l',
    47: 'lavavajilla-liquido-750-ml',
    48: 'nombre papel-higienico-elite-aloe-vera-doble-hoja-paquete-4-rollos',
    49: 'jabon-de-tocador-110-g',
    50: 'shampoo-limpieza-renovadora-sachet-18-ml',
    51: 'crema-dental-colgate-maxima-proteccion-anticaries-90-g',
    52: 'trozos-de-atun-campomar-en-aceite-vegetal-lata-150-g',
}


def main():
    with (ROOT / 'docs/revision-precios/catalogo-actualizado.csv').open(encoding='utf-8-sig', newline='') as source:
        products = {row['codigo']: row for row in csv.DictReader(source)}
    originals = {path.stem: path for path in SOURCE.iterdir() if path.is_file()}
    assert set(FILES.values()) == set(originals), 'Revisar imágenes nuevas o faltantes antes de convertir.'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    entries, report = [], []
    for number, stem in FILES.items():
        code = f'PROD-{number:04d}'
        product = products[code]
        original = originals[stem]
        filename = stem.removeprefix('nombre ').rstrip('.') + '.webp'
        target = OUTPUT / filename
        with Image.open(original) as source:
            image = ImageOps.exif_transpose(source)
            # Mantener el alfa original: el componente lo presenta sobre blanco.
            image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
            image.save(target, 'WEBP', quality=85, method=6, exact=True)
        with Image.open(target) as check:
            assert check.format == 'WEBP' and max(check.size) <= 800
        entries.append({'codigo': code, 'nombre': product['nombre'], 'marca': product['marca'], 'archivo': filename})
        report.append({'codigo': code, 'original': original.name, 'archivo': filename,
                       'bytes_original': original.stat().st_size, 'bytes_webp': target.stat().st_size})
    data = '// Generado por tools/convert-product-images.py.\nexport const productImages = ' + json.dumps(entries, ensure_ascii=False, indent=2) + ';\n'
    (FRONTEND / 'js/shared/product-images.data.js').write_text(data, encoding='utf-8')
    total_before = sum(row['bytes_original'] for row in report)
    total_after = sum(row['bytes_webp'] for row in report)
    summary = {'imagenes': len(report), 'bytes_originales': total_before, 'bytes_webp': total_after,
               'reduccion_porcentaje': round((1-total_after/total_before)*100, 2), 'archivos': report}
    (OUTPUT / 'conversion.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in summary.items() if key != 'archivos'}, indent=2))


if __name__ == '__main__':
    main()
