"""Descarga las encuestas desde KoboToolbox y genera data/encuestas.json para el tablero.

Solo publica los datos de avance (fecha, supervisor, parroquia, zona, sexo, edad)
y la ubicación redondeada. Nunca publica respuestas de opinión ni de voto.

Variables de entorno (en GitHub van como "Secrets" y "Variables"):
  KOBO_TOKEN      clave API de KoboToolbox (obligatoria)
  KOBO_ASSET_UID  identificador del formulario, p. ej. aBcDeFgH123... (obligatorio)
  KOBO_URL        servidor de Kobo (por defecto https://kf.kobotoolbox.org)
  META            meta total de encuestas (por defecto 700)
"""
import datetime as dt
import json
import os
import random
import sys
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "data", "encuestas.json")

SUPERVISORES = {
    "marcela_sangucho": "Marcela Sangucho",
    "carina_flores": "Carina Flores",
    "manolo_almagro": "Manolo Almagro",
}
PARROQUIAS = {
    "bolivar": "Bolívar (cabecera cantonal)",
    "garcia_moreno": "García Moreno",
    "los_andes": "Los Andes",
    "monte_olivo": "Monte Olivo",
    "san_rafael": "San Rafael",
    "san_vicente_pusir": "San Vicente de Pusir",
}
SEXO = {"hombre": "Hombre", "mujer": "Mujer"}
ECUADOR = dt.timezone(dt.timedelta(hours=-5))


def campo(registro, nombre):
    """Devuelve el valor de una pregunta aunque esté dentro de grupos (p. ej. 'principal/s2/f4_edad')."""
    for clave, valor in registro.items():
        if clave == nombre or clave.endswith("/" + nombre):
            return valor
    return None


def descargar(servidor, uid, token):
    url = f"{servidor}/api/v2/assets/{uid}/data/?format=json&limit=1000"
    registros = []
    while url:
        peticion = urllib.request.Request(url, headers={"Authorization": f"Token {token}", "Accept": "application/json"})
        with urllib.request.urlopen(peticion, timeout=90) as r:
            pagina = json.load(r)
        registros.extend(pagina.get("results", []))
        url = pagina.get("next")
    return registros


def hora_local(texto):
    """Convierte _submission_time (UTC) a hora de Ecuador."""
    if not texto:
        return None
    t = dt.datetime.fromisoformat(texto.replace("Z", "+00:00"))
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return t.astimezone(ECUADOR)


def main():
    token = os.environ.get("KOBO_TOKEN", "").strip()
    uid = os.environ.get("KOBO_ASSET_UID", "").strip()
    servidor = (os.environ.get("KOBO_URL") or "https://kf.kobotoolbox.org").strip().rstrip("/")
    meta = int(os.environ.get("META") or 700)
    if not token or not uid:
        print("Faltan KOBO_TOKEN o KOBO_ASSET_UID: se mantiene el archivo de datos actual.")
        return 0

    registros = descargar(servidor, uid, token)
    encuestas, puntos, ultima = [], [], None
    for reg in registros:
        if campo(reg, "f1_vota_bolivar") != "si":
            continue  # no elegible o entrevista terminada en el filtro
        estado = (reg.get("_validation_status") or {}).get("uid")
        if estado == "validation_status_not_approved":
            continue  # encuestas rechazadas por el supervisor en Kobo
        enviado = hora_local(reg.get("_submission_time"))
        fecha = campo(reg, "fecha") or (enviado.date().isoformat() if enviado else None)
        if not fecha:
            continue
        if enviado and (ultima is None or enviado > ultima):
            ultima = enviado
        sup = campo(reg, "supervisor") or ""
        parr = campo(reg, "f2_parroquia") or ""
        zona = campo(reg, "f3_zona") or ("urbana" if parr == "bolivar" else "rural")
        try:
            edad = int(campo(reg, "f4_edad"))
        except (TypeError, ValueError):
            edad = None
        encuestas.append({
            "fecha": str(fecha)[:10],
            "supervisor": SUPERVISORES.get(sup, sup.replace("_", " ").title()),
            "parroquia": PARROQUIAS.get(parr, parr),
            "zona": "Urbana" if zona == "urbana" else "Rural",
            "sexo": SEXO.get(campo(reg, "f5_sexo") or "", ""),
            "edad": edad,
        })
        geo = reg.get("_geolocation") or [None, None]
        if geo and geo[0] is not None and geo[1] is not None:
            puntos.append({
                "supervisor": SUPERVISORES.get(sup, sup),
                "lat": round(float(geo[0]), 3),
                "lon": round(float(geo[1]), 3),
            })

    random.shuffle(puntos)  # los puntos no siguen el orden de las encuestas
    encuestas.sort(key=lambda e: (e["fecha"], e["supervisor"]))
    salida = {
        "ejemplo": False,
        "meta": meta,
        "ultima_encuesta": ultima.isoformat(timespec="minutes") if ultima else None,
        "generado": dt.datetime.now(ECUADOR).isoformat(timespec="minutes"),
        "encuestas": encuestas,
        "puntos": puntos,
    }
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(encuestas)} encuestas válidas de {len(registros)} registros; {len(puntos)} con ubicación.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
