(function () {
    'use strict';

    function init() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            var StatusBar = Capacitor.Plugins.StatusBar;
            StatusBar.setOverlaysWebView({ overlay: false });
            StatusBar.setBackgroundColor({ color: '#2d5a27' });
            StatusBar.setStyle({ style: 'LIGHT' });
        }
        App.auth.init();
        App.map.init();
        App.ui.updateHeader();
        App.ui.loadFairs();
        bindEvents();
    }

    function bindEvents() {
        /* ---- Auth ---- */
        byId('btn-login').addEventListener('click', App.ui.showLogin);
        byId('btn-logout').addEventListener('click', App.auth.logout);
        byId('btn-admin').addEventListener('click', App.ui.showAdminPanel);

        /* ---- Forms ---- */
        byId('login-form').addEventListener('submit', App.ui.handleLogin);
        byId('register-form').addEventListener('submit', App.ui.handleRegister);
        byId('create-fair-form').addEventListener('submit', App.ui.handleCreateFair);

        /* ---- Tab switching ---- */
        document.querySelectorAll('#fair-panel-tabs button[data-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#fair-panel-tabs button[data-tab]').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                if (btn.dataset.tab !== 'explorar') App.state.adminOnlyPending = false;
                App.ui.renderFairs();
            });
        });

        /* ---- Fair panel collapse (desktop) ---- */
        byId('fair-panel-toggle').addEventListener('click', function () {
            byId('fair-panel').classList.toggle('collapsed');
        });

        byId('btn-filter-pending').addEventListener('click', function () {
            App.state.adminOnlyPending = !App.state.adminOnlyPending;
            App.ui.renderFairs();
        });

        byId('fair-search').addEventListener('input', function () {
            App.ui.renderFairs();
        });

        /* ---- Fair list clicks (delegated) ---- */
        byId('fair-scroll').addEventListener('click', function (e) {
            var expandBtn = e.target.closest('.fair-expand-btn');
            if (expandBtn) {
                var id = parseInt(expandBtn.dataset.id);
                App.ui.toggleFairPointsInline(id);
                return;
            }
            var btn = e.target.closest('button[data-action]');
            if (btn) {
                var action = btn.dataset.action;
                var id = parseInt(btn.dataset.id);
                if (action === 'edit') {
                    var fair = App.state.fairs.find(function (f) { return f.id_feria == id; });
                    if (fair) App.ui.showEditFair(fair);
                    return;
                }
                if (action === 'toggle') {
                    var val = btn.dataset.val;
                    App.api.updateFair(id, val).then(function (res) {
                        if (res.success) {
                            App.ui.showToast(val === 'publico' ? 'Mapa publicado' : 'Mapa en modo privado');
                            App.ui.loadFairs();
                        } else {
                            App.ui.showToast(res.message);
                        }
                    });
                    return;
                }
                if (action === 'addpoint') {
                    App.state.currentFairId = id;
                    App.ui.showAddPoint();
                    return;
                }
                if (action === 'delete') {
                    App.state._deletingFairId = id;
                    var fair = App.state.fairs.find(function (f) { return f.id_feria == id; });
                    if (fair) App.ui.showDeleteConfirm(fair);
                    return;
                }
                if (action === 'publish') {
                    App.api.publishFair(id).then(function (res) {
                        if (res.success) {
                            App.ui.showToast(res.message);
                            App.ui.loadFairs();
                        } else {
                            App.ui.showToast(res.message);
                        }
                    });
                    return;
                }
                if (action === 'verify-aprobar') {
                    App.ui.verifyFair(id, 'aprobar', null);
                    return;
                }
                if (action === 'verify-rechazar') {
                    var motivo = prompt('Motivo del rechazo (opcional):');
                    App.ui.verifyFair(id, 'rechazar', motivo || 'Sin motivo especificado');
                    return;
                }
            }
            var item = e.target.closest('.fair-item');
            if (item && item.dataset.id) {
                App.ui.selectFair(parseInt(item.dataset.id));
            }
        });

        /* ---- Zone drawing ---- */
        byId('btn-draw-zone').addEventListener('click', function () {
            document.getElementById('modal-overlay').style.display = 'none';
            App.map.startZoneDrawing();
        });

        /* ---- Old modal: dynamic point/recuadro button ---- */
        byId('ap-tipo').addEventListener('change', function () {
            var btn = byId('btn-point-place');
            if (this.value === 'recuadro') {
                btn.textContent = '\u2B1C Dibujar recuadro';
                btn.style.background = 'var(--warning)';
            } else {
                btn.textContent = '\uD83D\uDCCD Colocar en el mapa';
                btn.style.background = '';
            }
        });
        byId('btn-point-place').addEventListener('click', function () {
            var tipo = byId('ap-tipo').value;
            var sinopsis = byId('ap-sinopsis').value;
            var historia = byId('ap-historia').value;
            var sinopsisMerged = sinopsis && historia ? sinopsis + '\n\n' + historia : (sinopsis || historia);
            var apEmoji = byId('ap-emoji') ? byId('ap-emoji').value.trim() : '';
            if (apEmoji) sinopsisMerged = 'EMOJI:' + apEmoji + '\n' + sinopsisMerged;
            var apCat = byId('ap-categoria').value;
            var apSubWrap = byId('ap-subcategoria-wrap');
            var apSub = byId('ap-subcategoria');
            if (apSub && apSubWrap && apSubWrap.style.display !== 'none' && apSub.value) {
                apCat = apSub.value;
            }
            App.state._pendingPointData = {
                nombre: byId('ap-nombre').value,
                sinopsis: sinopsisMerged,
                categoria: apCat,
                imagen: byId('ap-imagen').value
            };
            App.ui.closeModals();
            if (tipo === 'recuadro') {
                App.map.startDrawingRecuadro();
            } else {
                App.state.placingPoint = true;
                App.ui.showToast('Haz clic en el mapa para colocar el punto');
            }
        });

        /* ---- Editor toolbar ---- */
        byId('btn-add-marker').addEventListener('click', App.map.startPlacingMarker);
        byId('btn-add-recuadro').addEventListener('click', App.map.startDrawingRecuadro);
        byId('btn-move-points').addEventListener('click', App.map.toggleMoveMode);
        byId('btn-editor-done').addEventListener('click', function () {
            App.map.setMoveMode(false);
            App.map.cancelDrawing();
            byId('editor-toolbar').classList.remove('show');
            App.state.editMode = false;
            App.ui.showToast('Edici\u00f3n finalizada');
        });

        /* ---- Old add-point modal submit ---- */
        byId('btn-ap-submit').addEventListener('click', App.ui.handleAddPoint);

        /* ---- Delete confirm ---- */
        byId('dc-confirm').addEventListener('click', App.ui.handleDeleteFair);
        byId('dc-cancel').addEventListener('click', App.ui.cancelDelete);
        byId('dc-password').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') App.ui.handleDeleteFair();
        });

        /* ---- Edit points close ---- */
        byId('ep-close').addEventListener('click', App.ui.closeEditPoints);

        /* ---- Point form ---- */
        byId('pf-cancel').addEventListener('click', function () {
            App.map.cancelDrawing();
            App.ui.hidePointForm();
        });
        byId('pf-submit').addEventListener('click', App.ui.submitPointForm);
        byId('pf-file').addEventListener('change', function () {
            var file = this.files[0];
            if (!file) return;
            App.api.uploadImage(file).then(function (res) {
                if (res.success) {
                    byId('pf-imagen').value = res.url;
                    var prev = byId('pf-preview');
                    prev.src = res.url;
                    prev.style.display = '';
                    App.ui.showToast('Imagen subida');
                } else {
                    App.ui.showToast(res.message || 'Error al subir');
                }
            }).catch(function () { App.ui.showToast('Error de conexi\u00f3n'); });
        });
        byId('pf-imagen').addEventListener('input', function () {
            var prev = byId('pf-preview');
            if (this.value) { prev.src = this.value; prev.style.display = ''; }
            else { prev.style.display = 'none'; prev.src = ''; }
        });

        /* ---- Modals overlay ---- */
        byId('modal-overlay').addEventListener('click', function (e) {
            if (e.target === e.currentTarget) App.ui.closeModals();
        });
        document.querySelectorAll('.modal-close').forEach(function (btn) {
            btn.addEventListener('click', App.ui.closeModals);
        });

        /* ---- Filter buttons ---- */
        document.querySelectorAll('#filter-bar button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                App.map.filtrar(btn.dataset.cat);
            });
        });

        /* ---- Accordion (delegated) ---- */
        document.addEventListener('click', function (e) {
            var header = e.target.closest('.accordion-header');
            if (header) {
                header.classList.toggle('open');
                var body = header.nextElementSibling;
                if (body) body.classList.toggle('open');
            }
            var star = e.target.closest('.star-selector span');
            if (star) {
                var container = star.closest('.star-selector');
                var val = parseInt(star.dataset.v);
                container.querySelectorAll('span').forEach(function (s) {
                    s.classList.toggle('active', parseInt(s.dataset.v) <= val);
                });
                container.dataset.selected = val;
            }
        });

        /* ---- Changelog panel ---- */
        (function () {
            var LATEST = '1.0';
            var panel = byId('changelog-panel');
            var dot   = byId('changelog-dot');

            function isSeen() { return localStorage.getItem('ofm_cl') === LATEST; }
            function markSeen() { localStorage.setItem('ofm_cl', LATEST); dot.classList.remove('visible'); }

            if (!isSeen()) dot.classList.add('visible');

            byId('btn-changelog').addEventListener('click', function (e) {
                e.stopPropagation();
                var open = panel.classList.toggle('open');
                if (open) markSeen();
            });

            byId('changelog-close').addEventListener('click', function () {
                panel.classList.remove('open');
            });

            document.addEventListener('click', function (e) {
                if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== byId('btn-changelog')) {
                    panel.classList.remove('open');
                }
            });

            if (!isSeen()) {
                setTimeout(function () {
                    panel.classList.add('open');
                    markSeen();
                }, 800);
            }
        })();

        /* ---- Toggle satellite/street view ---- */
        byId('btn-satellite').addEventListener('click', function () {
            var btn = this;
            var isSat = App.state.isSatellite;
            var mapObj = App.state.map;
            if (isSat) {
                mapObj.removeLayer(App.state.satLayer);
                mapObj.addLayer(App.state.streetLayer);
                btn.classList.remove('active');
                btn.textContent = '\uD83D\uDDF0\uFE0F';
                btn.title = 'Cambiar a sat\u00E9lite';
            } else {
                mapObj.removeLayer(App.state.streetLayer);
                mapObj.addLayer(App.state.satLayer);
                btn.classList.add('active');
                btn.textContent = '\uD83D\uDD32';
                btn.title = 'Cambiar a mapa';
            }
            App.state.isSatellite = !isSat;
        });

        /* ---- Subcategory visibility (all categories) ---- */
        byId('pf-categoria').addEventListener('change', function () {
            var cat = this.value;
            var wrap = byId('pf-subcategoria-wrap');
            var sub = byId('pf-subcategoria');
            if (!wrap || !sub) return;
            var subs = cat && App.consts.SUBCATEGORIES[cat];
            if (subs && subs.length) {
                App.ui.rebuildSubcategories(cat, sub);
                wrap.style.display = '';
                var hidden = byId('pf-emoji');
                var preview = byId('pf-emoji-preview');
                if (preview && hidden && !hidden.value) preview.textContent = App.consts.EMOJIS[sub.value] || '—';
            } else {
                wrap.style.display = 'none';
                sub.innerHTML = '';
            }
        });

        byId('pf-subcategoria').addEventListener('change', function () {
            var hidden = byId('pf-emoji');
            var preview = byId('pf-emoji-preview');
            if (preview && hidden && !hidden.value) preview.textContent = App.consts.EMOJIS[this.value] || '—';
        });

        byId('ap-categoria').addEventListener('change', function () {
            var cat = this.value;
            var wrap = byId('ap-subcategoria-wrap');
            var sub = byId('ap-subcategoria');
            if (!wrap || !sub) return;
            var subs = cat && App.consts.SUBCATEGORIES[cat];
            if (subs && subs.length) {
                App.ui.rebuildSubcategories(cat, sub);
                wrap.style.display = '';
                var hidden = byId('ap-emoji');
                var preview = byId('ap-emoji-preview');
                if (preview && hidden && !hidden.value) preview.textContent = App.consts.EMOJIS[sub.value] || '—';
            } else {
                wrap.style.display = 'none';
                sub.innerHTML = '';
            }
        });

        byId('ap-subcategoria').addEventListener('change', function () {
            var hidden = byId('ap-emoji');
            var preview = byId('ap-emoji-preview');
            if (preview && hidden && !hidden.value) preview.textContent = App.consts.EMOJIS[this.value] || '—';
        });

        /* ---- Emoji picker ---- */
        byId('pf-emoji-btn').addEventListener('click', function () {
            var hidden = byId('pf-emoji');
            App.ui.emojiPicker.show(this, hidden.value, function (emoji) {
                hidden.value = emoji;
                byId('pf-emoji-preview').textContent = emoji;
                byId('pf-emoji-clear').style.display = '';
            });
        });
        byId('pf-emoji-clear').addEventListener('click', function () {
            byId('pf-emoji').value = '';
            var sub = byId('pf-subcategoria');
            byId('pf-emoji-preview').textContent = (sub && sub.value ? App.consts.EMOJIS[sub.value] : '') || '—';
            this.style.display = 'none';
        });

        byId('ap-emoji-btn').addEventListener('click', function () {
            var hidden = byId('ap-emoji');
            App.ui.emojiPicker.show(this, hidden.value, function (emoji) {
                hidden.value = emoji;
                byId('ap-emoji-preview').textContent = emoji;
                byId('ap-emoji-clear').style.display = '';
            });
        });
        byId('ap-emoji-clear').addEventListener('click', function () {
            byId('ap-emoji').value = '';
            var sub = byId('ap-subcategoria');
            byId('ap-emoji-preview').textContent = (sub && sub.value ? App.consts.EMOJIS[sub.value] : '') || '—';
            this.style.display = 'none';
        });

        byId('emoji-popup-close').addEventListener('click', function () {
            App.ui.emojiPicker.hide();
        });

        /* ---- My location ---- */
        byId('btn-my-location').addEventListener('click', App.map.goToMyLocation);

        /* ---- Settings ---- */
        byId('btn-settings').addEventListener('click', App.ui.showSettings);
        byId('settings-form').addEventListener('submit', App.ui.handleUpdateProfile);
        byId('settings-server-save').addEventListener('click', function () {
            var url = (byId('settings-server-url').value || '').trim();
            var msg = byId('settings-server-msg');
            if (url) {
                localStorage.setItem('ofm_server', url.replace(/\/+$/, ''));
                msg.textContent = '✓ Guardado. Recargando...';
            } else {
                localStorage.removeItem('ofm_server');
                msg.textContent = '✓ Servidor predeterminado. Recargando...';
            }
            msg.style.color = 'var(--success)';
            setTimeout(function () { window.location.reload(); }, 1000);
        });

        /* ---- Create fair from empty state ---- */
        byId('btn-create-fair').addEventListener('click', App.ui.showCreateFair);

        /* ---- Switch between login/register ---- */
        document.querySelectorAll('.modal-switch a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                if (this.textContent === 'Reg\u00edstrate') App.ui.showRegister();
                else App.ui.showLogin();
            });
        });
    }

    function byId(id) { return document.getElementById(id); }

    document.addEventListener('DOMContentLoaded', init);
})();
