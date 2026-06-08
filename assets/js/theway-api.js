(function (window) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    const actionEndpoints = {
        "auth.passwordRecovery": "api/auth/password-reset/request",
        "auth.social": "auth-social",
        "draft.create": "draft-create",
        "entity.update": "entity-update",
        "entity.delete": "entity-delete",
        "file.upload": "api/cv",
        "file.export": "file-export",
        "integration.connect": "integration-connect",
        "integration.disconnect": "integration-disconnect",
        "integration.update": "integration-update",
        "opportunity.bookmark": "opportunity-bookmark",
        "billing.upgradeRequest": "api/billing/upgrade-request",
        "process.run": "process-run"
    };

    function endpointFor(action) {
        return actionEndpoints[String(action || "")] || "";
    }

    function resolveBaseURL() {
        return core.apiBase();
    }

    function clearAuthToken() {
        try {
            localStorage.removeItem("theway_token");
            localStorage.removeItem("theway_token_time");
        } catch (error) {}
        try {
            sessionStorage.removeItem("theway_token");
        } catch (error) {}
    }

    let sessionPromise = null;
    let csrfToken = "";

    function session() {
        if (!sessionPromise) {
            sessionPromise = fetch(resolveBaseURL() + "/api/auth/session", {
                credentials: "include"
            }).then(parseJSON).then(function (payload) {
                const data = payload.data || payload;
                csrfToken = data.csrfToken || payload.csrfToken || "";
                if (data.user) core.rememberSessionUser(normalizeUser(data.user));
                return data;
            }).catch(function (error) {
                sessionPromise = null;
                throw error;
            });
        }
        return sessionPromise;
    }

    function normalizeUser(user) {
        const safeUser = user || {};
        return {
            id: safeUser.id || safeUser.id_user || null,
            fullName: safeUser.fullName || [safeUser.prenom, safeUser.nom].filter(Boolean).join(" ") || safeUser.email || "",
            email: safeUser.email || "",
            phone: safeUser.telephone || "",
            location: safeUser.localisation || "",
            role: safeUser.role || "user"
        };
    }

    function authHeaders(json, csrf) {
        const headers = {};
        if (json) headers["Content-Type"] = "application/json";
        if (csrfToken && csrf) headers["X-CSRF-Token"] = csrfToken;
        return headers;
    }

    function responseError(response, data) {
        if (response.status === 401) {
            clearAuthToken();
            return new Error("Session expiree. Veuillez vous reconnecter.");
        }
        return new Error((data && (data.error || data.message)) || "Erreur API " + response.status);
    }

    function parseJSON(response) {
        return response.json().catch(function () {
            return {};
        }).then(function (data) {
            if (!response.ok || data.ok === false) throw responseError(response, data);
            return data;
        });
    }

    function parseBlob(response) {
        if (response.ok) {
            return response.blob().then(function (blob) {
                const disposition = response.headers.get("content-disposition") || "";
                const match = disposition.match(/filename="?([^"]+)"?/i);
                return {
                    ok: true,
                    blob: blob,
                    filename: match ? match[1] : "theway-export.csv"
                };
            });
        }
        return response.text().then(function (text) {
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (error) {
                data = { error: text };
            }
            throw responseError(response, data);
        });
    }

    function request(action, payload) {
        const endpoint = endpointFor(action);
        if (!endpoint) {
            return Promise.reject(new Error("Action API invalide."));
        }

        return session().catch(function () { return null; }).then(function () {
            return fetch(resolveBaseURL() + "/" + endpoint, {
            method: "POST",
            headers: authHeaders(true, true),
            credentials: "include",
            body: JSON.stringify(payload || {})
            }).then(parseJSON);
        });
    }

    function get(path) {
        const cleanPath = String(path || "").replace(/^\//, "");
        if (!cleanPath) {
            return Promise.reject(new Error("Route API invalide."));
        }
        return fetch(resolveBaseURL() + "/" + cleanPath, {
            method: "GET",
            headers: authHeaders(false, false),
            credentials: "include"
        }).then(parseJSON);
    }

    function upload(action, file, payload) {
        const endpoint = endpointFor(action);
        if (!endpoint || !file) {
            return Promise.reject(new Error("Upload API invalide."));
        }

        const body = new FormData();
        body.append("file", file);
        Object.keys(payload || {}).forEach(function (key) {
            body.append(key, payload[key]);
        });

        return session().catch(function () { return null; }).then(function () {
            return fetch(resolveBaseURL() + "/" + endpoint, {
            method: "POST",
            headers: authHeaders(false, true),
            credentials: "include",
            body: body
            }).then(parseJSON);
        });
    }

    function download(action, payload) {
        const endpoint = endpointFor(action);
        if (!endpoint) {
            return Promise.reject(new Error("Export API invalide."));
        }

        return session().catch(function () { return null; }).then(function () {
            return fetch(resolveBaseURL() + "/" + endpoint, {
            method: "POST",
            headers: authHeaders(true, true),
            credentials: "include",
            body: JSON.stringify(payload || {})
            }).then(parseBlob);
        });
    }

    app.api = {
        baseURL: resolveBaseURL,
        session: session,
        request: request,
        get: get,
        upload: upload,
        download: download
    };
})(window);
