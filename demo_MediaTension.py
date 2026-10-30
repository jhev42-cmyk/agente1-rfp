"""
demo_MediaTension
Created on Thu Oct 29 2026
@author: drioszap

Lectura de normas seleccionadas en la línea de media tensión y cálculo de cantidad de materiales totales del sistema

Entrada: Archivo txt de nombre "normas-seleccionadas.txt"
Salida: Matriz con listado de todos los materiales según las normas definidas en el txt de nombre "materiales_normas_celsia.csv"
"""
# %% Imports
import os
import unicodedata
import pandas as pd

# %% Funciones
def leer_normas(ruta_archivo):
    """Lee el archivo y extrae la lista de normas que están
    debajo de 'RESUMEN DE NORMAS SELECCIONADAS:'."""
    with open(ruta_archivo, "r", encoding="utf-8") as f:
        lineas = f.readlines()

    normas = []
    en_resumen = False

    for linea in lineas:
        texto = linea.strip()

        if "RESUMEN DE NORMAS SELECCIONADAS:" in texto:
            en_resumen = True
            continue

        if en_resumen:
            if texto.startswith("Total"):
                break
            if texto:
                normas.append(texto)

    return normas

def normalizar(texto):
    """Deja el texto comparable: sin saltos de línea, sin espacios
    dobles, sin espacios al inicio o final."""
    return " ".join(str(texto).split())

def cantidad_numerica(celda):
    """Devuelve el valor float de la celda si es numérica.
    Devuelve None si está vacía (NaN) o si contiene texto
    (ej. 'Cantidad acorde diseño...') -> celdas fantasma."""
    if pd.isna(celda):
        return None
    try:
        return float(celda)
    except (ValueError, TypeError):
        return None

def clave_descripcion(texto):
    """Clave de comparación robusta entre la descripción del archivo de la
    norma y la de las matrices de materiales. Ignora diferencias de formato:
    - mayúsculas/minúsculas y tildes ('metálico' == 'metalico')
    - espacios ('38kV' == '38 kV')
    - comillas ('3"' == '3”' == '3/8’’')
    - guiones ('38-48' == '38 – 48')"""
    t = normalizar(texto).lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))   # quitar tildes
    for c in ['"', "”", "“", "’", "‘", "′", "´", "`"]:
        t = t.replace(c, "'")
    t = t.replace("''", "'")
    for c in ["–", "—", "−"]:
        t = t.replace(c, "-")
    t = t.replace(" ", "")
    return t

def lectura_materiales_poste(matriz_actual, matriz_postes, norma_actual):
    """Llena la familia Estructura de soporte principal (Pos) en matriz_postes.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Pos con cantidad que no encontraron correspondencia: ningún material se
    pierde en silencio."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Pos":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_postes)):
                if clave_descripcion(matriz_postes[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_postes[m][1] = matriz_postes[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_postes[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_postes[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    # Diagnóstico: filas con cantidad que no matchearon
    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Pos con cantidad SIN correspondencia en matriz_postes:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_postes

def lectura_materiales_fijacionposte(matriz_actual, matriz_fijacionposte, norma_actual):
    """Llena la familia Fijación al poste (F.Po) en matriz_fijacionposte.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    F.Po con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "F.Po":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_fijacionposte)):
                if clave_descripcion(matriz_fijacionposte[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_fijacionposte[m][1] = matriz_fijacionposte[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_fijacionposte[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_fijacionposte[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas F.Po con cantidad SIN correspondencia en matriz_fijacionposte:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_fijacionposte

def lectura_materiales_aisladores(matriz_actual, matriz_aisladores, norma_actual):
    """Llena la familia Aisladores (Ais) en matriz_aisladores.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Ais con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Ais":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_aisladores)):
                if clave_descripcion(matriz_aisladores[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_aisladores[m][1] = matriz_aisladores[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_aisladores[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_aisladores[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Ais con cantidad SIN correspondencia en matriz_aisladores:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_aisladores



def lectura_materiales_espaciamiento(matriz_actual, matriz_espaciamiento, norma_actual):
    """Llena la familia Espaciamiento de red compacta (Esp) en matriz_espaciamiento.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Esp con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Esp":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_espaciamiento)):
                if clave_descripcion(matriz_espaciamiento[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_espaciamiento[m][1] = matriz_espaciamiento[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_espaciamiento[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_espaciamiento[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Esp con cantidad SIN correspondencia en matriz_espaciamiento:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_espaciamiento

def lectura_materiales_conductores(matriz_actual, matriz_conductores, norma_actual):
    """Llena la familia Conductores y cableado (Cond) en matriz_conductores.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Cond con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Cond":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_conductores)):
                if clave_descripcion(matriz_conductores[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_conductores[m][1] = matriz_conductores[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_conductores[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_conductores[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Cond con cantidad SIN correspondencia en matriz_conductores:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_conductores

def lectura_materiales_sujecion(matriz_actual, matriz_sujecion, norma_actual):
    """Llena la familia Sujeción y amarre del conductor (Suj) en matriz_sujecion.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Suj con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Suj":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_sujecion)):
                if clave_descripcion(matriz_sujecion[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_sujecion[m][1] = matriz_sujecion[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_sujecion[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_sujecion[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Suj con cantidad SIN correspondencia en matriz_sujecion:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_sujecion


def lectura_materiales_tornilleria(matriz_actual, matriz_tornilleria, norma_actual):
    """Llena la familia Tornillería y herrajes de unión (Torni) en matriz_tornilleria.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Torni con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Torni":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_tornilleria)):
                if clave_descripcion(matriz_tornilleria[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_tornilleria[m][1] = matriz_tornilleria[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_tornilleria[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_tornilleria[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Torni con cantidad SIN correspondencia en matriz_tornilleria:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_tornilleria

def lectura_materiales_conectores(matriz_actual, matriz_conectores, norma_actual):
    """Llena la familia Conectores y empalmes eléctricos (Cone) en matriz_conectores.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Cone con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Cone":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_conectores)):
                if clave_descripcion(matriz_conectores[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_conectores[m][1] = matriz_conectores[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_conectores[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_conectores[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Cone con cantidad SIN correspondencia en matriz_conectores:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_conectores

def lectura_materiales_proteccionelec(matriz_actual, matriz_proteccionelec, norma_actual):
    """Llena la familia Protección eléctrica y puesta a tierra (P.Ele) en
    matriz_proteccionelec. Solo cuenta filas con cantidad numérica real.
    Al final reporta las filas P.Ele con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "P.Ele":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_proteccionelec)):
                if clave_descripcion(matriz_proteccionelec[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_proteccionelec[m][1] = matriz_proteccionelec[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_proteccionelec[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_proteccionelec[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas P.Ele con cantidad SIN correspondencia en matriz_proteccionelec:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_proteccionelec

def lectura_materiales_vientos(matriz_actual, matriz_vientos, norma_actual):
    """Llena la familia Anclaje y retención mecánica (Vien) en matriz_vientos.
    Solo cuenta filas con cantidad numérica real. Al final reporta las filas
    Vien con cantidad que no encontraron correspondencia."""
    n_filas = matriz_actual.shape[0]
    sin_match = []

    for j in range(n_filas):
        familia = normalizar(matriz_actual[j, 0])

        if familia == "Vien":
            cantidad = cantidad_numerica(matriz_actual[j, 2])
            if cantidad is None:
                continue

            descripcion = normalizar(matriz_actual[j, 1])

            for m in range(1, len(matriz_vientos)):
                if clave_descripcion(matriz_vientos[m][0]) == clave_descripcion(descripcion):
                    # Sumar la cantidad
                    matriz_vientos[m][1] = matriz_vientos[m][1] + cantidad

                    # Registrar la norma en "Presente en", sin repetirla
                    normas = [n for n in matriz_vientos[m][2].split(", ") if n]
                    if norma_actual not in normas:
                        normas.append(norma_actual)
                    matriz_vientos[m][2] = ", ".join(normas)
                    break
            else:
                sin_match.append(descripcion)

    if sin_match:
        print(f"  AVISO ({norma_actual}): filas Vien con cantidad SIN correspondencia en matriz_vientos:")
        for d in sin_match:
            print(f"    - {d}")

    return matriz_vientos

# %% Importación de datos
archivo_normas = "normas-seleccionadas.txt"
lista_normas = leer_normas(archivo_normas)
# Cálculos
cant_normas = len(lista_normas)

# Visualización de resultados
print("Normas encontradas identificadas:")
print(lista_normas)
print("Cantidad de normas cargadas:", cant_normas)


# %% Definición de matrices de materiales
# Matriz 1: Estructura de soporte principal (23 filas x 3 columnas)
# Columnas: [Descripción técnica (str), Cant (float), Presente en (str)]
matriz_postes = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Brazo angular tipo C acero red compacta 15kV", 0.0, ""],
    ["Brazo angular tipo C acero red compacta 38kV", 0.0, ""],
    ["Brazo angular tipo E acero red compacta 15kV", 0.0, ""],
    ["Brazo angular tipo E acero red compacta 38kV", 0.0, ""],
    ["Brazo anti-balanceo polimérico red compacta 15 kV", 0.0, ""],
    ["Brazo anti-balanceo polimérico red compacta 38 kV", 0.0, ""],
    ["Brazo tangente tipo L 15kV con grapa prensora y estribo", 0.0, ""],
    ["Brazo tangente tipo L 38 – 48 kV con grapa prensora y estribo", 0.0, ""],
    ["Cruceta angular metálica en T autosoportada, 1400 mm", 0.0, ""],
    ["Cruceta metálica 1500 mm 3\" X 3\" X 1/4\"", 0.0, ""],
    ["Cruceta metálica galv. 76 x 76 x 7,9 x 2400 mm (3\"x3\"x5/16\" x 2,40 m)", 0.0, ""],
    ["Cruceta metálica retención 600mm  3\" X 3\" X 1/4\" / 2 1/2\" x 2 1/2\" x 1/4\"", 0.0, ""],
    ["Cubo metalico galvanizado 3\" X 3\" para soporte de protecciones ", 0.0, ""],
    ["Diagonal metálica en V 1 1/2\" x 1 1/2\" x 3/16\" de 42\"", 0.0, ""],
    ["Diagonal metálica en V 1 1/2\" x 1 1/2\" x 3/16\" de 42\" p/cruceta 1.067 mm", 0.0, ""],
    ["Diagonal metálica recta 51 x 51 x 6 x 2.337 mm (2\"x2\"x1/4\" x 92\")  p/cruceta 2400 mm", 0.0, ""],
    ["Pieamigo - Diagonal en L para bandera, 51 x 51 x 6 x 2.337 mm (2\"x2\"x1/4\" x 92\")  p/cruceta 2400 mm", 0.0, ""],
    ["Pieamigo - Diagonal metalica (2 1/2\"x2 1/2\"x1/4\" x 92\")  p/cruceta 2500 mm", 0.0, ""],
    ["Pieamigo - Diagonal metálica recta 1/2\" x 1/2\" x 3/16\" 1500 mm", 0.0, ""],
    ["Pieamigo - Diagonal metálica recta 1/2\" x 1/2\" x 3/16\" 2200 mm", 0.0, ""],
    ["Poste de concreto, fibra vidrio o metalico 10m /12m /14m /16m × 750kgf /1050kgf /2000kgf/3000kgf /4000kgf", 0.0, ""],
    ["Soporte para dos aisladores en angulo red compacta (15kV / 35kV)", 0.0, ""],
]

# Matriz 2: Fijación al poste (3 filas x 3 columnas)
# Columnas: [Descripción técnica (str), Cant (float), Presente en (str)]
matriz_fijacionposte = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Collarín / Abrazadera de 2 o 4 vías para poste (100mm - 4\" a Collarin 300mm -12\")    Diámetro según norma", 0.0, ""],
    ["Collarín / Abrazadera de 2 o 4 vías para poste (100mm - 4\" a Collarin 300mm -12\")    Diámetro según norma RA05", 0.0, ""],
]

# Matriz 3: Aisladores (11 filas x 3 columnas)
# Columnas: [Descripción técnica (str), Cant (float), Presente en (str)]
matriz_aisladores = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Aislador pin polimérico 15 kV ANSI C29.5 clase 55-4", 0.0, ""],
    ["Aislador pin polimérico 25 kV ANSI C29.5 clase 55-5", 0.0, ""],
    ["Aislador pin polimérico 35 kV ANSI C29.5 clase 55-6", 0.0, ""],
    ["Aislador pin polimérico 38-48 kV ANSI C29.5 clase 55-6", 0.0, ""],
    ["Aislador polietileno tipo pin ANSI 55-4, 15kV", 0.0, ""],
    ["Aislador polietileno tipo pin ANSI 55-6, 34.5 kV", 0.0, ""],
    ["Aislador suspensión polimérico 15 kV ANSI C29.13 clase DS-15 clevis-lengüeta", 0.0, ""],
    ["Aislador suspensión polimérico 24kV ANSI C29.13 clase  DS-28  clevis-lengüeta", 0.0, ""],
    ["Aislador suspensión polimérico 38kV ANSI C29.13 clase DS-35 clevis-lengüeta", 0.0, ""],
    ["Total Aisladores", 0.0, ""],
]

# Matriz 4: Espaciamiento de red compacta (7 filas x 3 columnas)
matriz_espaciamiento = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Espaciador poligonal polimérico 15 kV 10 kA / 38 kV 16 kA cable cubierto (Tipo Pato)", 0.0, ""],
    ["Espaciador poligonal polimérico 15 kV 10 kA cable cubierto", 0.0, ""],
    ["Espaciador poligonal polimérico 15 kV 10 kA cable cubierto (Tipo Pato)", 0.0, ""],
    ["Espaciador poligonal polimérico 38 kV 16 kA cable cubierto", 0.0, ""],
    ["Espaciador poligonal polimérico 38 kV 16 kA cable cubierto (Tipo Pato)", 0.0, ""],
    ["Espaciador poligonal polimérico cable cubierto (13.2 kV 10 kA / 35 kV 16 kA) (Tipo Pato)", 0.0, ""],
]

# Matriz 5: Conductores y cableado (8 filas x 3 columnas)
matriz_conductores = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Alambre aluminio aislado #8 AWG, 600V", 0.0, ""],
    ["Cable de cobre desnudo #2 AWG", 0.0, ""],
    ["Cable mensajero de acero 3/8''", 0.0, ""],
    ["Cable mensajero, cable 3/8\" acero extra alta resistencia", 0.0, ""],
    ["Cable semi aislado, AAC, 95 mm2, 15 kV", 0.0, ""],
    ["Cable semiaislado AAC 95 mm 2", 0.0, ""],
    ["Cable semiaislado AAC 95 mm 2 35kV", 0.0, ""],
]

# Matriz 6: Sujeción y amarre del conductor (12 filas x 3 columnas)
matriz_sujecion = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Alambre de amarre de aluminio 4 AWG cubierto con elastómero termoplástico TPE ", 0.0, ""],
    ["Estribo para soporte tangencial", 0.0, ""],
    ["Estribos de línea con conector de cuña ", 0.0, ""],
    ["Grapa amarre preformado aislado tipo \"Z\" para red semiaislada. De acuerdo al calibre del conductor  (Amarre Preformado)", 0.0, ""],
    ["Grapa de retención aluminio tipo pistola (3–4 pernos) 2/0AWG-266.8KCMIL", 0.0, ""],
    ["Grapa de retención aluminio tipo pistola (3–4 pernos) 4AWG a 2/0 AWG", 0.0, ""],
    ["Grapa de retención tipo recto en aluminio 6AWG a 2/0AWG - 2/0AWG-266.8KCMIL", 0.0, ""],
    ["Grapa de suspensión aluminio 2/0AWG-266.8KCMIL (4/0 AWG a 336.4 KCMIL)", 0.0, ""],
    ["Grapa de suspensión aluminio 4 AWG - 2/0 AWG (1/4\" - 3/8\")", 0.0, ""],
    ["Grapa preformada aleación de aluminio 2 AWG a 312.8 kcmil 15 kV  / 38 kV cable cubierto  (Amarre Preformado)", 0.0, ""],
    ["Grapa Suspension para soporte mensajero red compacta", 0.0, ""],
]

# Matriz 7: Tornillería y herrajes de unión (25 filas x 3 columnas)
matriz_tornilleria = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Arandelas de presión (Guasa) Galv. Ø15,9 mm (5/8\")", 0.0, ""],
    ["Arandelas redondas planas de acero Ø15,9 mm (5/8′′)", 0.0, ""],
    ["Eslabón en U 5/8\" forjado galvanizado", 0.0, ""],
    ["Espigo corto para aislador tipo pin 6”x1 1/2”x3/4” rosca nailon 1” cruceta metálica (34,5 kV)", 0.0, ""],
    ["Guardacabo acero galvanizad Ø15,9 mm (5/8′′)", 0.0, ""],
    ["Guardacabo acero galvanizado Ø19,5 mm (3/4\")", 0.0, ""],
    ["Perno espaciador 15.9 x 254 mm (Esparrago 5/8\" x 10\")", 0.0, ""],
    ["Perno espaciador 15.9 x 305 mm  (Esparrago 5/8\" x 12\")", 0.0, ""],
    ["Perno espaciador 15.9 x 305 mm  (Esparrago 5/8\" x 14\")", 0.0, ""],
    ["Perno espaciador 15.9 x 458 mm  (Esparrago 5/8\" x 18\")", 0.0, ""],
    ["Perno Espigo corto para aislador tipo pin 10”x1 3/4”x3/4” rosca nailon 1 3/8” cruceta metálica (13,2 kV)", 0.0, ""],
    ["Perno Espigo corto para aislador tipo pin 10”x1 3/4”x3/4” rosca nailon 1 3/8” cruceta metálica (34,5 kV)", 0.0, ""],
    ["Perno Espigo largo para aislador tipo pin 10”x7”x3/4” rosca nailon 1 3/8” cruceta de fibra de vidrio y poste", 0.0, ""],
    ["Pernos espigo para aislador tipo PIN 15kV", 0.0, ""],
    ["Pernos espigo para aislador tipo PIN 35kV", 0.0, ""],
    ["Tornillo cáncamo 11/16” x 5/16” acero forjado C15", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado 5/8\" X 1 1/2\"", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado 5/8\" x 12\"", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado 5/8\" X 2\"", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado 5/8\" x 3\"", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado 5/8\" x 31/2\"", 0.0, ""],
    ["Tornillo de máquina hexagonal acero galvanizado1/2\" x 3\"", 0.0, ""],
    ["Tuercas de ojo alargada acero galv. / Ojos giratorios de Ø15,9 mm (5/8\")", 0.0, ""],
    ["Tuercas hexagonales de acero 5/8′′", 0.0, ""],
]

# Matriz 8: Conectores y empalmes eléctricos (7 filas x 3 columnas)
matriz_conectores = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Conector de compresión tipo H (1/0 a 4 AWG)", 0.0, ""],
    ["Conector empalme conector DBH Y REPOSICION AISLAMIENTO Cable Simieaislado ", 0.0, ""],
    ["Conectores de compresión (C-Tap / H-Tap / Cuña)", 0.0, ""],
    ["Conectores tipo Cuña Cu - Cu #1/0 a #1/0", 0.0, ""],
    ["Conectores tipo Cuña Cu - Cu #2 a #2", 0.0, ""],
    ["Conexión estribo a cable semiaislado con conector DBH y reposición de aislamiento del cable semiaislado", 0.0, ""],
]

# Matriz 9: Protección eléctrica y puesta a tierra (7 filas x 3 columnas)
matriz_proteccionelec = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Conector cuña a presión p/ varilla PAT Ø15,9 mm (5/8\") a Cu #2 AWG", 0.0, ""],
    ["Grapa conexión doble cable tierra", 0.0, ""],
    ["Pararrayos polimerico DPS 12 kV 10 kA", 0.0, ""],
    ["Pararrayos polimerico DPS 30 kV 10 kA", 0.0, ""],
    ["SPT Acero 6.3 Red compacta", 0.0, ""],
    ["Varilla puesta a tierra Ø 15,9 x 2400 mm (5/8\" x 8') Copperweld", 0.0, ""],
]

# Matriz 10: Anclaje y retención mecánica (3 filas x 3 columnas)
matriz_vientos = [
    ["Descripción técnica", "Cant", "Presente en"],
    ["Retenida Viento Poste", 0.0, ""],
    ["Retenidas (Vientos)", 0.0, ""],
]

# %% buscar materiales de poste
# Se procesan todas las normas de la lista
n_normas_procesar = cant_normas

ruta_carpeta_normas = "NormasCelsia"

for i in range(1, n_normas_procesar + 1):      # i = 1, 2, ..., cant_normas (estilo MATLAB)
    # Step 1: leer la norma i de la lista (en Python el índice real es i-1)
    norma_actual = lista_normas[i - 1]

    # Step 2: construir la ruta del archivo de esa norma
    archivo_actual = os.path.join(ruta_carpeta_normas, f"Celsia-{norma_actual}.xlsx")

    # Step 3: importar el archivo como matriz
    df_norma = pd.read_excel(archivo_actual, header=None)
    matriz_actual = df_norma.to_numpy()

    # Step 4: eliminar las primeras 7 filas (texto e imágenes, no relevantes)
    filas_a_eliminar = 7
    matriz_actual = matriz_actual[filas_a_eliminar:, :]

    # Step 5: llenar las familias de materiales
    matriz_postes = lectura_materiales_poste(matriz_actual, matriz_postes, norma_actual)
    matriz_fijacionposte = lectura_materiales_fijacionposte(matriz_actual, matriz_fijacionposte, norma_actual)
    matriz_aisladores = lectura_materiales_aisladores(matriz_actual, matriz_aisladores, norma_actual)
    matriz_espaciamiento = lectura_materiales_espaciamiento(matriz_actual, matriz_espaciamiento, norma_actual)
    matriz_conductores = lectura_materiales_conductores(matriz_actual, matriz_conductores, norma_actual)
    matriz_sujecion = lectura_materiales_sujecion(matriz_actual, matriz_sujecion, norma_actual)
    matriz_tornilleria = lectura_materiales_tornilleria(matriz_actual, matriz_tornilleria, norma_actual)
    matriz_conectores = lectura_materiales_conectores(matriz_actual, matriz_conectores, norma_actual)
    matriz_proteccionelec = lectura_materiales_proteccionelec(matriz_actual, matriz_proteccionelec, norma_actual)
    matriz_vientos = lectura_materiales_vientos(matriz_actual, matriz_vientos, norma_actual)

# Step 6: Generación de matrices sin vacios
matriz_postes_SV = []
matriz_fijacionposte_SV = []
matriz_aisladores_SV = []
matriz_espaciamiento_SV = []
matriz_conductores_SV = []
matriz_sujecion_SV = []
matriz_tornilleria_SV = []
matriz_conectores_SV = []
matriz_proteccionelec_SV = []
matriz_vientos_SV = []

for m in range(len(matriz_postes)):
    if matriz_postes[m][1] != 0:
        matriz_postes_SV.append(matriz_postes[m])

for m in range(len(matriz_fijacionposte)):
    if matriz_fijacionposte[m][1] != 0:
        matriz_fijacionposte_SV.append(matriz_fijacionposte[m])

for m in range(len(matriz_aisladores)):
    if matriz_aisladores[m][1] != 0:
        matriz_aisladores_SV.append(matriz_aisladores[m])

for m in range(len(matriz_espaciamiento)):
    if matriz_espaciamiento[m][1] != 0:
        matriz_espaciamiento_SV.append(matriz_espaciamiento[m])

for m in range(len(matriz_conductores)):
    if matriz_conductores[m][1] != 0:
        matriz_conductores_SV.append(matriz_conductores[m])

for m in range(len(matriz_sujecion)):
    if matriz_sujecion[m][1] != 0:
        matriz_sujecion_SV.append(matriz_sujecion[m])

for m in range(len(matriz_tornilleria)):
    if matriz_tornilleria[m][1] != 0:
        matriz_tornilleria_SV.append(matriz_tornilleria[m])

for m in range(len(matriz_conectores)):
    if matriz_conectores[m][1] != 0:
        matriz_conectores_SV.append(matriz_conectores[m])

for m in range(len(matriz_proteccionelec)):
    if matriz_proteccionelec[m][1] != 0:
        matriz_proteccionelec_SV.append(matriz_proteccionelec[m])

for m in range(len(matriz_vientos)):
    if matriz_vientos[m][1] != 0:
        matriz_vientos_SV.append(matriz_vientos[m])



# %% Exportación: matriz consolidada de materiales
matriz_materiales_exp = []

# Familia 1: Estructura de soporte principal
matriz_materiales_exp.append(["Estructura de soporte principal", "", ""])
matriz_materiales_exp.extend(matriz_postes_SV)
matriz_materiales_exp.append(["Total elementos de estructura de soporte principal",
                              sum(fila[1] for fila in matriz_postes_SV[1:]), ""])

# Familia 2: Fijación al poste
matriz_materiales_exp.append(["Fijación al poste", "", ""])
matriz_materiales_exp.extend(matriz_fijacionposte_SV)
matriz_materiales_exp.append(["Total elementos de fijación al poste",
                              sum(fila[1] for fila in matriz_fijacionposte_SV[1:]), ""])

# Familia 3: Aisladores
matriz_materiales_exp.append(["Aisladores", "", ""])
matriz_materiales_exp.extend(matriz_aisladores_SV)
matriz_materiales_exp.append(["Total elementos de aisladores",
                              sum(fila[1] for fila in matriz_aisladores_SV[1:]), ""])

# Familia 4: Espaciamiento de red compacta
matriz_materiales_exp.append(["Espaciamiento de red compacta", "", ""])
matriz_materiales_exp.extend(matriz_espaciamiento_SV)
matriz_materiales_exp.append(["Total elementos de espaciamiento de red compacta",
                              sum(fila[1] for fila in matriz_espaciamiento_SV[1:]), ""])

# Familia 5: Conductores y cableado
matriz_materiales_exp.append(["Conductores y cableado", "", ""])
matriz_materiales_exp.extend(matriz_conductores_SV)
matriz_materiales_exp.append(["Total elementos de conductores y cableado",
                              sum(fila[1] for fila in matriz_conductores_SV[1:]), ""])

# Familia 6: Sujeción y amarre del conductor
matriz_materiales_exp.append(["Sujeción y amarre del conductor", "", ""])
matriz_materiales_exp.extend(matriz_sujecion_SV)
matriz_materiales_exp.append(["Total elementos de sujeción y amarre del conductor",
                              sum(fila[1] for fila in matriz_sujecion_SV[1:]), ""])

# Familia 7: Tornillería y herrajes de unión
matriz_materiales_exp.append(["Tornillería y herrajes de unión", "", ""])
matriz_materiales_exp.extend(matriz_tornilleria_SV)
matriz_materiales_exp.append(["Total elementos de tornillería y herrajes de unión",
                              sum(fila[1] for fila in matriz_tornilleria_SV[1:]), ""])

# Familia 8: Conectores y empalmes eléctricos
matriz_materiales_exp.append(["Conectores y empalmes eléctricos", "", ""])
matriz_materiales_exp.extend(matriz_conectores_SV)
matriz_materiales_exp.append(["Total elementos de conectores y empalmes eléctricos",
                              sum(fila[1] for fila in matriz_conectores_SV[1:]), ""])

# Familia 9: Protección eléctrica y puesta a tierra
matriz_materiales_exp.append(["Protección eléctrica y puesta a tierra", "", ""])
matriz_materiales_exp.extend(matriz_proteccionelec_SV)
matriz_materiales_exp.append(["Total elementos de protección eléctrica y puesta a tierra",
                              sum(fila[1] for fila in matriz_proteccionelec_SV[1:]), ""])

# Familia 10: Anclaje y retención mecánica
matriz_materiales_exp.append(["Anclaje y retención mecánica", "", ""])
matriz_materiales_exp.extend(matriz_vientos_SV)
matriz_materiales_exp.append(["Total elementos de anclaje y retención mecánica",
                              sum(fila[1] for fila in matriz_vientos_SV[1:]), ""])

# Exportar como CSV
df_export = pd.DataFrame(matriz_materiales_exp)
csv_path = os.path.join("public", "materiales_normas_celsia.csv")
os.makedirs("public", exist_ok=True)
df_export.to_csv(csv_path, index=False, header=False, encoding="utf-8-sig", sep=";", decimal=",")

# %% Totales por familia
print("\nCantidad de materiales calculados por familia")
totales = {nombre: sum(fila[1] for fila in matriz[1:])
           for nombre, matriz in
           [("Postes", matriz_postes_SV),
            ("Fijación", matriz_fijacionposte_SV),
            ("Aisladores", matriz_aisladores_SV),
            ("Espaciamiento", matriz_espaciamiento_SV),
            ("Conductores", matriz_conductores_SV),
            ("Sujeción", matriz_sujecion_SV),
            ("Tornillería", matriz_tornilleria_SV),
            ("Conectores", matriz_conectores_SV),
            ("Protección eléctrica", matriz_proteccionelec_SV),
            ("Vientos", matriz_vientos_SV)]}

reporte_totales = "\n".join(f"{nombre}: {cantidad}" for nombre, cantidad in totales.items())
reporte_totales += f"\nCantidad total de materiales del proyecto: {sum(totales.values())}"

print(reporte_totales)