App.ui = {};

(function (u) {
    var EMOJI_PREFIX_RE = /^EMOJI:([^\n]+)\n?/;

    u.extractEmoji = function (sinopsis) {
        if (!sinopsis) return '';
        var m = sinopsis.match(EMOJI_PREFIX_RE);
        return m ? m[1].trim() : '';
    };

    u.stripEmojiPrefix = function (sinopsis) {
        if (!sinopsis) return '';
        return sinopsis.replace(EMOJI_PREFIX_RE, '');
    };

    u.escapeHtml = function (value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    function normalizeCat(cat) {
        if (!cat) return '';
        var idx = cat.indexOf('_');
        if (idx === -1) return cat;
        var prefix = cat.substring(0, idx);
        return App.consts.COLORS[prefix] !== undefined ? prefix : cat;
    }

    function getCatLabel(cat) {
        return App.consts.LABELS[cat] || (cat || '').replace(/_/g, ' ');
    }

    function getCatBadge(cat) {
        var base = normalizeCat(cat);
        return App.consts.BADGES[base] || App.consts.BADGES[cat] || 'badge-caseta';
    }

    /* ---- Emoji picker (visual grid, global popup) ---- */
    var _emojiCb = null;

    u.emojiPicker = {
        EMOJIS: [
            '🌭','🍕','🍔','🌮','🥪','🍟','🧇','🍩','🥐','🍪','🍫','🍦','☕','🍺','🥤',
            '🌹','🎵','🎶','⭐','🏆','🥇','🎯','🎊','🎈','🎨','💃','🎭','🎤','📢','💡',
            '🏠','🏛️','🏥','🏪','🎪','🎡','🎢','🎠','🗺️','📍','📌','🔑','⚙️','🔥','🌟',
            '🚗','🏍️','🚌','🚲','🅿️','🚓','🚑','🚒','⛽','🗑️','♿','🚿','🚻','⛵','🏁',
        ],
        show: function (triggerEl, currentEmoji, callback) {
            _emojiCb = callback;
            var popup = document.getElementById('emoji-popup');
            if (!popup._built) { this._build(); popup._built = true; }
            popup.querySelectorAll('.ep-btn').forEach(function (b) {
                b.classList.toggle('ep-btn-selected', b.dataset.e === currentEmoji);
            });
            var backdrop = document.getElementById('emoji-popup-backdrop');
            popup.style.display = 'block';
            backdrop.style.display = 'block';
        },
        hide: function () {
            document.getElementById('emoji-popup').style.display = 'none';
            document.getElementById('emoji-popup-backdrop').style.display = 'none';
            _emojiCb = null;
        },
        _build: function () {
            var grid = document.getElementById('emoji-popup-grid');
            var self = this;
            grid.innerHTML = this.EMOJIS.map(function (e) {
                return '<button type="button" class="ep-btn" data-e="' + e + '">' + e + '</button>';
            }).join('');
            grid.addEventListener('click', function (ev) {
                var btn = ev.target.closest('.ep-btn');
                if (btn && _emojiCb) { _emojiCb(btn.dataset.e); self.hide(); }
            });
        },
    };

    /* ---- Toast ---- */
    u.showToast = function (msg) {
        var el = document.getElementById('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._timeout);
        el._timeout = setTimeout(function () { el.classList.remove('show'); }, 2500);
    };

    /* ---- Header ---- */
    u.updateHeader = function () {
        var loginBtn = document.getElementById('btn-login');
        var userMenu = document.getElementById('user-menu');
        var greeting = document.getElementById('user-greeting');
        var createBtn = document.getElementById('btn-create-fair');
        var adminBtn = document.getElementById('btn-admin');
        var settingsBtn = document.getElementById('btn-settings');
        if (App.auth.isLoggedIn()) {
            loginBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            greeting.textContent = '\uD83D\uDC64 ' + App.state.user.nombre;
            if (createBtn) createBtn.style.display = '';
            if (adminBtn) adminBtn.style.display = App.auth.hasRole(['root', 'moderador']) ? '' : 'none';
            if (settingsBtn) settingsBtn.style.display = '';
        } else {
            loginBtn.style.display = 'block';
            userMenu.style.display = 'none';
            if (createBtn) createBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = '';
        }
    };

    /* ---- Modals ---- */
    function showModal(id) {
        document.querySelectorAll('#modal-login, #modal-register, #modal-create-fair, #modal-add-point, #modal-delete-confirm, #modal-admin, #modal-settings, #modal-edit-points')
            .forEach(function (e) { e.style.display = 'none'; });
        if (id) document.getElementById(id).style.display = 'block';
        document.getElementById('modal-overlay').style.display = 'flex';
    }

    u.showLogin = function () { showModal('modal-login'); };
    u.showRegister = function () { showModal('modal-register'); };

    u.showCreateFairModal = function () {
        showModal('modal-create-fair');
    };

    u.showCreateFair = function () {
        if (!App.auth.isLoggedIn()) { u.showToast('Debes iniciar sesi\u00f3n'); return; }
        document.getElementById('cf-id-feria').value = '';
        document.getElementById('cf-titulo').textContent = 'Nuevo Mapa de Feria';
        document.getElementById('cf-submit').textContent = 'Crear Mapa';
        document.getElementById('cf-nombre').value = '';
        document.getElementById('cf-localidad').value = '';
        document.getElementById('cf-zona').value = '';
        document.getElementById('cf-lat').value = '';
        document.getElementById('cf-lng').value = '';
        document.getElementById('cf-color').value = '#e74c3c';
        document.getElementById('cf-zona-status').textContent = 'Dibuja un recuadro delimitando el \u00e1rea de la feria';
        document.getElementById('cf-zona-status').style.color = '#999';
        document.getElementById('cf-error').textContent = '';
        document.getElementById('cf-success').textContent = '';
        App.map.clearZone();
        if (App.state.zonePreviewGroup) { App.state.map.removeLayer(App.state.zonePreviewGroup); App.state.zonePreviewGroup = null; }
        showModal('modal-create-fair');
    };

    u.showEditFair = function (fair) {
        if (!App.auth.isLoggedIn()) { u.showToast('Debes iniciar sesi\u00f3n'); return; }
        document.getElementById('cf-id-feria').value = fair.id_feria;
        document.getElementById('cf-titulo').textContent = 'Editar Mapa';
        document.getElementById('cf-submit').textContent = 'Guardar Cambios';
        document.getElementById('cf-nombre').value = fair.nombre_feria;
        document.getElementById('cf-localidad').value = fair.localidad;
        document.getElementById('cf-zona').value = fair.zona || '';
        document.getElementById('cf-lat').value = fair.centro_lat || '';
        document.getElementById('cf-lng').value = fair.centro_lng || '';
        document.getElementById('cf-color').value = fair.color_perimetro || '#e74c3c';
        document.getElementById('cf-error').textContent = '';
        document.getElementById('cf-success').textContent = '';
        App.map.clearZone();
        if (App.state.zonePreviewGroup) { App.state.map.removeLayer(App.state.zonePreviewGroup); App.state.zonePreviewGroup = null; }
        if (fair.zona) {
            App.state._currentFairName = fair.nombre_feria;
            App.map.renderZone(fair.zona, fair.color_perimetro);
            document.getElementById('cf-zona-status').textContent = '\u2705 Zona definida (' + JSON.parse(fair.zona).length + ' v\u00e9rtices)';
            document.getElementById('cf-zona-status').style.color = '#28a745';
        } else {
            document.getElementById('cf-zona-status').textContent = 'Dibuja un recuadro delimitando el \u00e1rea de la feria';
            document.getElementById('cf-zona-status').style.color = '#999';
        }
        showModal('modal-create-fair');
    };

    u.showAddPoint = function () {
        if (!App.auth.isLoggedIn()) { u.showToast('Debes iniciar sesi\u00f3n'); return; }
        if (!App.state.currentFairId) { u.showToast('Selecciona una feria primero'); return; }
        document.getElementById('ap-nombre').value = '';
        document.getElementById('ap-categoria').value = '';
        var apSubWrap = document.getElementById('ap-subcategoria-wrap');
        var apSubSel = document.getElementById('ap-subcategoria');
        if (apSubWrap) apSubWrap.style.display = 'none';
        if (apSubSel) apSubSel.innerHTML = '';
        var apEmojiHidden = document.getElementById('ap-emoji');
        var apEmojiPreview = document.getElementById('ap-emoji-preview');
        var apEmojiClear = document.getElementById('ap-emoji-clear');
        if (apEmojiHidden) apEmojiHidden.value = '';
        if (apEmojiPreview) apEmojiPreview.textContent = '\u2014';
        if (apEmojiClear) apEmojiClear.style.display = 'none';
        document.getElementById('ap-tipo').value = 'marcador';
        document.getElementById('ap-sinopsis').value = '';
        document.getElementById('ap-historia').value = '';
        document.getElementById('ap-imagen').value = '';
        document.getElementById('ap-lat').value = '';
        document.getElementById('ap-lng').value = '';
        document.getElementById('ap-error').textContent = '';
        document.getElementById('ap-success').textContent = '';
        showModal('modal-add-point');
    };

    u.closeModals = function () {
        document.getElementById('modal-overlay').style.display = 'none';
        document.querySelectorAll('#modal-login, #modal-register, #modal-create-fair, #modal-add-point, #modal-delete-confirm, #modal-admin, #modal-settings, #modal-edit-points').forEach(function (e) { e.style.display = 'none'; });
        ['settings-cur-password', 'settings-new-password', 'settings-confirm-password', 'dc-password'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
    };

    u.showDeleteConfirm = function (fair) {
        if (!App.auth.isLoggedIn()) { u.showToast('Debes iniciar sesi\u00f3n'); return; }
        document.getElementById('dc-fair-name').textContent = '\u00bfEliminar "' + fair.nombre_feria + '"?';
        document.getElementById('dc-password').value = '';
        document.getElementById('dc-error').textContent = '';
        showModal('modal-delete-confirm');
        document.getElementById('dc-password').focus();
    };

    u.cancelDelete = function () {
        u.closeModals();
    };

    u.handleDeleteFair = function () {
        var errEl = document.getElementById('dc-error');
        errEl.textContent = '';
        var password = document.getElementById('dc-password').value;
        if (!password) { errEl.textContent = 'Introduce tu contraseña'; return; }

        var fairId = App.state._deletingFairId;
        if (!fairId) { errEl.textContent = 'Error: no hay mapa seleccionado para eliminar'; return; }

        App.api.deleteFair({
            id_feria: fairId,
            password: password
        }).then(function (res) {
            if (res.success) {
                u.closeModals();
                App.state._deletingFairId = null;
                if (App.state.currentFairId == fairId) {
                    App.state.currentFairId = null;
                    App.state.editMode = false;
                    if (App.map.setMoveMode) App.map.setMoveMode(false);
                    document.getElementById('editor-toolbar').classList.remove('show');
                    App.map.clearAll();
                    App.map.clearZone();
                }
                u.loadFairs();
                u.showToast('Mapa eliminado');
            } else {
                errEl.textContent = res.message;
            }
        }).catch(function () {
            errEl.textContent = 'Error de conexión';
        });
    };

    /* ---- Subcategory helpers ---- */
    u.rebuildSubcategories = function (baseCat, subSelEl, currentVal) {
        if (!subSelEl) return;
        subSelEl.innerHTML = '';
        var subs = App.consts.SUBCATEGORIES[baseCat] || [];
        if (!subs.length) return;
        subs.forEach(function (s) {
            var opt = document.createElement('option');
            opt.value = s.v;
            opt.textContent = s.t;
            if (s.v === currentVal) opt.selected = true;
            subSelEl.appendChild(opt);
        });
    };

    function syncEmojiPreview(previewEl, clearBtn, customEmoji, fallbackEmoji) {
        if (customEmoji) {
            previewEl.textContent = customEmoji;
            previewEl.title = 'Emoji personalizado';
            if (clearBtn) clearBtn.style.display = '';
        } else {
            previewEl.textContent = fallbackEmoji || '\u2014';
            previewEl.title = fallbackEmoji ? 'Emoji de la subcategor\u00eda' : 'Sin emoji';
            if (clearBtn) clearBtn.style.display = 'none';
        }
    }

    function getSubEmoji(subSelEl) {
        if (!subSelEl || !subSelEl.value) return '';
        var all = App.consts.EMOJIS;
        return all[subSelEl.value] || '';
    }

    /* ---- Point creation bottom panel ---- */
    u.showPointForm = function (tipo, coords) {
        var panel = document.getElementById('point-form-panel');
        var pending = App.state._pendingPointData || {};
        document.getElementById('pf-titulo').textContent = tipo === 'recuadro' ?
            'Nuevo Recuadro (Zona)' : 'Nuevo Marcador';
        document.getElementById('pf-nombre').value = pending.nombre || '';

        var rawSin = pending.sinopsis || '';
        var pendingEmoji = u.extractEmoji(rawSin);
        var pendingSin = u.stripEmojiPrefix(rawSin);
        document.getElementById('pf-sinopsis').value = pendingSin;

        document.getElementById('pf-imagen').value = pending.imagen || '';
        document.getElementById('pf-file').value = '';
        var preview = document.getElementById('pf-preview');
        if (pending.imagen) { preview.src = pending.imagen; preview.style.display = ''; }
        else { preview.style.display = 'none'; preview.src = ''; }
        document.getElementById('pf-tipo').value = tipo;
        App.state._pendingPointData = null;
        document.getElementById('pf-coords').value = JSON.stringify(
            Array.isArray(coords) ? coords.map(function (c) { return { lat: c.lat, lng: c.lng }; }) : { lat: coords.lat, lng: coords.lng }
        );
        document.getElementById('pf-error').textContent = '';
        document.getElementById('pf-success').textContent = '';

        var catSelect = document.getElementById('pf-categoria');
        catSelect.innerHTML = '';
        var catList = tipo === 'recuadro'
            ? [{ v: '', t: 'Tipo de zona' }, { v: 'estacionamiento', t: '\ud83d\ude97 Estacionamiento' }, { v: 'caseta', t: '\ud83c\udfe0 Caseta' }, { v: 'cacharrito', t: '\ud83c\udfa1 Cacharrito' }, { v: 'puesto', t: '\ud83c\udfaa Puesto' }, { v: 'ba\u00f1o', t: '\ud83d\udebb Ba\u00f1o' }, { v: 'otro', t: '\ud83d\udccd Otro' }]
            : [{ v: '', t: 'Selecciona categor\u00eda' }, { v: 'caseta', t: '\ud83c\udfe0 Caseta' }, { v: 'cacharrito', t: '\ud83c\udfa1 Cacharrito' }, { v: 'puesto', t: '\ud83c\udfaa Puesto' }, { v: 'ba\u00f1o', t: '\ud83d\udebb Ba\u00f1o' }, { v: 'estacionamiento', t: '\ud83d\ude97 Estacionamiento' }, { v: 'otro', t: '\ud83d\udccd Otro' }];
        catList.forEach(function (o) {
            var opt = document.createElement('option');
            opt.value = o.v; opt.textContent = o.t;
            catSelect.appendChild(opt);
        });

        var subWrap = document.getElementById('pf-subcategoria-wrap');
        var subSel = document.getElementById('pf-subcategoria');
        var emojiHidden = document.getElementById('pf-emoji');
        var emojiPreview = document.getElementById('pf-emoji-preview');
        var emojiClear = document.getElementById('pf-emoji-clear');

        if (emojiHidden) emojiHidden.value = pendingEmoji;
        if (subWrap) subWrap.style.display = 'none';

        var pendingCat = pending.categoria || '';
        var baseCat = (function () {
            if (!pendingCat) return '';
            var idx = pendingCat.indexOf('_');
            if (idx === -1) return pendingCat;
            var pre = pendingCat.substring(0, idx);
            return App.consts.COLORS[pre] !== undefined ? pre : pendingCat;
        })();

        if (pendingCat && baseCat && App.consts.SUBCATEGORIES[baseCat]) {
            catSelect.value = baseCat;
            u.rebuildSubcategories(baseCat, subSel, pendingCat);
            if (subWrap) subWrap.style.display = '';
        } else if (pendingCat) {
            catSelect.value = pendingCat;
        }

        syncEmojiPreview(emojiPreview, emojiClear, pendingEmoji, getSubEmoji(subSel));
        panel.classList.add('show');
    };

    u.hidePointForm = function () {
        document.getElementById('point-form-panel').classList.remove('show');
    };

    function addCreatedPoint(punto) {
        if (!punto || !punto.id_punto) return false;
        App.state.points = (App.state.points || []).filter(function (p) {
            return p.id_feria == App.state.currentFairId && p.id_punto != punto.id_punto;
        });
        App.state.points.push(punto);
        App.map.renderPoints();
        return true;
    }

    u.submitPointForm = function () {
        var tipo = document.getElementById('pf-tipo').value;
        var coordsRaw = document.getElementById('pf-coords').value;
        var coordenadas;
        try { coordenadas = JSON.parse(coordsRaw); } catch (e) { u.showToast('Error en coordenadas'); return; }

        var categoria = document.getElementById('pf-categoria').value;
        var subWrap = document.getElementById('pf-subcategoria-wrap');
        var subSel = document.getElementById('pf-subcategoria');
        if (subSel && subWrap && subWrap.style.display !== 'none' && subSel.value) {
            categoria = subSel.value;
        }

        var customEmoji = document.getElementById('pf-emoji') ? document.getElementById('pf-emoji').value.trim() : '';
        var sinopsisRaw = document.getElementById('pf-sinopsis').value || '';
        var sinopsis = customEmoji ? 'EMOJI:' + customEmoji + '\n' + sinopsisRaw : sinopsisRaw;

        var data = {
            id_feria: App.state.currentFairId,
            nombre: document.getElementById('pf-nombre').value,
            categoria: categoria,
            tipo_geometria: tipo,
            coordenadas: tipo === 'recuadro' ?
                JSON.stringify(coordenadas.map(function (c) { return { lat: c.lat, lng: c.lng }; })) :
                JSON.stringify({ lat: coordenadas.lat, lng: coordenadas.lng }),
            sinopsis: sinopsis,
            imagen_url: document.getElementById('pf-imagen').value || ''
        };

        if (!data.nombre || !data.categoria) {
            u.showToast('Nombre y categor\u00eda son obligatorios');
            return;
        }

        App.api.createPoint(data).then(function (res) {
            if (res.success) {
                document.getElementById('pf-success').textContent = 'Punto a\u00f1adido';
                u.hidePointForm();
                if (App.state.placingMarker) {
                    App.state.map.removeLayer(App.state.placingMarker);
                    App.state.placingMarker = null;
                }
                if (!addCreatedPoint(res.punto)) {
                    App.map.clearAll();
                    u.loadPoints(App.state.currentFairId);
                }
                u.loadFairs();
                u.showToast('Punto creado con \u00e9xito');
            } else {
                document.getElementById('pf-error').textContent = res.message;
            }
        }).catch(function () {
            document.getElementById('pf-error').textContent = 'Error de conexi\u00f3n';
        });
    };

    /* ---- Fairs (load + render) ---- */
    u.loadFairs = function () {
        return App.api.getFairs().then(function (data) {
            App.state.fairs = data;
            u.renderFairs();
        }).catch(function () { u.showToast('Error al cargar mapas de ferias'); });
    };

    u.renderFairs = function () {
        var scroll = document.getElementById('fair-scroll');
        var tab = document.querySelector('#fair-panel-tabs .active');
        var mode = tab ? tab.dataset.tab : 'explorar';
        var fairs = App.state.fairs;
        var isAdmin = App.auth.isStaff();
        var pendingFilterBtn = document.getElementById('btn-filter-pending');
        var searchWrap = document.getElementById('fair-search-wrap');
        var searchInput = document.getElementById('fair-search');
        var searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var pendingCount = App.state.fairs.filter(function (f) { return f.verificacion === 'pendiente'; }).length;

        if (searchWrap) searchWrap.style.display = mode === 'explorar' ? '' : 'none';

        if (pendingFilterBtn) {
            var showPendingFilter = mode === 'explorar' && isAdmin;
            pendingFilterBtn.style.display = showPendingFilter ? '' : 'none';
            pendingFilterBtn.classList.toggle('active', !!App.state.adminOnlyPending && showPendingFilter);
            pendingFilterBtn.textContent = (App.state.adminOnlyPending && showPendingFilter ? '↩ Todas' : '⏳ Por aprobar') + (pendingCount ? ' (' + pendingCount + ')' : '');
        }

        if (mode === 'explorar') {
            if (isAdmin) {
                fairs = fairs.filter(function (f) {
                    return f.verificacion !== 'borrador' || f.id_usuario == App.auth.getUserId();
                });
                if (App.state.adminOnlyPending) {
                    fairs = fairs.filter(function (f) { return f.verificacion === 'pendiente'; });
                }
            } else {
                fairs = fairs.filter(function (f) { return f.verificacion === 'aprobado' && f.estado === 'publico'; });
            }
            if (searchQuery) {
                fairs = fairs.filter(function (f) {
                    return (f.nombre_feria || '').toLowerCase().indexOf(searchQuery) !== -1 ||
                        (f.localidad || '').toLowerCase().indexOf(searchQuery) !== -1 ||
                        (f.creador || '').toLowerCase().indexOf(searchQuery) !== -1;
                });
            }
            if (fairs.length === 0) {
                scroll.innerHTML = searchQuery ?
                    '<div class="empty-state"><span class="icon">🔎</span>No hay ferias que coincidan con la búsqueda</div>' :
                    App.state.adminOnlyPending && isAdmin ?
                    '<div class="empty-state"><span class="icon">\u2705</span>No hay ferias por aprobar</div>' :
                    '<div class="empty-state"><span class="icon">\uD83D\uDDFA\uFE0F</span>No hay ferias p\u00fablicas disponibles</div>';
                return;
            }
        }

        if (mode === 'mis-mapas') {
            fairs = fairs.filter(function (f) { return f.id_usuario == App.auth.getUserId(); });
            if (fairs.length === 0) {
                scroll.innerHTML = '<div class="empty-state"><span class="icon">\uD83D\uDCDD</span>A\u00fan no has creado ning\u00fan mapa<br><button class="btn-primary" style="width:auto;display:inline-block;margin-top:12px;padding:10px 24px" onclick="App.ui.showCreateFair()">+ Crear primer mapa</button></div>';
                return;
            }
        }

        if (!App.state._expandedFairs) App.state._expandedFairs = {};

        scroll.innerHTML = '';
        fairs.forEach(function (f) {
            var isOwn = App.auth.isLoggedIn() && f.id_usuario == App.auth.getUserId();
            var isStaff2 = App.auth.hasRole(['root', 'moderador']);
            var isMisMapas = mode === 'mis-mapas';
            var esBorrador = f.verificacion === 'borrador';
            var esPendiente = f.verificacion === 'pendiente';
            var esRechazado = f.verificacion === 'rechazado';
            var wrapper = document.createElement('div');
            wrapper.className = 'fair-item-wrapper';
            wrapper.dataset.id = f.id_feria;

            var item = document.createElement('div');
            item.className = 'fair-item' + (f.id_feria == App.state.currentFairId ? ' selected' : '') + (isOwn ? ' own-fair' : '');

            var badge = '';
            if ((isMisMapas || isAdmin) && (isOwn || isStaff2)) {
                var pub = f.estado === 'publico';
                badge = '<span class="state-badge ' + f.estado + '">' + (pub ? '\uD83C\uDF10 P\u00fablico' : '\uD83D\uDD12 Privado') + '</span>';
            }

            var verifLabel = '';
            var verifClass = '';
            if (f.verificacion === 'borrador') { verifLabel = '\uD83D\uDCDD Borrador'; verifClass = 'verif-pendiente'; }
            else if (f.verificacion === 'pendiente') { verifLabel = '\u23F3 Pendiente'; verifClass = 'verif-pendiente'; }
            else if (f.verificacion === 'aprobado') { verifLabel = '\u2705 Aprobado'; verifClass = 'verif-aprobado'; }
            else if (f.verificacion === 'rechazado') { verifLabel = '\u274C Rechazado'; verifClass = 'verif-rechazado'; }

            if (verifLabel && (isMisMapas || isAdmin)) {
                badge += '<span class="state-badge ' + verifClass + '">' + verifLabel + '</span>';
            }

            var showActions = (isMisMapas && (isOwn || isStaff2)) || (!isMisMapas && isStaff2 && !esBorrador);
            var acciones = '';
            if (showActions) {
                var pub = f.estado === 'publico';
                acciones = '<div class="fair-actions">' +
                    (esBorrador || esRechazado ? '<button style="background:var(--success);color:white" data-action="publish" data-id="' + f.id_feria + '">' + (esRechazado ? '\uD83D\uDCE4 Re-enviar' : '\uD83D\uDCE4 Publicar') + '</button>' : '') +
                    '<button style="background:var(--primary);color:white" data-action="edit" data-id="' + f.id_feria + '">\u270F\uFE0F</button>' +
                    (isOwn ? '<button style="background:' + (pub ? '#28a745' : '#6c757d') + ';color:white" data-action="toggle" data-id="' + f.id_feria + '" data-val="' + (pub ? 'privado' : 'publico') + '">' + (pub ? '\uD83D\uDD12' : '\uD83C\uDF10') + '</button>' : '') +
                    (isOwn || App.auth.hasRole(['root', 'moderador']) ? '<button style="background:var(--danger);color:white" data-action="delete" data-id="' + f.id_feria + '">\uD83D\uDDD1\uFE0F</button>' : '') +
                    '</div>';
            }

            var verifyActions = '';
            var pendingChangesHtml = '';
            if (!isMisMapas && isAdmin && f.pending_changes) {
                try {
                    var cambios = JSON.parse(f.pending_changes);
                    var labels = { nombre_feria: 'Nombre', localidad: 'Localidad', zona: 'Zona', estado: 'Estado', centro_lat: 'Latitud', centro_lng: 'Longitud', zoom: 'Zoom', color_perimetro: 'Color' };
                    var changeItems = [];
                    Object.keys(cambios).forEach(function (key) {
                        var val = cambios[key];
                        if (key === 'estado') val = val === 'publico' ? 'P\u00fablico' : (val === 'privado' ? 'Privado' : val);
                        changeItems.push('<span style="display:inline-block;background:var(--bg-light);padding:2px 6px;border-radius:3px;font-size:11px;margin:2px 4px 2px 0"><strong>' + u.escapeHtml(labels[key] || key) + ':</strong> ' + u.escapeHtml(val) + '</span>');
                    });
                    if (changeItems.length) {
                        pendingChangesHtml = '<div style="margin-top:4px;font-size:11px;color:var(--text-light)">\uD83D\uDD04 Cambios propuestos: ' + changeItems.join('') + '</div>';
                    }
                } catch (_) {}
            }
            if (!isMisMapas && isAdmin && (esPendiente || esRechazado)) {
                verifyActions = '<div class="fair-actions" style="margin-top:4px">' +
                    '<button style="background:var(--success);color:white;font-size:12px;padding:4px 10px" data-action="verify-aprobar" data-id="' + f.id_feria + '">\u2705 Aprobar</button>' +
                    '<button style="background:var(--danger);color:white;font-size:12px;padding:4px 10px" data-action="verify-rechazar" data-id="' + f.id_feria + '">\u274C Rechazar</button>' +
                    (esRechazado && f.motivo_rechazo ? '<span style="font-size:11px;color:var(--danger);margin-left:4px">Motivo: ' + u.escapeHtml(f.motivo_rechazo) + '</span>' : '') +
                    '</div>';
            }

            var expanded = App.state._expandedFairs[f.id_feria];
            var expandIcon = expanded ? '\u25BC' : '\u25B6';

            item.innerHTML =
                '<div class="fair-info"><h4>' + u.escapeHtml(f.nombre_feria) + ' ' + badge + '</h4><small>' + u.escapeHtml(f.localidad) + ' \u00B7 ' + u.escapeHtml(f.creador) + '</small>' + acciones + pendingChangesHtml + verifyActions + '</div>' +
                '<div class="fair-meta"><span class="fair-expand-btn" data-id="' + f.id_feria + '">' + expandIcon + '</span> ' + (f.num_puntos || 0) + ' pts</div>';

            item.dataset.id = f.id_feria;
            wrapper.appendChild(item);

            var body = document.createElement('div');
            body.className = 'fair-item-body';
            body.style.display = expanded ? '' : 'none';
            if (expanded) {
                body.innerHTML = '<div class="skeleton" style="height:40px;margin:4px 0"></div>';
                u.loadFairPointsInline(f.id_feria, body, showActions);
            }
            wrapper.appendChild(body);

            scroll.appendChild(wrapper);
        });
    };

    u.selectFair = function (id) {
        App.state.currentFairId = id;
        u.renderFairs();
        var fair = App.state.fairs.find(function (f) { return f.id_feria == id; });
        App.map.clearZone();
        if (fair && fair.zona) {
            App.state._currentFairName = fair.nombre_feria;
            App.map.renderZone(fair.zona, fair.color_perimetro);
        } else if (fair && fair.centro_lat && fair.centro_lng) {
            App.map.flyTo(fair.centro_lat, fair.centro_lng, fair.zoom);
        }
        u.loadPoints(id);

        var tab = document.querySelector('#fair-panel-tabs .active');
        var isMisMapas = tab ? tab.dataset.tab === 'mis-mapas' : false;
        var canEdit = App.auth.isLoggedIn() && fair && ((isMisMapas && (fair.id_usuario == App.auth.getUserId() || App.auth.hasRole(['root', 'moderador']))) || (!isMisMapas && App.auth.hasRole(['root', 'moderador']) && fair.verificacion !== 'borrador'));
        var toolbar = document.getElementById('editor-toolbar');
        toolbar.classList.toggle('show', canEdit);
        App.state.editMode = canEdit;
        if (!canEdit && App.map.setMoveMode) App.map.setMoveMode(false);
    };

    u.loadPoints = function (idFeria) {
        App.api.getPoints(idFeria).then(function (data) {
            App.state.points = data;
            App.map.renderPoints();
        }).catch(function () { u.showToast('Error al cargar puntos'); });
    };



    /* ---- Inline fair points expand ---- */
    u.toggleFairPointsInline = function (id) {
        if (!App.state._expandedFairs) App.state._expandedFairs = {};
        App.state._expandedFairs[id] = !App.state._expandedFairs[id];
        u.renderFairs();
    };

    u.loadFairPointsInline = function (id, bodyEl, canDelete) {
        App.api.getPoints(id).then(function (data) {
            if (!bodyEl || bodyEl.style.display === 'none') return;
            if (!data || data.length === 0) {
                bodyEl.innerHTML = '<div class="fair-points-empty">Sin puntos de inter\u00e9s</div>';
                return;
            }
            var html = '';
            data.forEach(function (p) {
                var cat = p.categoria || '';
                var color = App.consts.COLORS[normalizeCat(cat)] || '#007bff';
                var catEmoji = App.consts.EMOJIS[cat] || App.consts.EMOJIS[normalizeCat(cat)] || App.consts.EMOJIS['otro'];
                var customEmoji = u.extractEmoji(p.sinopsis || '');
                var displayEmoji = customEmoji || catEmoji;
                var icon = p.tipo_geometria === 'recuadro' ? '\u2B1C' : displayEmoji;
                var catLabel = getCatLabel(cat);
                var prom = p.promedio ? ' \u2605' + p.promedio : '';
                var delBtn = canDelete ? ' <span class="inline-point-delete" data-pid="' + p.id_punto + '" title="Eliminar">\uD83D\uDDD1\uFE0F</span>' : '';
                var editBtn = canDelete ? ' <span class="inline-point-edit" data-pid="' + p.id_punto + '" title="Editar">\u270F\uFE0F</span>' : '';
                html += '<div class="fair-points-item" data-point-id="' + p.id_punto + '">' +
                    '<span class="fair-points-dot" style="background:' + color + '"></span>' +
                    '<span class="fair-points-name">' + icon + ' ' + u.escapeHtml(p.nombre) + '</span>' +
                    '<span class="fair-points-cat" style="color:' + color + '">' + u.escapeHtml(catLabel) + prom + '</span>' +
                    delBtn + editBtn +
                    '</div>';
            });
            bodyEl.innerHTML = html;
            if (canDelete) {
                bodyEl.querySelectorAll('.inline-point-delete').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var pid = parseInt(this.dataset.pid);
                        if (confirm('\u00bfEliminar este punto?')) u.deletePoint(pid, id);
                    });
                });
                bodyEl.querySelectorAll('.inline-point-edit').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var pid = parseInt(this.dataset.pid);
                        u.showEditPoints(id, pid);
                    });
                });
            }
            bodyEl.querySelectorAll('.fair-points-item').forEach(function (el) {
                el.addEventListener('click', function () {
                    var pid = parseInt(this.dataset.pointId);
                    var punto = data.find(function (p) { return p.id_punto == pid; });
                    if (punto) {
                        App.state.currentFairId = id;
                        u.selectFair(id);
                        setTimeout(function () {
                            if (punto.tipo_geometria === 'recuadro') {
                                try {
                                    var coords = JSON.parse(punto.coordenadas);
                                    if (Array.isArray(coords) && coords.length > 0) {
                                        var poly = L.polygon(coords.map(function (c) { return [c.lat, c.lng]; }));
                                        App.state.map.fitBounds(poly.getBounds().pad(0.3));
                                    }
                                } catch (_) {}
                            } else if (punto.latitud && punto.longitud) {
                                App.state.map.setView([parseFloat(punto.latitud), parseFloat(punto.longitud)], 18);
                            }
                        }, 100);
                    }
                });
            });
        }).catch(function () {
            if (bodyEl) bodyEl.innerHTML = '<div class="fair-points-empty" style="color:var(--danger)">Error al cargar puntos</div>';
        });
    };

    /* ---- Edit points ---- */
    u.showEditPoints = function (fairId, puntoId) {
        var fair = App.state.fairs.find(function (f) { return f.id_feria == fairId; });
        if (!fair) { u.showToast('Feria no encontrada'); return; }
        var canEdit = App.auth.isLoggedIn() && (fair.id_usuario == App.auth.getUserId() || App.auth.hasRole(['root', 'moderador']));
        if (!canEdit) { u.showToast('No tienes permiso'); return; }
        App.state._editingFairId = fairId;
        document.getElementById('ep-title').textContent = puntoId ?
            '\u270F\uFE0F Editar Punto' :
            '\u270F\uFE0F Editar Puntos - ' + fair.nombre_feria;
        document.getElementById('ep-list').innerHTML = '<div class="skeleton" style="height:50px;margin:6px 0"></div>'.repeat(3);
        document.getElementById('ep-error').textContent = '';
        document.getElementById('ep-success').textContent = '';
        showModal('modal-edit-points');
        if (puntoId) {
            App.api.getPoints(fairId).then(function (data) {
                var punto = data.find(function (p) { return p.id_punto == puntoId; });
                u.renderEditPoints(punto ? [punto] : []);
            }).catch(function () {
                document.getElementById('ep-list').innerHTML = '<p style="color:var(--danger)">Error al cargar</p>';
            });
        } else {
            u.loadPointsForEdit(fairId);
        }
    };

    u.loadPointsForEdit = function (fairId) {
        App.api.getPoints(fairId).then(function (data) {
            u.renderEditPoints(data);
        }).catch(function () {
            document.getElementById('ep-list').innerHTML = '<p style="color:var(--danger)">Error al cargar puntos</p>';
        });
    };

    u.renderEditPoints = function (points) {
        var container = document.getElementById('ep-list');
        container.innerHTML = '';
        if (!points || points.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="icon">\uD83D\uDCCD</span>No hay puntos en este mapa</div>';
            return;
        }
        var catOpts = (function () {
            var html = '';
            Object.keys(App.consts.SUBCATEGORIES).forEach(function (base) {
                var subs = App.consts.SUBCATEGORIES[base];
                var label = (App.consts.EMOJIS[base] || '') + ' ' + (App.consts.LABELS[base] || base);
                html += '<optgroup label="' + label + '">';
                subs.forEach(function (sub) {
                    html += '<option value="' + sub.v + '">' + sub.t + '</option>';
                });
                html += '</optgroup>';
            });
            return html;
        })();
        points.forEach(function (p) {
            var epSinopsis = u.stripEmojiPrefix(p.sinopsis || '');
            var epEmoji = u.extractEmoji(p.sinopsis || '');
            var item = document.createElement('div');
            item.className = 'edit-point-item';
            item.innerHTML =
                '<div class="edit-point-form">' +
                '<label>Nombre</label><input type="text" class="ep-nombre" value="' + u.escapeHtml(p.nombre) + '">' +
                '<label>Categor\u00eda</label><select class="ep-categoria">' + catOpts + '</select>' +
                '<label>Emoji del icono (opcional)</label>' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
                '<span class="ep-emoji-preview" style="font-size:26px;min-width:36px;text-align:center">' + (epEmoji || '\u2014') + '</span>' +
                '<button type="button" class="ep-emoji-btn btn-secondary" style="flex:1;padding:6px 10px;font-size:13px">\uD83C\uDFA8 Personalizar emoji</button>' +
                '<button type="button" class="ep-emoji-clear" style="' + (epEmoji ? '' : 'display:none;') + 'background:none;border:none;cursor:pointer;font-size:16px;color:#888" title="Quitar emoji">\u2715</button>' +
                '<input type="hidden" class="ep-emoji" value="' + u.escapeHtml(epEmoji) + '">' +
                '</div>' +
                '<label>Sinopsis</label><textarea class="ep-sinopsis" rows="2">' + u.escapeHtml(epSinopsis) + '</textarea>' +
                '<label>Imagen URL</label><input type="text" class="ep-imagen" value="' + u.escapeHtml(p.imagen_url || '') + '" placeholder="URL de imagen">' +
                '<label>Subir imagen</label><input type="file" class="ep-file" accept="image/*">' +
                (p.imagen_url ? '<img src="' + u.escapeHtml(p.imagen_url) + '" class="ep-preview">' : '') +
                '<div class="edit-point-actions">' +
                (p.imagen_url ? '<button class="btn-secondary ep-remove-image" style="padding:8px 16px;font-size:12px;width:auto">\uD83D\uDDD1\uFE0F Quitar imagen</button>' : '') +
                '<button class="btn-primary ep-save" data-pid="' + p.id_punto + '" style="padding:8px 16px;font-size:12px;width:auto">Guardar</button>' +
                '</div>' +
                '</div>';
            container.appendChild(item);
            item.querySelector('.ep-categoria').value = p.categoria;

            var prevImgEl = item.querySelector('.ep-preview');
            if (prevImgEl) {
                prevImgEl.addEventListener('error', function () { this.style.display = 'none'; });
            }

            item.querySelector('.ep-file').addEventListener('change', function () {
                var file = this.files[0];
                if (!file) return;
                App.api.uploadImage(file).then(function (res) {
                    if (res.success) {
                        item.querySelector('.ep-imagen').value = res.url;
                        var prev = item.querySelector('.ep-preview');
                        if (prev) prev.src = res.url;
                        else {
                            var img = document.createElement('img');
                            img.className = 'ep-preview';
                            img.src = res.url;
                            img.onerror = function () { this.style.display = 'none'; };
                            item.querySelector('.edit-point-form').appendChild(img);
                        }
                        u.showToast('Imagen subida');
                    } else {
                        u.showToast(res.message || 'Error al subir');
                    }
                }).catch(function () { u.showToast('Error de conexi\u00f3n'); });
            });

            var removeBtn = item.querySelector('.ep-remove-image');
            if (removeBtn) {
                removeBtn.addEventListener('click', function () {
                    item.querySelector('.ep-imagen').value = '';
                    var prev = item.querySelector('.ep-preview');
                    if (prev) prev.remove();
                    this.remove();
                    u.showToast('Imagen quitada. Guarda los cambios para confirmar.');
                });
            }

            var epEmojiBtn = item.querySelector('.ep-emoji-btn');
            var epEmojiHidden = item.querySelector('.ep-emoji');
            var epEmojiPreviewEl = item.querySelector('.ep-emoji-preview');
            var epEmojiClear = item.querySelector('.ep-emoji-clear');
            epEmojiBtn.addEventListener('click', function () {
                App.ui.emojiPicker.show(epEmojiBtn, epEmojiHidden.value, function (emoji) {
                    epEmojiHidden.value = emoji;
                    epEmojiPreviewEl.textContent = emoji;
                    epEmojiClear.style.display = '';
                });
            });
            epEmojiClear.addEventListener('click', function () {
                epEmojiHidden.value = '';
                epEmojiPreviewEl.textContent = '\u2014';
                this.style.display = 'none';
            });

            item.querySelector('.ep-save').addEventListener('click', function () {
                var emojiVal = epEmojiHidden.value.trim();
                var sinRaw = item.querySelector('.ep-sinopsis').value;
                var sinFinal = emojiVal ? 'EMOJI:' + emojiVal + '\n' + sinRaw : sinRaw;
                var data = {
                    id_punto: parseInt(this.dataset.pid),
                    nombre: item.querySelector('.ep-nombre').value,
                    categoria: item.querySelector('.ep-categoria').value,
                    sinopsis: sinFinal,
                    imagen_url: item.querySelector('.ep-imagen').value
                };
                if (!data.nombre || !data.categoria) { u.showToast('Nombre y categor\u00eda obligatorios'); return; }
                App.api.updatePoint(data).then(function (res) {
                    if (res.success) {
                        u.showToast('Punto actualizado');
                        App.map.clearAll();
                        u.loadPoints(App.state._editingFairId);
                        u.loadFairs();
                        if (document.querySelectorAll('#ep-list .edit-point-item').length <= 1) {
                            u.closeModals();
                        }
                    } else {
                        u.showToast(res.message);
                    }
                }).catch(function () { u.showToast('Error de conexi\u00f3n'); });
            });
        });
    };

    u.closeEditPoints = function () {
        u.closeModals();
    };

    /* ---- Settings ---- */
    u.showSettings = function () {
        if (!App.auth.isLoggedIn()) { u.showToast('Debes iniciar sesi\u00f3n'); return; }
        var user = App.state.user;
        var roleLabels = { root: 'Root', moderador: 'Moderador', verificador: 'Verificador', usuario: 'Usuario' };
        var roleColors = { root: '#e74c3c', moderador: '#007bff', verificador: '#28a745', usuario: '#6c757d' };
        document.getElementById('settings-user-info').innerHTML =
            '<strong>' + u.escapeHtml(user.nombre) + '</strong><br>' +
            '<span style="display:inline-block;margin-top:4px;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:700;color:white;background:' + (roleColors[user.rol] || '#6c757d') + '">' + (roleLabels[user.rol] || user.rol) + '</span>';
        document.getElementById('settings-email').value = user.email || '';
        document.getElementById('settings-cur-password').value = '';
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
        document.getElementById('settings-error').textContent = '';
        document.getElementById('settings-success').textContent = '';
        var serverEl = document.getElementById('settings-server-url');
        if (serverEl) serverEl.value = localStorage.getItem('ofm_server') || '';
        document.getElementById('settings-server-msg').textContent = '';
        showModal('modal-settings');
    };

    u.handleUpdateProfile = function (e) {
        e.preventDefault();
        var errEl = document.getElementById('settings-error');
        var okEl = document.getElementById('settings-success');
        errEl.textContent = '';
        okEl.textContent = '';

        var email = document.getElementById('settings-email').value;
        var curPass = document.getElementById('settings-cur-password').value;
        var newPass = document.getElementById('settings-new-password').value;
        var confirmPass = document.getElementById('settings-confirm-password').value;

        if (!email) { errEl.textContent = 'El email es obligatorio'; return; }
        if (!curPass) { errEl.textContent = 'Debes ingresar tu contrase\u00f1a actual'; return; }
        if (newPass && newPass !== confirmPass) { errEl.textContent = 'Las contrase\u00f1as nuevas no coinciden'; return; }
        if (newPass && newPass.length < 6) { errEl.textContent = 'La nueva contrase\u00f1a debe tener al menos 6 caracteres'; return; }

        App.api.updateProfile({
            email: email,
            current_password: curPass,
            new_password: newPass || null
        }).then(function (res) {
            if (res.success) {
                okEl.textContent = 'Perfil actualizado correctamente';
                if (res.usuario) {
                    App.state.user = res.usuario;
                    localStorage.setItem('openferiamap_session', JSON.stringify(res.usuario));
                    App.ui.updateHeader();
                }
                setTimeout(function () { u.closeModals(); }, 1200);
            } else {
                errEl.textContent = res.message;
            }
        }).catch(function () {
            errEl.textContent = 'Error de conexi\u00f3n';
        });
    };

    /* ---- Auth callbacks ---- */
    u.handleLogin = function (e) {
        e.preventDefault();
        var email = document.getElementById('login-email').value;
        var pass = document.getElementById('login-password').value;
        var errEl = document.getElementById('login-error');
        errEl.textContent = '';
        App.auth.login(email, pass, function () {
            u.closeModals();
            u.updateHeader();
            u.loadFairs();
            u.showToast('Bienvenido, ' + App.state.user.nombre);
        }, function (msg) { errEl.textContent = msg; });
    };

    u.handleRegister = function (e) {
        e.preventDefault();
        var nombre = document.getElementById('reg-nombre').value;
        var email = document.getElementById('reg-email').value;
        var pass = document.getElementById('reg-password').value;
        var errEl = document.getElementById('register-error');
        errEl.textContent = '';
        App.auth.register(nombre, email, pass, function () {
            u.showToast('Cuenta creada. Inicia sesi\u00f3n.');
            u.showLogin();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
        }, function (msg) { errEl.textContent = msg; });
    };

    u.handleCreateFair = function (e) {
        e.preventDefault();
        var errEl = document.getElementById('cf-error');
        var okEl = document.getElementById('cf-success');
        errEl.textContent = '';
        okEl.textContent = '';

        if (!document.getElementById('cf-zona').value) {
            errEl.textContent = 'Debes dibujar la zona de la feria';
            return;
        }

        var idFeria = document.getElementById('cf-id-feria').value;
        var data = {
            nombre_feria: document.getElementById('cf-nombre').value,
            localidad: document.getElementById('cf-localidad').value,
            centro_lat: parseFloat(document.getElementById('cf-lat').value) || null,
            centro_lng: parseFloat(document.getElementById('cf-lng').value) || null,
            zoom: App.state.map ? App.state.map.getZoom() : 15,
            zona: document.getElementById('cf-zona').value,
            color_perimetro: document.getElementById('cf-color').value
        };

        var request;
        if (idFeria) {
            data.id_feria = idFeria;
            request = App.api.updateFairFull(data);
        } else {
            request = App.api.createFair(data);
        }

        request.then(function (res) {
            if (res.success) {
                var staffRoles = ['root', 'moderador'];
                var isStaffUser = App.auth.hasRole(staffRoles);
                if (idFeria) {
                    okEl.textContent = 'Mapa actualizado con \u00e9xito';
                } else if (isStaffUser) {
                    okEl.textContent = 'Mapa creado con \u00e9xito';
                } else {
                    okEl.textContent = 'Mapa guardado como borrador';
                    u.showToast('Mapa guardado como borrador. Pulsa Publicar cuando est\u00e9 listo para revisi\u00f3n.');
                }
                setTimeout(function () {
                    var newFairId = !idFeria && res.id_feria ? parseInt(res.id_feria) : null;
                    u.closeModals();
                    if (newFairId) {
                        document.querySelectorAll('#fair-panel-tabs button').forEach(function (b) { b.classList.remove('active'); });
                        var myMapsTab = document.querySelector('#fair-panel-tabs button[data-tab="mis-mapas"]');
                        if (myMapsTab) myMapsTab.classList.add('active');
                        App.state.currentFairId = newFairId;
                    }
                    u.loadFairs().then(function () {
                        if (newFairId) u.selectFair(newFairId);
                    });
                }, 800);
            } else {
                errEl.textContent = res.message;
            }
        }).catch(function () { errEl.textContent = 'Error de conexi\u00f3n'; });
    };

    /* ---- Popup HTML ---- */
    u.buildPopupHtml = function (punto) {
        var imgHtml = punto.imagen_url ?
            '<img src="' + u.escapeHtml(punto.imagen_url) + '" onerror="this.style.display=\'none\'" style="max-width:100%;border-radius:6px">' : '';
        var badge = getCatBadge(punto.categoria);
        var catLabel = getCatLabel(punto.categoria);
        var tipoLabel = punto.tipo_geometria === 'recuadro' ? ' (Zona)' : '';
        var sinopsisTxt = u.stripEmojiPrefix(punto.sinopsis || '');
        var sinopsisHtml = u.escapeHtml(sinopsisTxt).replace(/\n/g, '<br>');

        var promedioHtml = '';
        if (punto.promedio && punto.num_resenas > 0) {
            var fullSt = Math.round(punto.promedio);
            var stHtml = '';
            for (var si = 0; si < 5; si++) stHtml += si < fullSt ? '\u2605' : '\u2606';
            promedioHtml = '<div class="popup-promedio">' + stHtml + ' <strong>' + punto.promedio + '</strong> (' + punto.num_resenas + ')</div>';
        }

        return '<div class="popup-content">' +
            '<h3>' + u.escapeHtml(punto.nombre) + tipoLabel + '</h3>' +
            '<span class="badge ' + badge + '">' + u.escapeHtml(catLabel) + '</span>' +
            promedioHtml +
            (sinopsisTxt ? '<p class="sinopsis">' + sinopsisHtml + '</p>' : '') +
            '<div class="accordion">' +
                '<div class="accordion-item">' +
                    '<div class="accordion-header" data-acc="historia-' + punto.id_punto + '">Historia</div>' +
                    '<div class="accordion-body" id="historia-' + punto.id_punto + '">' + (sinopsisHtml || 'Sin historia disponible') + '</div>' +
                '</div>' +
                '<div class="accordion-item">' +
                    '<div class="accordion-header" data-acc="img-' + punto.id_punto + '">Imagen</div>' +
                    '<div class="accordion-body" id="img-' + punto.id_punto + '">' + (imgHtml || '<p style="color:#999">Sin imagen disponible</p>') + '</div>' +
                '</div>' +
                '<div class="accordion-item">' +
                    '<div class="accordion-header" data-acc="resenas-' + punto.id_punto + '">Puntuaci\u00f3n y Comentarios</div>' +
                    '<div class="accordion-body" id="resenas-' + punto.id_punto + '">' +
                        '<div id="resenas-list-' + punto.id_punto + '"><p style="color:#999">Cargando...</p></div>' +
                        '<div class="resena-form">' +
                            '<h4>Deja tu rese\u00f1a</h4>' +
                            '<div class="star-selector" data-punto="' + punto.id_punto + '">' +
                                '<span data-v="1">\u2605</span><span data-v="2">\u2605</span><span data-v="3">\u2605</span><span data-v="4">\u2605</span><span data-v="5">\u2605</span>' +
                            '</div>' +
                            '<textarea id="resena-text-' + punto.id_punto + '" placeholder="Escribe tu comentario..." rows="2"></textarea>' +
                            '<button class="btn-primary" onclick="App.ui.submitResena(' + punto.id_punto + ')">Enviar Rese\u00f1a</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div></div>';
    };

    u.loadPopupResenas = function (puntoId, promedio, numResenas) {
        App.api.getResenas(puntoId).then(function (data) {
            var container = document.getElementById('resenas-list-' + puntoId);
            if (!container) return;

            var html = '';

            if (promedio && numResenas > 0) {
                var fullStars = Math.round(promedio);
                var starsHtml = '';
                for (var s = 0; s < 5; s++) starsHtml += s < fullStars ? '\u2605' : '\u2606';
                html += '<div class="resena-promedio">' + starsHtml + ' <strong>' + promedio + '</strong> (' + numResenas + ' rese\u00f1as)</div>';
            }

            if (!data || data.length === 0) {
                html += '<p style="color:#999;font-size:13px;padding:8px 0">Sin rese\u00f1as todav\u00eda</p>';
                container.innerHTML = html;
                return;
            }

            var currentUserId = App.auth.getUserId();
            var isStaff = App.auth.hasRole(['root', 'moderador']);

            data.forEach(function (r) {
                var stars = '';
                for (var i = 0; i < r.puntuacion; i++) stars += '\u2605';
                var autor = r.autor ? '<div class="autor">\uD83D\uDC64 ' + u.escapeHtml(r.autor) + '</div>' : '';
                var canDelete = r.id_usuario && (r.id_usuario == currentUserId || isStaff);
                var delBtn = canDelete ? ' <span class="resena-delete" data-rid="' + r.id_resena + '" data-pid="' + puntoId + '">\uD83D\uDDD1\uFE0F</span>' : '';
                html += '<div class="resena-item">' + autor +
                    '<div class="stars">' + stars + delBtn + '</div>' +
                    '<div class="comentario">' + u.escapeHtml(r.comentario) + '</div>' +
                    '<div class="fecha">' + u.escapeHtml(r.fecha_publicacion) + '</div></div>';
            });

            container.innerHTML = html;

            container.querySelectorAll('.resena-delete').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var rid = parseInt(this.dataset.rid);
                    var pid = parseInt(this.dataset.pid);
                    if (confirm('\u00bfEliminar esta rese\u00f1a?')) u.deleteResena(rid, pid);
                });
            });
        }).catch(function () {
            var c = document.getElementById('resenas-list-' + puntoId);
            if (c) c.innerHTML = '<p style="color:#999">Error al cargar rese\u00f1as</p>';
        });
    };

    u.deletePoint = function (id_punto, fairId) {
        App.api.deletePoint(id_punto).then(function (res) {
            if (res.success) {
                u.showToast('Punto eliminado');
                App.map.clearAll();
                u.loadPoints(fairId);
                u.loadFairs();
            } else {
                u.showToast(res.message);
            }
        }).catch(function () { u.showToast('Error de conexi\u00f3n'); });
    };

    u.deleteResena = function (id_resena, puntoId) {
        App.api.deleteResena(id_resena).then(function (res) {
            if (res.success) {
                u.showToast('Rese\u00f1a eliminada');
                u.loadPopupResenas(puntoId);
            } else {
                u.showToast(res.message);
            }
        }).catch(function () { u.showToast('Error de conexi\u00f3n'); });
    };

    u.handleAddPoint = function () {
        var errEl = document.getElementById('ap-error');
        var okEl = document.getElementById('ap-success');
        errEl.textContent = '';
        okEl.textContent = '';

        var tipo = document.getElementById('ap-tipo').value;
        var lat = parseFloat(document.getElementById('ap-lat').value);
        var lng = parseFloat(document.getElementById('ap-lng').value);
        if (isNaN(lat) || isNaN(lng)) { errEl.textContent = 'Selecciona una ubicaci\u00f3n en el mapa'; return; }

        var coordenadas;
        if (tipo === 'recuadro') {
            coordenadas = JSON.stringify([
                { lat: lat - 0.0005, lng: lng - 0.0005 },
                { lat: lat - 0.0005, lng: lng + 0.0005 },
                { lat: lat + 0.0005, lng: lng + 0.0005 },
                { lat: lat + 0.0005, lng: lng - 0.0005 }
            ]);
        } else {
            coordenadas = JSON.stringify({ lat: lat, lng: lng });
        }

        var sinopsis = document.getElementById('ap-sinopsis').value || '';
        var historia = document.getElementById('ap-historia').value || '';
        var sinopsisMerged = sinopsis && historia ? sinopsis + '\n\n' + historia : (sinopsis || historia);

        var apCategoria = document.getElementById('ap-categoria').value;
        var apSubWrap = document.getElementById('ap-subcategoria-wrap');
        var apSubSel = document.getElementById('ap-subcategoria');
        if (apSubSel && apSubWrap && apSubWrap.style.display !== 'none' && apSubSel.value) {
            apCategoria = apSubSel.value;
        }
        var apEmoji = document.getElementById('ap-emoji') ? document.getElementById('ap-emoji').value.trim() : '';
        if (apEmoji) sinopsisMerged = 'EMOJI:' + apEmoji + '\n' + sinopsisMerged;

        var data = {
            id_feria: App.state.currentFairId,
            nombre: document.getElementById('ap-nombre').value,
            categoria: apCategoria,
            tipo_geometria: tipo,
            coordenadas: coordenadas,
            sinopsis: sinopsisMerged,
            imagen_url: document.getElementById('ap-imagen').value || ''
        };

        App.api.createPoint(data).then(function (res) {
            if (res.success) {
                okEl.textContent = 'Punto a\u00f1adido correctamente';
                var rendered = addCreatedPoint(res.punto);
                setTimeout(function () {
                    App.ui.closeModals();
                    if (!rendered) {
                        App.map.clearAll();
                        App.ui.loadPoints(App.state.currentFairId);
                    }
                    App.ui.loadFairs();
                }, 800);
            } else {
                errEl.textContent = res.message;
            }
        }).catch(function () { errEl.textContent = 'Error de conexi\u00f3n'; });
    };

    u.submitResena = function (puntoId) {
        var starContainer = document.querySelector('.star-selector[data-punto="' + puntoId + '"]');
        var puntuacion = parseInt(starContainer ? starContainer.dataset.selected : 0) || 0;
        var comentario = document.getElementById('resena-text-' + puntoId).value;
        if (puntuacion === 0) { u.showToast('Selecciona una puntuaci\u00f3n'); return; }
        if (!comentario.trim()) { u.showToast('Escribe un comentario'); return; }

        App.api.saveResena(puntoId, comentario, puntuacion).then(function (res) {
            if (res.success) {
                u.showToast('Rese\u00f1a enviada');
                document.getElementById('resena-text-' + puntoId).value = '';
                if (starContainer) {
                    starContainer.querySelectorAll('span').forEach(function (s) { s.classList.remove('active'); });
                    starContainer.dataset.selected = '0';
                }
                u.loadPopupResenas(puntoId);
            } else {
                u.showToast(res.message || 'No se pudo guardar la rese\u00f1a');
            }
        }).catch(function () { u.showToast('Error al enviar rese\u00f1a'); });
    };

    /* ---- Admin Panel ---- */
    u.showAdminPanel = function () {
        if (!App.auth.hasRole(['root', 'moderador'])) { u.showToast('No tienes acceso al panel de administraci\u00f3n'); return; }
        showModal('modal-admin');
        u.loadAdminUsers();
    };

    u.loadAdminUsers = function () {
        if (!App.auth.hasRole(['root', 'moderador'])) return;
        var container = document.getElementById('admin-users-list');
        container.innerHTML =
            '<div class="admin-user-search-wrap">' +
            '<input type="text" id="admin-user-search" placeholder="\uD83D\uDD0D Buscar usuarios..." ' +
            'style="width:100%;padding:10px 12px;border:2px solid var(--border);border-radius:var(--radius-sm);font-size:13px;outline:none">' +
            '</div>' +
            '<div id="admin-user-results">' +
            '<div class="skeleton" style="height:40px;margin:4px 0"></div>'.repeat(3) +
            '</div>';
        App.state._adminAllUsers = null;

        var searchInput = document.getElementById('admin-user-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                u.renderAdminUsers();
            });
        }

        App.api.adminGetUsers().then(function (res) {
            if (res.success) {
                App.state._adminAllUsers = res.usuarios;
                u.renderAdminUsers();
            } else {
                document.getElementById('admin-user-results').innerHTML = '<p style="color:var(--danger)">' + res.message + '</p>';
            }
        }).catch(function () {
            document.getElementById('admin-user-results').innerHTML = '<p style="color:var(--danger)">Error al cargar usuarios</p>';
        });
    };

    u.renderAdminUsers = function () {
        var users = App.state._adminAllUsers;
        if (!users) return;
        var searchInput = document.getElementById('admin-user-search');
        var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        var resultsEl = document.getElementById('admin-user-results');
        if (!resultsEl) return;

        var itemsHtml = '';
        var currentRole = App.auth.getRole();
        var roleLabels = { root: 'Root', moderador: 'Moderador', verificador: 'Verificador', usuario: 'Usuario' };
        var roleColors = { root: '#e74c3c', moderador: '#007bff', verificador: '#28a745', usuario: '#6c757d' };

        users.forEach(function (u) {
            if (query && u.nombre.toLowerCase().indexOf(query) === -1 && u.email.toLowerCase().indexOf(query) === -1) return;

            var canChange = (currentRole === 'root') || (currentRole === 'moderador' && u.rol !== 'root' && u.rol !== 'moderador' && u.id_usuario != App.auth.getUserId());

            var roleHtml = '';
            if (canChange) {
                roleHtml = '<select class="admin-role-select" data-userid="' + u.id_usuario + '" data-current="' + u.rol + '">' +
                    '<option value="usuario"' + (u.rol === 'usuario' ? ' selected' : '') + '>Usuario</option>' +
                    '<option value="verificador"' + (u.rol === 'verificador' ? ' selected' : '') + '>Verificador</option>' +
                    '<option value="moderador"' + (u.rol === 'moderador' ? ' selected' : '') + '>Moderador</option>' +
                    '</select>';
            } else {
                roleHtml = '<span class="admin-role-badge" style="background:' + (roleColors[u.rol] || '#6c757d') + '">' + (roleLabels[u.rol] || u.rol) + '</span>';
            }

            var isMe = u.id_usuario == App.auth.getUserId() ? ' (t\u00fa)' : '';
            itemsHtml +=
                '<div class="admin-user-item">' +
                '<div class="admin-user-info">' +
                '<strong>' + App.ui.escapeHtml(u.nombre) + isMe + '</strong>' +
                '<small>' + App.ui.escapeHtml(u.email) + '</small>' +
                '</div>' +
                '<div class="admin-user-role">' + roleHtml + '</div>' +
                '</div>';
        });

        resultsEl.innerHTML = itemsHtml || '<p style="text-align:center;color:var(--text-light);padding:20px 0">Sin resultados</p>';

        resultsEl.querySelectorAll('.admin-role-select').forEach(function (select) {
            select.addEventListener('change', function () {
                u.changeUserRole(parseInt(this.dataset.userid), this.value, this);
            });
        });
    };

    u.changeUserRole = function (target_id, nuevo_rol, selectEl) {
        var original = selectEl.dataset.current;
        selectEl.disabled = true;
        App.api.adminChangeRole(target_id, nuevo_rol).then(function (res) {
            if (res.success) {
                u.showToast('Rol actualizado correctamente');
                selectEl.dataset.current = nuevo_rol;
            } else {
                u.showToast(res.message);
                selectEl.value = original;
            }
            selectEl.disabled = false;
        }).catch(function () {
            u.showToast('Error de conexi\u00f3n');
            selectEl.value = original;
            selectEl.disabled = false;
        });
    };

    u.verifyFair = function (id_feria, accion, motivo) {
        App.api.adminVerifyFair(id_feria, accion, motivo).then(function (res) {
            if (res.success) {
                u.showToast(res.message);
                u.loadFairs();
            } else {
                u.showToast(res.message);
            }
        }).catch(function () {
            u.showToast('Error de conexi\u00f3n');
        });
    };
})(App.ui);
