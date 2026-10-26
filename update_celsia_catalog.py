#!/usr/bin/env python3
"""
Script para actualizar catalogo-inicial.json con materiales reales de CELSIA
Lee 10 archivos Excel y extrae el Bill of Materials completo
"""

import json
import os
from openpyxl import load_workbook
from pathlib import Path

# Mapeo de archivos a códigos de norma
ARCHIVO_A_NORMA = {
    "01-Celsia. Aislador Pato - Bandera Suspension.xlsx": {
        "13.2kV": "B712",
        "34.5kV": "C712",
        "tipo": "Pato - Bandera Suspensión"
    },
    "02-Celsia.  Aislador Pato - Brazo Tangente (Antibalanceo) Suspension.xlsx": {
        "13.2kV": "B71",
        "34.5kV": "C71",
        "tipo": "Pato - Brazo Tangente Antibalanceo"
    },
    "03-Celsia.  Aislador Pato - Brazo Tangente (Antibalanceo) Suspension de  2, 3 y 4 Circuitos o Derivacion.xlsx": {
        "13.2kV": "B712C",
        "34.5kV": "C712C",
        "tipo": "Pato - Brazo Tangente Multi-circuito"
    },
    "05-Celsia. Aislador Pin - Herraje Tipo C.xlsx": {
        "13.2kV": "B72C2",
        "34.5kV": "C72C2",
        "tipo": "Pin - Herraje Tipo C"
    },
    "07. Aislador Pin - Herraje Tipo E-Celsia.xlsx": {
        "13.2kV": "B72E",
        "34.5kV": "C72E",
        "tipo": "Pin - Herraje Tipo E"
    },
    "08. Aislador Polimerico - Herraje Tipo C (Frontal) - Celsia.xlsx": {
        "13.2kV": "B76C",
        "34.5kV": "C76C",
        "tipo": "Polimérico - Herraje Tipo C Frontal"
    },
    "09. Aislador Polimerico - Herraje Tipo C (Lateral) - Celsia.xlsx": {
        "13.2kV": "B76C2",
        "34.5kV": "C76C2",
        "tipo": "Polimérico - Herraje Tipo C Lateral"
    },
    "10. Aislador Polimerico - Delta Centrada en V- Celsia.xlsx": {
        "13.2kV": "B77",
        "34.5kV": "C77",
        "tipo": "Polimérico - Delta Centrada V"
    }
}

def extraer_materiales(archivo_path):
    """Extrae materiales de un archivo Excel de CELSIA"""
    try:
        wb = load_workbook(archivo_path)
        ws = wb.active

        materiales = []
        # Las filas empiezan en 7 (después del header)
        for row in ws.iter_rows(min_row=7, values_only=True):
            descripcion = row[1] if len(row) > 1 else None
            cantidad = row[2] if len(row) > 2 else None
            referencia = row[3] if len(row) > 3 else None

            # Validar que sea un material válido
            if descripcion and cantidad and isinstance(cantidad, (int, float)) and cantidad > 0:
                # Limpiar la descripción
                desc_limpia = str(descripcion).strip()
                if desc_limpia and not desc_limpia.startswith("*"):
                    materiales.append({
                        "descripcion": desc_limpia[:200],
                        "cantidad": int(cantidad) if isinstance(cantidad, float) and cantidad == int(cantidad) else cantidad,
                        "referencia": str(referencia) if referencia else None
                    })

        return materiales
    except Exception as e:
        print(f"  ⚠️  Error leyendo {archivo_path}: {e}")
        return []

def main():
    base_path = Path("/Users/jesushernandovillaespinal/Library/CloudStorage/GoogleDrive-jhev42@gmail.com/My Drive/RFP ERCO AGENTE/RFP Agent/Agente1_Mockup_Deploy/CELSIA")

    print("📊 Leyendo especificaciones CELSIA...")
    print("=" * 100)

    # Diccionario para almacenar las normas actualizadas
    normas_actualizadas = {}

    for archivo, info in ARCHIVO_A_NORMA.items():
        archivo_path = base_path / archivo
        if not archivo_path.exists():
            print(f"⚠️  No encontrado: {archivo}")
            continue

        print(f"\n📄 {archivo}")
        materiales = extraer_materiales(archivo_path)

        if materiales:
            print(f"  ✓ {len(materiales)} items extraídos")

            # Guardar para cada voltaje
            for voltaje, codigo in [("13.2kV", info["13.2kV"]), ("34.5kV", info["34.5kV"])]:
                normas_actualizadas[codigo] = {
                    "codigo": codigo,
                    "tipo": info["tipo"],
                    "voltaje": voltaje,
                    "materiales": materiales
                }

    print("\n" + "=" * 100)
    print(f"✅ Total de normas procesadas: {len(normas_actualizadas)}")

    # Guardar resultado en JSON para revisión
    output_file = base_path.parent / "Agente1_Mockup_Deploy" / "normas_celsia_materiales.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(normas_actualizadas, f, ensure_ascii=False, indent=2)

    print(f"📁 Archivo guardado: {output_file}")
    print("\n⚠️  SIGUIENTE PASO: Revisar normas_celsia_materiales.json y ejecutar script de actualización de catalog")

    return normas_actualizadas

if __name__ == "__main__":
    main()
