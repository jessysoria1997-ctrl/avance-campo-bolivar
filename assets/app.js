(() => {
  const SUPERVISORES = [
    { nombre: 'Marcela Sangucho', color: '#8b5cf6' },
    { nombre: 'Carina Flores', color: '#06aed4' },
    { nombre: 'Manolo Almagro', color: '#f97316' },
  ];
  const PARROQUIAS = ['Bolívar (cabecera cantonal)', 'García Moreno', 'Los Andes', 'Monte Olivo', 'San Rafael', 'San Vicente de Pusir'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const REFRESCO_MS = 2 * 60 * 1000;
  const moverse = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  let primeraVez = true;
  let mapa = null, capaParroquias = null, capaBurbujas = null, capaPuntos = null, centros = new Map();

  const fechaCorta = (s) => (s ? `${Number(s.slice(8, 10))} ${MESES[Number(s.slice(5, 7)) - 1]}` : '—');
  const horaCorta = (iso) => {
    if (!iso) return '—';
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return '—';
    return `${fechaCorta(iso.slice(0, 10))}, ${t.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })}`;
  };
  const pct = (v) => `${Math.round(v * 100)}%`;

  function numero(el, valor) {
    if (!el) return;
    const fin = Math.round(valor);
    if (!moverse || !primeraVez) { el.textContent = String(fin); return; }
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      el.textContent = String(Math.round(fin * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function calcular(datos) {
    const enc = Array.isArray(datos.encuestas) ? datos.encuestas : [];
    const meta = Number(datos.meta) || 700;
    const fechas = [...new Set(enc.map((e) => e.fecha))].sort();
    const ultima = fechas[fechas.length - 1];
    const dias = [0, 1].map((i) => {
      const fecha = fechas[i] || null;
      const del = enc.filter((e) => fecha && e.fecha === fecha);
      return { fecha, total: del.length, porSup: SUPERVISORES.map((s) => del.filter((e) => e.supervisor === s.nombre).length) };
    });
    const porSup = SUPERVISORES.map((s) => {
      const suyas = enc.filter((e) => e.supervisor === s.nombre);
      return { ...s, total: suyas.length, parte: enc.length ? suyas.length / enc.length : 0, d1: suyas.filter((e) => e.fecha === fechas[0]).length, d2: suyas.filter((e) => e.fecha === fechas[1]).length };
    });
    const parroquias = PARROQUIAS.map((p) => {
      const de = enc.filter((e) => e.parroquia === p);
      return { parroquia: p, porSup: SUPERVISORES.map((s) => de.filter((e) => e.supervisor === s.nombre).length), total: de.length };
    });
    const grupo = (lista) => {
      const edad = (e) => Number(e.edad);
      return [
        lista.filter((e) => e.sexo === 'Hombre').length, lista.filter((e) => e.sexo === 'Mujer').length,
        lista.filter((e) => e.zona === 'Urbana').length, lista.filter((e) => e.zona === 'Rural').length,
        lista.filter((e) => edad(e) >= 16 && edad(e) <= 29).length, lista.filter((e) => edad(e) >= 30 && edad(e) <= 44).length,
        lista.filter((e) => edad(e) >= 45 && edad(e) <= 64).length, lista.filter((e) => edad(e) >= 65).length,
      ];
    };
    const perfil = [...SUPERVISORES.map((s) => ({ nombre: s.nombre, v: grupo(enc.filter((e) => e.supervisor === s.nombre)) })), { nombre: 'Total', v: grupo(enc), total: true }];
    return { total: enc.length, meta, faltan: Math.max(meta - enc.length, 0), avance: meta ? enc.length / meta : 0, ultimoDia: enc.filter((e) => e.fecha === ultima).length, dias, porSup, parroquias, perfil };
  }

  function fila(celdas, clase) {
    const tr = document.createElement('tr');
    if (clase) tr.className = clase;
    celdas.forEach((c) => { const td = document.createElement('td'); td.textContent = String(c); tr.append(td); });
    return tr;
  }

  function pintar(datos) {
    const c = calcular(datos);
    $('nota-ejemplo').hidden = !datos.ejemplo;
    $('chip-ultima').textContent = `Última encuesta: ${horaCorta(datos.ultima_encuesta)}`;
    $('chip-revisado').textContent = `Actualizado: ${horaCorta(datos.generado)}`;

    numero($('k-realizadas'), c.total);
    numero($('k-meta'), c.meta);
    numero($('k-faltan'), c.faltan);
    $('k-ultimo-dia').textContent = String(c.ultimoDia);
    $('k-avance').textContent = pct(c.avance);
    requestAnimationFrame(() => { $('g-bar').style.strokeDasharray = `${Math.min(c.avance, 1) * 100} 100`; });

    c.dias.forEach((d, i) => {
      $(`d${i + 1}-fecha`).textContent = d.fecha ? fechaCorta(d.fecha) : 'Sin datos todavía';
      numero($(`d${i + 1}-total`), d.total);
      const mix = $(`d${i + 1}-mix`);
      mix.replaceChildren();
      d.porSup.forEach((n, j) => {
        const s = document.createElement('span');
        s.style.background = SUPERVISORES[j].color;
        s.style.width = d.total ? `${(n / d.total) * 100}%` : '0';
        s.title = `${SUPERVISORES[j].nombre}: ${n}`;
        mix.append(s);
      });
    });

    c.porSup.forEach((s) => {
      const card = document.querySelector(`[data-sup="${s.nombre}"]`);
      if (!card) return;
      numero(card.querySelector('[data-campo="n"]'), s.total);
      card.querySelector('[data-campo="pct"]').textContent = pct(s.parte);
      card.querySelector('[data-campo="d1"]').textContent = String(s.d1);
      card.querySelector('[data-campo="d2"]').textContent = String(s.d2);
      const barra = card.querySelector('[data-campo="barra"]');
      requestAnimationFrame(() => { barra.style.width = `${s.parte * 100}%`; });
    });

    const tp = $('tabla-parroquias').tBodies[0];
    tp.replaceChildren(...c.parroquias.map((p) => fila([p.parroquia, ...p.porSup, p.total])));
    const tot = SUPERVISORES.map((s, j) => c.parroquias.reduce((a, p) => a + p.porSup[j], 0));
    tp.append(fila(['Total', ...tot, tot.reduce((a, b) => a + b, 0)], 'total'));
    $('tabla-perfil').tBodies[0].replaceChildren(...c.perfil.map((p) => fila([p.nombre, ...p.v], p.total ? 'total' : '')));

    pintarMapa(c, datos);
    primeraVez = false;
  }

  // ---------- Mapa ----------
  function centroAnillo(anillo) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < anillo.length - 1; i++) {
      const [x0, y0] = anillo[i], [x1, y1] = anillo[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f; x += (x0 + x1) * f; y += (y0 + y1) * f;
    }
    return { area: Math.abs(a / 2), lon: x / (3 * a), lat: y / (3 * a) };
  }
  function centroParroquia(geom) {
    const polis = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    return polis.map((p) => centroAnillo(p[0])).sort((a, b) => b.area - a.area)[0];
  }
  function mezcla(t) {
    const a = [219, 231, 255], b = [30, 111, 255];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  }
  function tooltip(nombre, porSup, total) {
    const div = document.createElement('div');
    const t = document.createElement('b');
    t.textContent = `${nombre}: ${total} encuestas`;
    div.append(t);
    SUPERVISORES.forEach((s, j) => {
      const l = document.createElement('div');
      const sw = document.createElement('i');
      sw.style.background = s.color;
      l.append(sw, document.createTextNode(`${s.nombre}: ${porSup[j]}`));
      div.append(l);
    });
    return div;
  }

  function iniciarMapa(geo) {
    mapa = L.map('mapa', { scrollWheelZoom: false, zoomSnap: 0.25 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapa);
    capaParroquias = L.geoJSON(geo, { style: { color: '#12264a', weight: 1.5, fillColor: '#dbe7ff', fillOpacity: 0.55 } }).addTo(mapa);
    geo.features.forEach((f) => centros.set(f.properties.parroquia, centroParroquia(f.geometry)));
    mapa.fitBounds(capaParroquias.getBounds(), { padding: [8, 8] });
    capaBurbujas = L.layerGroup().addTo(mapa);
    capaPuntos = L.layerGroup();
    L.control.layers(null, { 'Encuestas por parroquia': capaBurbujas, 'Ubicaciones GPS': capaPuntos }, { collapsed: true }).addTo(mapa);
    mapa.on('click', () => mapa.scrollWheelZoom.enable());
    mapa.on('mouseout', () => mapa.scrollWheelZoom.disable());
    window.addEventListener('resize', () => mapa.invalidateSize());
  }

  function pintarMapa(c, datos) {
    if (!mapa) return;
    const por = new Map(c.parroquias.map((p) => [p.parroquia, p]));
    const max = Math.max(1, ...c.parroquias.map((p) => p.total));
    capaParroquias.eachLayer((capa) => {
      const p = por.get(capa.feature.properties.parroquia) || { porSup: [0, 0, 0], total: 0 };
      capa.setStyle({ fillColor: mezcla(p.total / max), fillOpacity: 0.6 });
      capa.unbindTooltip();
      capa.bindTooltip(tooltip(capa.feature.properties.parroquia, p.porSup, p.total), { sticky: true, className: 'av-tip' });
      capa.off('mouseover').off('mouseout');
      capa.on('mouseover', () => capa.setStyle({ weight: 3 }));
      capa.on('mouseout', () => capa.setStyle({ weight: 1.5 }));
    });
    capaBurbujas.clearLayers();
    c.parroquias.forEach((p) => {
      const ct = centros.get(p.parroquia);
      if (!ct || !p.total) return;
      const d = Math.round(22 + 34 * Math.sqrt(p.total / max));
      const html = `<div class="av-pulso" style="width:${d}px;height:${d}px"><span class="onda"></span><span class="bola">${p.total}</span></div>`;
      const icono = L.divIcon({ className: '', html, iconSize: [d, d], iconAnchor: [d / 2, d / 2] });
      L.marker([ct.lat, ct.lon], { icon: icono, keyboard: false })
        .bindTooltip(tooltip(p.parroquia, p.porSup, p.total), { className: 'av-tip', direction: 'top', offset: [0, -d / 2] })
        .addTo(capaBurbujas);
    });
    capaPuntos.clearLayers();
    (Array.isArray(datos.puntos) ? datos.puntos : []).forEach((pt) => {
      const s = SUPERVISORES.find((x) => x.nombre === pt.supervisor);
      L.circleMarker([pt.lat, pt.lon], { radius: 4, weight: 1, color: '#fff', fillColor: s ? s.color : '#5d6b82', fillOpacity: 0.9 }).addTo(capaPuntos);
    });
  }

  // ---------- Carga ----------
  async function cargar() {
    try {
      const r = await fetch(`data/encuestas.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      pintar(await r.json());
      $('nota-error').hidden = true;
    } catch (e) {
      $('nota-error').hidden = false;
      $('chip-revisado').textContent = 'Sin conexión';
      console.error(e);
    }
  }

  async function inicio() {
    try {
      const geo = await (await fetch('assets/parroquias_bolivar.geojson')).json();
      iniciarMapa(geo);
    } catch (e) {
      console.error('No se pudo cargar el mapa', e);
    }
    await cargar();
    setInterval(cargar, REFRESCO_MS);
  }
  inicio();
})();
