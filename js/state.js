var App = App || {};

App.state = {
    map: null,
    streetLayer: null,
    satLayer: null,
    isSatellite: false,
    user: null,
    fairs: [],
    currentFairId: null,
    points: [],
    markers: [],
    recuadros: [],
    editMode: false,
    movingPointsMode: false,
    adminOnlyPending: false,
    drawingMode: null,
    drawingVertices: [],
    drawingPolyline: null,
    placingMarker: null,
};

App.consts = {
    COLORS: {
        caseta: '#007bff',
        cacharrito: '#28a745',
        puesto: '#ff9800',
        'baño': '#dc3545',
        estacionamiento: '#7f8c8d',
        otro: '#9b59b6',
    },
    BADGES: {
        caseta: 'badge-caseta',
        cacharrito: 'badge-cacharrito',
        puesto: 'badge-puesto',
        'baño': 'badge-baño',
        estacionamiento: 'badge-estacionamiento',
        otro: 'badge-otro',
    },
    /* Subcategorías por categoría base. v = valor guardado en DB, t = etiqueta UI, emoji = icono */
    SUBCATEGORIES: {
        caseta: [
            { v: 'caseta',           t: '🏠 Genérico',   emoji: '🏠' },
            { v: 'caseta_publica',   t: '🌍 Pública',    emoji: '🌍' },
            { v: 'caseta_privada',   t: '🔒 Privada',    emoji: '🔒' },
            { v: 'caseta_municipal', t: '🏛️ Municipal',  emoji: '🏛️' },
        ],
        cacharrito: [
            { v: 'cacharrito',              t: '🎡 Cacharrito',    emoji: '🎡' },
            { v: 'cacharrito_noria',        t: '🎡 Noria',         emoji: '🎡' },
            { v: 'cacharrito_montana',      t: '🎢 Montaña Rusa',  emoji: '🎢' },
            { v: 'cacharrito_tiovivo',      t: '🎠 Tiovivo',       emoji: '🎠' },
            { v: 'cacharrito_atraccion',    t: '🎯 Atracción',     emoji: '🎯' },
            { v: 'cacharrito_barco',        t: '⛵ Barco',          emoji: '⛵' },
            { v: 'cacharrito_vikinga',      t: '⚓ Barca Vikinga',  emoji: '⚓' },
            { v: 'cacharrito_locos',        t: '🚗 Coches Locos',  emoji: '🚗' },
        ],
        puesto: [
            { v: 'puesto',           t: '🎪 Puesto',          emoji: '🎪' },
            { v: 'puesto_hotdog',    t: '🌭 Hot Dog',         emoji: '🌭' },
            { v: 'puesto_gofre',     t: '🧇 Gofre',           emoji: '🧇' },
            { v: 'puesto_pizza',     t: '🍕 Pizza',           emoji: '🍕' },
            { v: 'puesto_comida',    t: '🍽️ Comida',         emoji: '🍽️' },
            { v: 'puesto_helados',   t: '🍦 Helados',         emoji: '🍦' },
            { v: 'puesto_patos',     t: '🦆 Pesca de Patos',  emoji: '🦆' },
            { v: 'puesto_pichon',    t: '🎯 Tiro al Pichón',  emoji: '🎯' },
            { v: 'puesto_dardos',    t: '🏹 Dardos',          emoji: '🏹' },
            { v: 'puesto_policia',   t: '🚓 Est. Policía',    emoji: '🚓' },
            { v: 'puesto_monumento', t: '🏛️ Monumento',      emoji: '🏛️' },
            { v: 'puesto_churreria', t: '🪙 Churrería',       emoji: '🪙' },
        ],
        'baño': [
            { v: 'baño',          t: '🚻 Baño',      emoji: '🚻' },
            { v: 'baño_adaptado', t: '♿ Adaptado',   emoji: '♿' },
            { v: 'baño_duchas',   t: '🚿 Duchas',     emoji: '🚿' },
        ],
        estacionamiento: [
            { v: 'estacionamiento',           t: '🚗 Estacionamiento', emoji: '🚗' },
            { v: 'estacionamiento_motos',     t: '🏍️ Motos',          emoji: '🏍️' },
            { v: 'estacionamiento_adaptado',  t: '♿ Adaptado',         emoji: '♿' },
            { v: 'estacionamiento_buses',     t: '🚌 Autobuses',       emoji: '🚌' },
        ],
        otro: [
            { v: 'otro',           t: '📍 Otro',              emoji: '📍' },
            { v: 'otro_auxilios',  t: '🏥 Primeros Auxilios', emoji: '🏥' },
            { v: 'otro_info',      t: '📢 Información',       emoji: '📢' },
            { v: 'otro_escenario', t: '🎤 Escenario',         emoji: '🎤' },
            { v: 'otro_limpio',    t: '🗑️ Punto Limpio',     emoji: '🗑️' },
        ],
    },
};

/* Build EMOJIS and LABELS maps from SUBCATEGORIES for fast lookup */
App.consts.EMOJIS = {};
App.consts.LABELS = {};
(function () {
    var baseCats = ['caseta', 'cacharrito', 'puesto', 'baño', 'estacionamiento', 'otro'];
    var baseLabels = ['Caseta', 'Cacharrito', 'Puesto', 'Baño', 'Estacionamiento', 'Otro'];
    baseCats.forEach(function (cat, i) {
        App.consts.LABELS[cat] = baseLabels[i];
    });
    Object.keys(App.consts.SUBCATEGORIES).forEach(function (cat) {
        App.consts.SUBCATEGORIES[cat].forEach(function (sub) {
            App.consts.EMOJIS[sub.v] = sub.emoji;
            if (sub.v !== cat) {
                /* e.g. 'puesto_hotdog' → label 'Hot Dog' (strip prefix + emoji) */
                App.consts.LABELS[sub.v] = sub.t.replace(/^\S+\s/, '');
            }
        });
    });
})();
