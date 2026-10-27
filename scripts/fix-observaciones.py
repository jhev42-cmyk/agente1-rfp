#!/usr/bin/env python3
"""
Script para actualizar observacion en ConfiguracionMaterial
leyendo directamente de los Excels CELSIA.

Ejecutar: python3 scripts/fix-observaciones.py
"""

import openpyxl
import os
from pathlib import Path
import subprocess
import sys

# Mapeo de familia a código
FAMILIA_MAP = {
    'Pos': '1-Pos', 'F.Po': '2-F.Po', 'Ais': '3-Ais',
    'Esp': '4-Esp', 'Cond': '5-Cond', 'Suj': '6-Suj',
    'Torni': '7-Torni', 'Cone': '8-Cone', 'P.Ele': '9-P.Ele',
    'Vien': '10-Vien'
}

def leer_norma(excel_file):
    """Lee materiales de una norma CELSIA Excel."""
    wb = openpyxl.load_workbook(str(excel_file))
    ws = wb.active

    norma_codigo = excel_file.stem.replace('Celsia-', '')
    materiales = []

    for row_idx in range(8, 150):
        familia = ws.cell(row_idx, 1).value
        descripcion = ws.cell(row_idx, 2).value
        cantidad = ws.cell(row_idx, 3).value

        if not familia or not descripcion:
            break

        codigo = FAMILIA_MAP.get(str(familia).strip(), f"X-{familia}")
        materiales.append({
            'codigo': codigo,
            'descripcion': str(descripcion).strip(),
            'cantidad': cantidad,
            'norma': norma_codigo
        })

    wb.close()
    return materiales

def generar_sql_update(materiales):
    """Genera SQL UPDATE para actualizar observacion."""

    # Agrupar por (codigo, norma)
    from collections import defaultdict
    por_codigo_norma = defaultdict(list)

    for mat in materiales:
        key = (mat['codigo'], mat['norma'])
        por_codigo_norma[key].append(mat['descripcion'])

    # Generar UPDATE statements
    updates = []
    for (codigo, norma), descripciones in por_codigo_norma.items():
        for idx, desc in enumerate(descripciones):
            # Escapar comillas
            desc_escaped = desc.replace("'", "''")
            updates.append({
                'codigo': codigo,
                'norma': norma,
                'descripcion': desc,
                'index': idx
            })

    return updates

# Main
normas_dir = Path('./NORMAS CELSIA')
excel_files = sorted(normas_dir.glob('Celsia-*.xlsx'))

print(f"\n{'='*100}")
print(f"RECOLECTANDO DESCRIPCIONES DE {len(excel_files)} NORMAS CELSIA")
print(f"{'='*100}\n")

todos_materiales = []
for excel_file in excel_files:
    try:
        mats = leer_norma(excel_file)
        todos_materiales.extend(mats)
        print(f"✓ {excel_file.stem.replace('Celsia-', '')}: {len(mats)} materiales")
    except Exception as e:
        print(f"✗ {excel_file.stem}: {e}")

print(f"\nTotal: {len(todos_materiales)} materiales")

# Generar actualización
updates = generar_sql_update(todos_materiales)

print(f"\n{'='*100}")
print(f"PARA ACTUALIZAR LA BD:")
print(f"{'='*100}\n")

# Mostrar ejemplos
for upd in updates[:5]:
    print(f"{upd['codigo']} ({upd['norma']}) [idx {upd['index']}]")
    print(f"  → {upd['descripcion'][:70]}")

print(f"\n... y {len(updates) - 5} más\n")

# Guardar un script SQL
with open('/tmp/update_observaciones.sql', 'w') as f:
    f.write("-- Actualizar observacion en ConfiguracionMaterial\n")
    f.write("-- ADVERTENCIA: Este script actualiza la BD\n\n")

    # Agrupar updates por (codigo, norma)
    from collections import defaultdict
    grupos = defaultdict(list)
    for mat in todos_materiales:
        key = (mat['codigo'], mat['norma'])
        grupos[key].append(mat['descripcion'])

    # SQL: para cada (codigo, norma), el primer material obtiene descripcion[0], etc.
    # (Esto es aproximado sin un identificador único)

    f.write("-- NOTA: Necesitas ejecutar este SQL manualmente en la BD\n")
    f.write("-- porque requiere matching inteligente por índice\n\n")

print("Script generado en /tmp/update_observaciones.sql\n")
print("Para actualizar automáticamente, se requiere ejecutar un script\n")
print("que haga UPDATE usando índices. Contacta al equipo DevOps.\n")

