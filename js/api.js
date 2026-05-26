App.api = {};

(function (a) {
    var DEFAULT_BASE = 'https://openferiamap.com/api/';
    function getBase() {
        return localStorage.getItem('ofm_server') || DEFAULT_BASE;
    }

    function handleResponse(r) {
        return r.json().catch(function () {
            return { success: false, message: 'Respuesta del servidor no válida (¿error PHP?)' };
        });
    }

    function networkError(url, err) {
        return { success: false, message: 'Red: ' + (err && err.message ? err.message : 'sin respuesta') + ' → ' + url };
    }

    function post(endpoint, data) {
        var url = getBase() + endpoint;
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        }).then(handleResponse).catch(function (err) {
            if (err && err.success === false) return err;
            return networkError(url, err);
        });
    }

    function get(endpoint, params) {
        var url = getBase() + endpoint;
        var keys = params ? Object.keys(params) : [];
        if (keys.length) {
            url += '?' + keys.map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
            }).join('&');
        }
        return fetch(url, { credentials: 'include' }).then(handleResponse).catch(function (err) {
            if (err && err.success === false) return err;
            return networkError(url, err);
        });
    }

    a.login = function (email, password) {
        return post('login.php', { email: email, password: password });
    };

    a.register = function (nombre, email, password) {
        return post('register.php', { nombre: nombre, email: email, password: password });
    };

    a.logout = function () {
        return post('logout.php', {});
    };

    a.getFairs = function () {
        return get('obtener_ferias.php', {});
    };

    a.createFair = function (data) {
        return post('crear_feria.php', data);
    };

    a.updateFair = function (id, estado) {
        return post('actualizar_feria.php', { id_feria: id, estado: estado });
    };

    a.updateFairFull = function (data) {
        return post('actualizar_feria.php', data);
    };

    a.publishFair = function (id_feria) {
        return post('publicar_feria.php', { id_feria: id_feria });
    };

    a.deleteFair = function (data) {
        return post('eliminar_feria.php', { id_feria: data.id_feria, password: data.password });
    };

    a.getPoints = function (idFeria) {
        return get('obtener_puntos.php', { id_feria: idFeria, _: Date.now() });
    };

    a.createPoint = function (data) {
        return post('crear_punto.php', data);
    };

    a.getResenas = function (idPunto) {
        return get('obtener_resenas.php', { id_punto: idPunto });
    };

    a.saveResena = function (idPunto, comentario, puntuacion) {
        return post('guardar_resena.php', { id_punto: idPunto, comentario: comentario, puntuacion: puntuacion });
    };

    a.adminGetUsers = function () {
        return post('admin/obtener_usuarios.php', {});
    };

    a.adminChangeRole = function (target_id, nuevo_rol) {
        return post('admin/cambiar_rol.php', { target_id: target_id, nuevo_rol: nuevo_rol });
    };

    a.adminVerifyFair = function (id_feria, accion, motivo) {
        return post('admin/verificar_feria.php', { id_feria: id_feria, accion: accion, motivo: motivo || null });
    };

    a.updateProfile = function (data) {
        return post('actualizar_perfil.php', data);
    };

    a.updatePoint = function (data) {
        return post('actualizar_punto.php', data);
    };

    a.uploadImage = function (file) {
        var fd = new FormData();
        fd.append('imagen', file);
        return fetch(getBase() +'subir_imagen.php', {
            method: 'POST',
            credentials: 'include',
            body: fd
        }).then(function (r) { return r.json(); });
    };

    a.deletePoint = function (id_punto) {
        return post('eliminar_punto.php', { id_punto: id_punto });
    };

    a.deleteResena = function (id_resena) {
        return post('eliminar_resena.php', { id_resena: id_resena });
    };
})(App.api);
