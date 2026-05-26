App.auth = {};

(function (a) {
    var SESSION_KEY = 'openferiamap_session';

    a.init = function () {
        var saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            try { App.state.user = JSON.parse(saved); } catch (_) {}
        }
    };

    a.isLoggedIn = function () { return !!App.state.user; };

    a.login = function (email, password, onSuccess, onError) {
        App.api.login(email, password).then(function (data) {
            if (data.success) {
                App.state.user = data.usuario;
                localStorage.setItem(SESSION_KEY, JSON.stringify(data.usuario));
                if (onSuccess) onSuccess(data.usuario);
            } else {
                if (onError) onError(data.message || 'Error al iniciar sesión');
            }
        }).catch(function () {
            if (onError) onError('Error de conexión con el servidor');
        });
    };

    a.register = function (nombre, email, password, onSuccess, onError) {
        App.api.register(nombre, email, password).then(function (data) {
            if (data.success) {
                if (onSuccess) onSuccess();
            } else {
                if (onError) onError(data.message || 'Error al registrar');
            }
        }).catch(function () {
            if (onError) onError('Error de conexión');
        });
    };

    a.logout = function () {
        App.api.logout().catch(function () {});
        App.state.user = null;
        localStorage.removeItem(SESSION_KEY);
        App.ui.updateHeader();
        App.map.clearAll();
        App.ui.loadFairs();
        App.ui.showToast('Sesión cerrada');
    };

    a.getUserId = function () { return App.state.user ? App.state.user.id_usuario : null; };
    a.getRole   = function () { return App.state.user ? App.state.user.rol          : null; };

    a.hasRole = function (roles) {
        var r = a.getRole();
        if (!r) return false;
        if (typeof roles === 'string') return r === roles;
        return roles.indexOf(r) !== -1;
    };

    a.isStaff = function () {
        return a.hasRole(['root', 'moderador', 'verificador']);
    };
})(App.auth);
